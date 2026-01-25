import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { useTheme } from '../context/ThemeContext';
import { api, Chat, User } from '../api';
import { RootStackParamList } from '../types';

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
    colors: any;
}

const ChatItem: React.FC<ChatItemProps> = ({ chat, currentUserId, onPress, colors }) => {
    const otherUser = chat.participants?.find((p) => p.id !== currentUserId);

    if (!otherUser && !chat.isGroup) return null;

    const displayName = chat.isGroup ? chat.groupName : otherUser?.name || 'Usuario';
    const displayAvatar = chat.isGroup ? chat.groupAvatar : otherUser?.avatar_url;
    const getLastMessageText = () => {
        const msg = chat.lastMessage;
        if (!msg) return '';

        // Prioridad al tipo explícito
        if (msg.type === 'audio') return '🎤 Nota de voz';
        if (msg.type === 'image') return '📷 Imagen';
        if (msg.type === 'file') return '📄 Archivo';

        // Fallback: detectar tipo por extensión en el texto
        const text = msg.text || '';
        if (text.match(/\.(m4a|mp3|wav|aac|ogg)$/i)) return '🎤 Nota de voz';
        if (text.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return '📷 Imagen';

        return text;
    };

    const lastMessageText = getLastMessageText();
    const hasUnread = chat.unreadCount > 0;
    const isOnline = otherUser?.status === 'online';

    return (
        <TouchableOpacity
            style={[
                styles.chatItem,
                { backgroundColor: colors.background, borderBottomColor: colors.divider },
                hasUnread && { backgroundColor: colors.surfaceLight }
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.avatarContainer}>
                {displayAvatar ? (
                    <Image source={{ uri: displayAvatar }} style={[styles.avatar, { borderColor: colors.border }]} />
                ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                        <Text style={[styles.avatarText, { color: colors.background }]}>
                            {(displayName || '?').charAt(0).toUpperCase()}
                        </Text>
                    </View>
                )}
                {isOnline && <View style={[styles.onlineIndicator, { backgroundColor: colors.online, borderColor: colors.background }]} />}
            </View>

            <View style={styles.chatContent}>
                <View style={styles.chatHeader}>
                    <Text style={[styles.chatName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {displayName}
                    </Text>
                    {chat.lastMessage && (
                        <Text style={[styles.chatTime, { color: colors.textMuted }, hasUnread && { color: colors.primary }]}>
                            {formatMessageTime(chat.lastMessage.timestamp)}
                        </Text>
                    )}
                </View>

                <View style={styles.chatMessageRow}>
                    <Text
                        style={[
                            styles.chatMessage,
                            { color: colors.textSecondary },
                            hasUnread && { color: colors.textPrimary, fontWeight: '500' }
                        ]}
                        numberOfLines={1}
                    >
                        {otherUser?.status === 'typing' ? (
                            <Text style={{ color: colors.primary, fontStyle: 'italic' }}>escribiendo...</Text>
                        ) : (
                            lastMessageText
                        )}
                    </Text>

                    {hasUnread && (
                        <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                            <Text style={[styles.unreadCount, { color: '#ffffff' }]}>
                                {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
};

// Tipos de pestañas para consultores
type ChatTab = 'usuarios' | 'asesores';

// Función para determinar el tipo de usuario basado en su RFC
const getUserTypeFromRfc = (rfc: string | undefined): 'usuario' | 'asesor' | 'consultor' => {
    if (!rfc) return 'usuario';
    if (rfc === 'ADMIN000CONS' || rfc.startsWith('CONS')) return 'consultor';
    if (rfc.startsWith('ADV')) return 'asesor';
    return 'usuario';
};

export const ChatsScreen: React.FC<ChatsScreenProps> = ({ navigation }) => {
    const { user } = useAuth();
    const { colors, gradients, isDark } = useTheme();
    const [chats, setChats] = useState<Chat[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<ChatTab>('usuarios');
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const isPollingRef = useRef(false);

    // Verificar si el usuario actual es consultor
    const isConsultor = user?.rfc === 'ADMIN000CONS' || user?.rfc?.startsWith('CONS');

    const loadChats = async (isInitialLoad = false) => {
        if (!user) return;

        // Evitar peticiones simultáneas durante polling
        if (isPollingRef.current && !isInitialLoad) return;

        isPollingRef.current = true;
        try {
            const result = await api.getChats();
            if (result.data?.chats) {
                setChats(prev => {
                    // Solo actualizar si hay cambios
                    const newChats = result.data!.chats;
                    if (JSON.stringify(prev) !== JSON.stringify(newChats)) {
                        return newChats;
                    }
                    return prev;
                });
            }
        } catch (error) {
            console.error('Error loading chats:', error);
        } finally {
            if (isInitialLoad) {
                setIsLoading(false);
            }
            setIsRefreshing(false);
            isPollingRef.current = false;
        }
    };

    // Cargar chats y configurar polling al entrar a la pantalla
    useFocusEffect(
        useCallback(() => {
            loadChats(true);

            // Configurar polling cada 5 segundos
            pollingRef.current = setInterval(() => {
                loadChats(false);
            }, 5000);

            // Limpiar intervalo al salir de la pantalla
            return () => {
                if (pollingRef.current) {
                    clearInterval(pollingRef.current);
                    pollingRef.current = null;
                }
            };
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

    // Filtrar chats por búsqueda y por pestaña activa (solo para consultores)
    const filteredChats = chats.filter((chat) => {
        const otherUser = chat.participants?.find((p) => p.id !== user?.id);
        const name = chat.isGroup ? chat.groupName : otherUser?.name;

        // Filtro de búsqueda
        const matchesSearch = name?.toLowerCase().includes(searchQuery.toLowerCase());

        // Si no es consultor, mostrar todos los chats
        if (!isConsultor) return matchesSearch;

        // Si es grupo, mostrar en ambas pestañas
        if (chat.isGroup) return matchesSearch;

        // Filtrar por tipo de usuario según la pestaña activa
        const otherUserType = getUserTypeFromRfc(otherUser?.rfc);
        if (activeTab === 'usuarios') {
            return matchesSearch && otherUserType === 'usuario';
        } else {
            return matchesSearch && otherUserType === 'asesor';
        }
    });

    const handleChatPress = (chat: Chat) => {
        const otherUser = chat.participants?.find((p) => p.id !== user?.id);
        if (!otherUser && !chat.isGroup) return;

        navigation.navigate('Chat', {
            chatId: chat.id,
            userName: chat.isGroup ? (chat.groupName || 'Grupo') : (otherUser?.name || 'Usuario'),
            userAvatar: chat.isGroup ? (chat.groupAvatar || '') : (otherUser?.avatar_url || ''),
            userRfc: chat.isGroup ? null : (otherUser?.rfc || null),
            participantId: otherUser?.id, // ID del otro usuario para llamadas
        });
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* Header */}
            <LinearGradient
                colors={[colors.backgroundSecondary, colors.background]}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <View>
                        <Text style={[styles.greeting, { color: colors.textMuted }]}>Hola, {user?.name?.split(' ')[0] || 'Usuario'} 👋</Text>
                        <Text style={[styles.title, { color: colors.textPrimary }]}>Mensajes</Text>
                    </View>
                    {isConsultor && (
                        <View style={styles.headerActions}>
                            <TouchableOpacity style={[styles.iconButton, { backgroundColor: colors.surface }]} onPress={toggleSearch}>
                                <Ionicons name="search" size={24} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Search Bar - Solo consultores */}
                {isConsultor && isSearching && (
                    <View style={styles.searchContainer}>
                        <View style={[styles.searchInputContainer, { backgroundColor: colors.surface }]}>
                            <Ionicons name="search" size={20} color={colors.textMuted} />
                            <TextInput
                                style={[styles.searchInput, { color: colors.textPrimary }]}
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

                {/* Pestañas - Solo para consultores */}
                {isConsultor && (
                    <View style={[styles.tabsContainer, { backgroundColor: colors.surface }]}>
                        <TouchableOpacity
                            style={[
                                styles.tab,
                                activeTab === 'usuarios' && [styles.tabActive, { backgroundColor: colors.primary }]
                            ]}
                            onPress={() => setActiveTab('usuarios')}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name="people"
                                size={16}
                                color={activeTab === 'usuarios' ? '#fff' : colors.textMuted}
                            />
                            <Text style={[
                                styles.tabText,
                                { color: activeTab === 'usuarios' ? '#fff' : colors.textMuted }
                            ]}>
                                Usuarios
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.tab,
                                activeTab === 'asesores' && [styles.tabActive, { backgroundColor: colors.primary }]
                            ]}
                            onPress={() => setActiveTab('asesores')}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name="briefcase"
                                size={16}
                                color={activeTab === 'asesores' ? '#fff' : colors.textMuted}
                            />
                            <Text style={[
                                styles.tabText,
                                { color: activeTab === 'asesores' ? '#fff' : colors.textMuted }
                            ]}>
                                Asesores
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </LinearGradient>

            {/* Chat List */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textMuted }]}>Cargando conversaciones...</Text>
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
                            colors={colors}
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
                            <Text style={[styles.emptyText, { color: colors.textPrimary }]}>No hay conversaciones</Text>
                            {!isConsultor && (
                                <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                                    Esperando conexión con el Consultor...
                                </Text>
                            )}
                            {isConsultor && (
                                <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                                    No hay {activeTab === 'usuarios' ? 'usuarios' : 'asesores'} con conversaciones
                                </Text>
                            )}
                        </View>
                    }
                />
            )}

            {/* FAB - Solo para Consultores */}
            {isConsultor && (
                <TouchableOpacity style={[styles.fab, { shadowColor: colors.primary }]}>
                    <LinearGradient
                        colors={gradients.primary as [string, string, ...string[]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={styles.fabGradient}
                    >
                        <Ionicons name="add" size={30} color={colors.background} />
                    </LinearGradient>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
        marginBottom: 4,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    iconButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchContainer: {
        marginTop: 16,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 44,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
    },
    tabsContainer: {
        flexDirection: 'row',
        marginTop: 16,
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        gap: 6,
    },
    tabActive: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
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
    },
    chatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 0.5,
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
    },
    avatarPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
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
        flex: 1,
        marginRight: 8,
    },
    chatTime: {
        fontSize: 12,
    },
    chatMessageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    chatMessage: {
        fontSize: 14,
        flex: 1,
    },
    unreadBadge: {
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
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
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
