import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    StatusBar,
    Image,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';
import { api, Chat, User } from '../api';
import { RootStackParamList } from '../types';
import colors, { gradients } from '../theme/colors';

type ChatsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

interface ChatsScreenProps {
    navigation: ChatsScreenNavigationProp;
}

const formatMessageTime = (dateString: string): string => {
    const date = parseISO(dateString);
    if (isToday(date)) {
        return format(date, 'HH:mm');
    }
    if (isYesterday(date)) {
        return 'Ayer';
    }
    return format(date, 'dd/MM/yy', { locale: es });
};

interface ChatItemProps {
    chat: Chat;
    currentUserId: string;
    onPress: () => void;
}

const ChatItem: React.FC<ChatItemProps> = ({ chat, currentUserId, onPress }) => {
    const otherUser = chat.participants?.find((p) => p.id !== currentUserId);

    if (!otherUser && !chat.isGroup) return null;

    const displayName = chat.isGroup ? chat.groupName : otherUser?.name || 'Usuario';
    const displayAvatar = chat.isGroup ? chat.groupAvatar : otherUser?.avatar_url;
    const lastMessageText = chat.lastMessage?.text || '';
    const hasUnread = chat.unreadCount > 0;
    const isOnline = otherUser?.status === 'online';

    return (
        <TouchableOpacity
            style={[styles.chatItem, hasUnread && styles.chatItemUnread]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.avatarContainer}>
                {displayAvatar ? (
                    <Image source={{ uri: displayAvatar }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <Text style={styles.avatarText}>
                            {(displayName || '?').charAt(0).toUpperCase()}
                        </Text>
                    </View>
                )}
                {isOnline && <View style={styles.onlineIndicator} />}
            </View>

            <View style={styles.chatContent}>
                <View style={styles.chatHeader}>
                    <Text style={styles.chatName} numberOfLines={1}>
                        {displayName}
                    </Text>
                    {chat.lastMessage && (
                        <Text style={[styles.chatTime, hasUnread && styles.chatTimeUnread]}>
                            {formatMessageTime(chat.lastMessage.timestamp)}
                        </Text>
                    )}
                </View>

                <View style={styles.chatMessageRow}>
                    <Text
                        style={[styles.chatMessage, hasUnread && styles.chatMessageUnread]}
                        numberOfLines={1}
                    >
                        {otherUser?.status === 'typing' ? (
                            <Text style={styles.typingText}>escribiendo...</Text>
                        ) : (
                            lastMessageText
                        )}
                    </Text>

                    {hasUnread && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadCount}>
                                {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
};

export const ChatsScreen: React.FC<ChatsScreenProps> = ({ navigation }) => {
    const { user } = useAuth();
    const [chats, setChats] = useState<Chat[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadChats = async () => {
        if (!user) return;

        try {
            const result = await api.getChats();
            if (result.data?.chats) {
                setChats(result.data.chats);
            }
        } catch (error) {
            console.error('Error loading chats:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    // Cargar chats al entrar a la pantalla
    useFocusEffect(
        useCallback(() => {
            loadChats();
        }, [user])
    );

    const handleRefresh = () => {
        setIsRefreshing(true);
        loadChats();
    };

    const toggleSearch = () => {
        setIsSearching(!isSearching);
        if (isSearching) {
            setSearchQuery('');
        }
    };

    const filteredChats = chats.filter((chat) => {
        const otherUser = chat.participants?.find((p) => p.id !== user?.id);
        const name = chat.isGroup ? chat.groupName : otherUser?.name;
        return name?.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const handleChatPress = (chat: Chat) => {
        const otherUser = chat.participants?.find((p) => p.id !== user?.id);
        if (!otherUser && !chat.isGroup) return;

        navigation.navigate('Chat', {
            chatId: chat.id,
            userName: chat.isGroup ? (chat.groupName || 'Grupo') : (otherUser?.name || 'Usuario'),
            userAvatar: chat.isGroup ? (chat.groupAvatar || '') : (otherUser?.avatar_url || ''),
        });
    };

    const isAdmin = user?.rfc === 'ADMIN000CONS';

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <LinearGradient
                colors={[colors.backgroundSecondary, colors.background]}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <View>
                        <Text style={styles.greeting}>Hola, {user?.name?.split(' ')[0] || 'Usuario'} 👋</Text>
                        <Text style={styles.title}>Mensajes</Text>
                    </View>
                    {isAdmin && (
                        <View style={styles.headerActions}>
                            <TouchableOpacity style={styles.iconButton} onPress={toggleSearch}>
                                <Ionicons name="search" size={24} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Search Bar - Solo admin */}
                {isAdmin && isSearching && (
                    <View style={styles.searchContainer}>
                        <View style={styles.searchInputContainer}>
                            <Ionicons name="search" size={20} color={colors.textMuted} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Buscar conversaciones..."
                                placeholderTextColor={colors.textMuted}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}
            </LinearGradient>

            {/* Chat List */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Cargando conversaciones...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredChats}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <ChatItem
                            chat={item}
                            currentUserId={user?.id || ''}
                            onPress={() => handleChatPress(item)}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            tintColor={colors.primary}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="chatbubbles-outline" size={64} color={colors.textMuted} />
                            <Text style={styles.emptyText}>No hay conversaciones</Text>
                            {!isAdmin && (
                                <Text style={styles.emptySubtext}>
                                    Esperando conexión con el Consultor...
                                </Text>
                            )}
                        </View>
                    }
                />
            )}

            {/* FAB - Solo para Admin */}
            {isAdmin && (
                <TouchableOpacity style={styles.fab}>
                    <LinearGradient
                        colors={gradients.primary as [string, string, ...string[]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.fabGradient}
                    >
                        <Ionicons name="add" size={30} color={colors.textPrimary} />
                    </LinearGradient>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingTop: 60,
        paddingBottom: 16,
        paddingHorizontal: 16,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    greeting: {
        fontSize: 14,
        color: colors.textMuted,
        marginBottom: 4,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    iconButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchContainer: {
        marginTop: 16,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 44,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: colors.textPrimary,
    },
    listContent: {
        flexGrow: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: colors.textMuted,
    },
    chatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: colors.background,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.divider,
    },
    chatItemUnread: {
        backgroundColor: colors.surfaceLight,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 14,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: colors.border,
    },
    avatarPlaceholder: {
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: colors.online,
        borderWidth: 2,
        borderColor: colors.background,
    },
    chatContent: {
        flex: 1,
        justifyContent: 'center',
    },
    chatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    chatName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
        flex: 1,
        marginRight: 8,
    },
    chatTime: {
        fontSize: 12,
        color: colors.textMuted,
    },
    chatTimeUnread: {
        color: colors.primary,
        fontWeight: '600',
    },
    chatMessageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    chatMessage: {
        fontSize: 14,
        color: colors.textSecondary,
        flex: 1,
    },
    chatMessageUnread: {
        color: colors.textPrimary,
        fontWeight: '500',
    },
    typingText: {
        color: colors.primary,
        fontStyle: 'italic',
    },
    unreadBadge: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
        marginLeft: 8,
    },
    unreadCount: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
        paddingHorizontal: 40,
    },
    emptyText: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.textPrimary,
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: colors.textMuted,
        textAlign: 'center',
        marginTop: 8,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    fabGradient: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default ChatsScreen;
