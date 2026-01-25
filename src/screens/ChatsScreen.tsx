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
    Modal,
    Animated,
    Pressable,
    ScrollView,
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

// Componente de avatar combinado para grupos
interface GroupAvatarProps {
    participants: User[];
    size: number;
    colors: any;
}

const GroupAvatar: React.FC<GroupAvatarProps> = ({ participants, size, colors }) => {
    // Mostrar hasta 4 participantes
    const displayParticipants = participants.slice(0, 4);
    const count = displayParticipants.length;

    if (count === 0) {
        return (
            <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="people" size={size * 0.5} color="#fff" />
            </View>
        );
    }

    const smallSize = size * 0.55;
    const offset = size * 0.45;

    if (count === 1) {
        const p = displayParticipants[0];
        return p.avatar_url ? (
            <Image source={{ uri: p.avatar_url }} style={{ width: size, height: size, borderRadius: size / 2 }} />
        ) : (
            <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: '#fff', fontSize: size * 0.4, fontWeight: 'bold' }}>
                    {(p.name || '?').charAt(0).toUpperCase()}
                </Text>
            </View>
        );
    }

    // 2, 3 o 4 participantes - mostrar en grid
    return (
        <View style={{ width: size, height: size, position: 'relative' }}>
            {displayParticipants.map((p, index) => {
                const positions = count === 2
                    ? [{ top: 0, left: 0 }, { bottom: 0, right: 0 }]
                    : count === 3
                    ? [{ top: 0, left: size * 0.15 }, { bottom: 0, left: 0 }, { bottom: 0, right: 0 }]
                    : [{ top: 0, left: 0 }, { top: 0, right: 0 }, { bottom: 0, left: 0 }, { bottom: 0, right: 0 }];

                const pos = positions[index];

                return (
                    <View
                        key={p.id}
                        style={[
                            {
                                position: 'absolute',
                                ...pos,
                                width: smallSize,
                                height: smallSize,
                                borderRadius: smallSize / 2,
                                borderWidth: 2,
                                borderColor: colors.background,
                                overflow: 'hidden',
                            }
                        ]}
                    >
                        {p.avatar_url ? (
                            <Image source={{ uri: p.avatar_url }} style={{ width: '100%', height: '100%' }} />
                        ) : (
                            <View style={{ width: '100%', height: '100%', backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }}>
                                <Text style={{ color: '#fff', fontSize: smallSize * 0.4, fontWeight: 'bold' }}>
                                    {(p.name || '?').charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                    </View>
                );
            })}
        </View>
    );
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
    const displayAvatar = chat.isGroup ? null : otherUser?.avatar_url; // Para grupos usamos GroupAvatar
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

    // Para grupos, obtener participantes sin el usuario actual
    const groupParticipants = chat.isGroup ? chat.participants?.filter(p => p.id !== currentUserId) || [] : [];

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
                {chat.isGroup ? (
                    <GroupAvatar participants={groupParticipants} size={56} colors={colors} />
                ) : displayAvatar ? (
                    <Image source={{ uri: displayAvatar }} style={[styles.avatar, { borderColor: colors.border }]} />
                ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                        <Text style={[styles.avatarText, { color: colors.background }]}>
                            {(displayName || '?').charAt(0).toUpperCase()}
                        </Text>
                    </View>
                )}
                {!chat.isGroup && isOnline && <View style={[styles.onlineIndicator, { backgroundColor: colors.online, borderColor: colors.background }]} />}
            </View>

            <View style={styles.chatContent}>
                <View style={styles.chatHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        {chat.isGroup && (
                            <Ionicons name="people" size={14} color={colors.textMuted} style={{ marginRight: 4 }} />
                        )}
                        <Text style={[styles.chatName, { color: colors.textPrimary }]} numberOfLines={1}>
                            {displayName}
                        </Text>
                    </View>
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
type ChatTab = 'usuarios' | 'asesores' | 'consultores' | 'grupos';

// Función para determinar el tipo de usuario
// Prioriza el campo 'role' si está disponible, si no, infiere del RFC
const getUserType = (user: User | undefined): 'usuario' | 'asesor' | 'consultor' => {
    if (!user) return 'usuario';

    // Usar el rol del usuario si está disponible
    if (user.role) {
        return user.role as 'usuario' | 'asesor' | 'consultor';
    }

    // Fallback: inferir del RFC
    const rfc = user.rfc;
    if (!rfc) return 'usuario';
    if (rfc === 'ADMIN000CONS' || rfc.startsWith('CONS')) return 'consultor';
    if (rfc.startsWith('ADV')) return 'asesor';
    return 'usuario';
};

// Tipo unificado para mostrar en la lista (chat existente o usuario sin chat)
interface ListItem {
    type: 'chat' | 'user';
    id: string;
    chat?: Chat;
    user?: User;
}

export const ChatsScreen: React.FC<ChatsScreenProps> = ({ navigation }) => {
    const { user } = useAuth();
    const { colors, gradients, isDark } = useTheme();
    const [chats, setChats] = useState<Chat[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<ChatTab>('usuarios');
    const [isCreatingChat, setIsCreatingChat] = useState(false);
    const [showFabMenu, setShowFabMenu] = useState(false);
    const fabMenuAnim = useRef(new Animated.Value(0)).current;
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
            // Asegurar que el rol está configurado en el API client
            if (isConsultor) {
                api.setUserRole('consultor');
            }

            // Cargar chats
            const result = await api.getChats();
            if (result.data?.chats) {
                setChats(prev => {
                    const newChats = result.data!.chats;
                    if (JSON.stringify(prev) !== JSON.stringify(newChats)) {
                        return newChats;
                    }
                    return prev;
                });
            }

            // Si es consultor, también cargar todos los usuarios
            if (isConsultor && isInitialLoad) {
                const usersResult = await api.getUsers();
                console.log('📋 Usuarios cargados:', usersResult.data?.users?.length || 0);
                if (usersResult.data?.users) {
                    setAllUsers(usersResult.data.users);
                }
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

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadChats(true); // Recargar todo incluyendo usuarios
    };

    const toggleSearch = () => {
        setIsSearching(!isSearching);
        if (isSearching) {
            setSearchQuery('');
        }
    };

    // Obtener IDs de usuarios que ya tienen chat
    const usersWithChat = new Set<string>();
    chats.forEach(chat => {
        if (!chat.isGroup) {
            chat.participants?.forEach(p => {
                if (p.id !== user?.id) {
                    usersWithChat.add(p.id);
                }
            });
        }
    });

    // Crear lista combinada para consultores: chats + usuarios sin chat
    const getCombinedList = (): ListItem[] => {
        if (!isConsultor) {
            // Para usuarios normales, solo mostrar chats
            return chats
                .filter(chat => {
                    const otherUser = chat.participants?.find(p => p.id !== user?.id);
                    const name = chat.isGroup ? chat.groupName : otherUser?.name;
                    return name?.toLowerCase().includes(searchQuery.toLowerCase());
                })
                .map(chat => ({ type: 'chat' as const, id: chat.id, chat }));
        }

        // Para consultores: manejar pestañas
        const items: ListItem[] = [];

        // Pestaña de grupos - solo mostrar chats grupales
        if (activeTab === 'grupos') {
            chats.forEach(chat => {
                if (!chat.isGroup) return;
                const matchesSearch = chat.groupName?.toLowerCase().includes(searchQuery.toLowerCase());
                if (!matchesSearch) return;
                items.push({ type: 'chat', id: chat.id, chat });
            });

            return items.sort((a, b) => {
                const aTime = a.chat?.lastMessage?.timestamp || a.chat?.createdAt || '';
                const bTime = b.chat?.lastMessage?.timestamp || b.chat?.createdAt || '';
                return bTime.localeCompare(aTime);
            });
        }

        // Determinar el rol objetivo según la pestaña
        const targetRole = activeTab === 'usuarios' ? 'usuario' : activeTab === 'asesores' ? 'asesor' : 'consultor';

        // Agregar chats existentes que coinciden con el tab
        chats.forEach(chat => {
            if (chat.isGroup) return; // Grupos solo en pestaña de grupos

            const otherUser = chat.participants?.find(p => p.id !== user?.id);
            const name = otherUser?.name;
            const matchesSearch = name?.toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) return;

            // Filtrar por tipo de usuario
            const otherUserType = getUserType(otherUser);
            if (otherUserType === targetRole) {
                items.push({ type: 'chat', id: chat.id, chat });
            }
        });

        // Agregar usuarios sin chat
        allUsers.forEach(u => {
            if (u.id === user?.id) return; // Excluir al usuario actual
            if (usersWithChat.has(u.id)) return; // Ya tiene chat

            const userType = getUserType(u);
            if (userType !== targetRole) return; // No coincide con el tab

            const matchesSearch = u.name?.toLowerCase().includes(searchQuery.toLowerCase());
            if (!matchesSearch) return;

            items.push({ type: 'user', id: u.id, user: u });
        });

        // Ordenar: chats con mensajes primero, luego usuarios sin chat
        return items.sort((a, b) => {
            // Chats con mensajes recientes primero
            if (a.type === 'chat' && b.type === 'chat') {
                const aTime = a.chat?.lastMessage?.timestamp || a.chat?.createdAt || '';
                const bTime = b.chat?.lastMessage?.timestamp || b.chat?.createdAt || '';
                return bTime.localeCompare(aTime);
            }
            // Chats antes que usuarios sin chat
            if (a.type === 'chat') return -1;
            if (b.type === 'chat') return 1;
            // Usuarios ordenados por nombre
            return (a.user?.name || '').localeCompare(b.user?.name || '');
        });
    };

    const combinedList = getCombinedList();

    const handleChatPress = (chat: Chat) => {
        const otherUser = chat.participants?.find((p) => p.id !== user?.id);
        if (!otherUser && !chat.isGroup) return;

        navigation.navigate('Chat', {
            chatId: chat.id,
            userName: chat.isGroup ? (chat.groupName || 'Grupo') : (otherUser?.name || 'Usuario'),
            userAvatar: chat.isGroup ? (chat.groupAvatar || '') : (otherUser?.avatar_url || ''),
            userRfc: chat.isGroup ? null : (otherUser?.rfc || null),
            participantId: otherUser?.id,
        });
    };

    // Crear chat con usuario que no tiene chat existente
    const handleUserPress = async (targetUser: User) => {
        if (isCreatingChat) return;

        setIsCreatingChat(true);
        try {
            const result = await api.createChat(targetUser.id);
            if (result.data?.chat) {
                navigation.navigate('Chat', {
                    chatId: result.data.chat.id,
                    userName: targetUser.name || 'Usuario',
                    userAvatar: targetUser.avatar_url || '',
                    userRfc: targetUser.rfc || null,
                    participantId: targetUser.id,
                });
            }
        } catch (error) {
            console.error('Error creating chat:', error);
        } finally {
            setIsCreatingChat(false);
        }
    };

    // Funciones para el menú FAB
    const openFabMenu = () => {
        setShowFabMenu(true);
        Animated.spring(fabMenuAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
        }).start();
    };

    const closeFabMenu = () => {
        Animated.timing(fabMenuAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => setShowFabMenu(false));
    };

    const handleCreateGroup = () => {
        closeFabMenu();
        // Navegar a pantalla de crear grupo
        navigation.navigate('CreateGroup' as any);
    };

    // Componente para mostrar usuario sin chat
    const renderUserItem = (targetUser: User) => {
        const displayName = targetUser.name || 'Usuario';
        const isOnline = targetUser.status === 'online';

        return (
            <TouchableOpacity
                style={[styles.chatItem, { backgroundColor: colors.background, borderBottomColor: colors.divider }]}
                onPress={() => handleUserPress(targetUser)}
                activeOpacity={0.7}
                disabled={isCreatingChat}
            >
                <View style={styles.avatarContainer}>
                    {targetUser.avatar_url ? (
                        <Image source={{ uri: targetUser.avatar_url }} style={[styles.avatar, { borderColor: colors.border }]} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                            <Text style={[styles.avatarText, { color: colors.background }]}>
                                {displayName.charAt(0).toUpperCase()}
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
                    </View>
                    <View style={styles.chatMessageRow}>
                        <Text style={[styles.chatMessage, { color: colors.textMuted, fontStyle: 'italic' }]} numberOfLines={1}>
                            Toca para iniciar conversación
                        </Text>
                        <View style={[styles.newChatBadge, { backgroundColor: colors.surface }]}>
                            <Ionicons name="chatbubble-outline" size={14} color={colors.textMuted} />
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    // Render item de la lista combinada
    const renderListItem = ({ item }: { item: ListItem }) => {
        if (item.type === 'chat' && item.chat) {
            return (
                <ChatItem
                    chat={item.chat}
                    currentUserId={user?.id || ''}
                    onPress={() => handleChatPress(item.chat!)}
                    colors={colors}
                />
            );
        }
        if (item.type === 'user' && item.user) {
            return renderUserItem(item.user);
        }
        return null;
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
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.tabsScrollView}
                        contentContainerStyle={styles.tabsScrollContent}
                    >
                        <TouchableOpacity
                            style={[
                                styles.tabPill,
                                activeTab === 'usuarios'
                                    ? { backgroundColor: colors.primary }
                                    : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }
                            ]}
                            onPress={() => setActiveTab('usuarios')}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                styles.tabPillText,
                                { color: activeTab === 'usuarios' ? '#fff' : colors.textSecondary }
                            ]}>
                                Usuarios
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.tabPill,
                                activeTab === 'asesores'
                                    ? { backgroundColor: colors.primary }
                                    : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }
                            ]}
                            onPress={() => setActiveTab('asesores')}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                styles.tabPillText,
                                { color: activeTab === 'asesores' ? '#fff' : colors.textSecondary }
                            ]}>
                                Asesores
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.tabPill,
                                activeTab === 'consultores'
                                    ? { backgroundColor: colors.primary }
                                    : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }
                            ]}
                            onPress={() => setActiveTab('consultores')}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                styles.tabPillText,
                                { color: activeTab === 'consultores' ? '#fff' : colors.textSecondary }
                            ]}>
                                Consultores
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.tabPill,
                                activeTab === 'grupos'
                                    ? { backgroundColor: colors.primary }
                                    : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }
                            ]}
                            onPress={() => setActiveTab('grupos')}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                styles.tabPillText,
                                { color: activeTab === 'grupos' ? '#fff' : colors.textSecondary }
                            ]}>
                                Grupos
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
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
                    data={combinedList}
                    keyExtractor={(item) => `${item.type}-${item.id}`}
                    renderItem={renderListItem}
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
                            <Text style={[styles.emptyText, { color: colors.textPrimary }]}>
                                {isConsultor
                                    ? activeTab === 'grupos'
                                        ? 'No hay grupos'
                                        : `No hay ${activeTab} registrados`
                                    : 'No hay conversaciones'
                                }
                            </Text>
                            {!isConsultor && (
                                <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                                    Esperando conexión con el Consultor...
                                </Text>
                            )}
                        </View>
                    }
                />
            )}

            {/* FAB - Solo para Consultores */}
            {isConsultor && (
                <TouchableOpacity
                    style={[styles.fab, { shadowColor: colors.primary }]}
                    onPress={openFabMenu}
                    activeOpacity={0.8}
                >
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

            {/* FAB Menu Modal */}
            <Modal
                visible={showFabMenu}
                transparent
                animationType="none"
                onRequestClose={closeFabMenu}
            >
                <Pressable style={styles.fabMenuOverlay} onPress={closeFabMenu}>
                    <Animated.View
                        style={[
                            styles.fabMenuContainer,
                            {
                                backgroundColor: colors.surface,
                                transform: [
                                    {
                                        scale: fabMenuAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.8, 1],
                                        }),
                                    },
                                ],
                                opacity: fabMenuAnim,
                            },
                        ]}
                    >
                        <TouchableOpacity
                            style={styles.fabMenuItem}
                            onPress={handleCreateGroup}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.fabMenuIconContainer, { backgroundColor: colors.primary }]}>
                                <Ionicons name="people" size={22} color="#fff" />
                            </View>
                            <Text style={[styles.fabMenuText, { color: colors.textPrimary }]}>
                                Crear grupo
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                </Pressable>
            </Modal>
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
    tabsScrollView: {
        marginTop: 16,
    },
    tabsScrollContent: {
        paddingRight: 16,
        gap: 10,
    },
    tabPill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 18,
    },
    tabPillText: {
        fontSize: 13,
        fontWeight: '500',
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
    newChatBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
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
    fabMenuOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        paddingBottom: 100,
        paddingRight: 24,
    },
    fabMenuContainer: {
        borderRadius: 16,
        paddingVertical: 8,
        minWidth: 180,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    fabMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 12,
    },
    fabMenuIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fabMenuText: {
        fontSize: 16,
        fontWeight: '500',
    },
});

export default ChatsScreen;
