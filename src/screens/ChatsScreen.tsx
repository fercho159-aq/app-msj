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
import { api, Chat, User, ChatLabel, UnclaimedUserInfo } from '../api';
import { RootStackParamList } from '../types';
import { RfcSearchModal } from '../components/dashboard/RfcSearchModal';

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
    onLongPress?: () => void;
    colors: any;
}

const ChatItem: React.FC<ChatItemProps> = ({ chat, currentUserId, onPress, onLongPress, colors }) => {
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
            onLongPress={onLongPress}
            delayLongPress={500}
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

                {/* Etiquetas del chat */}
                {chat.labels && chat.labels.length > 0 && (
                    <View style={styles.labelsRow}>
                        {chat.labels.slice(0, 3).map((label) => (
                            <View
                                key={label.id}
                                style={[styles.labelPill, { backgroundColor: label.color + '20' }]}
                            >
                                <Ionicons name={label.icon as any} size={10} color={label.color} />
                                <Text style={[styles.labelText, { color: label.color }]}>
                                    {label.name}
                                </Text>
                            </View>
                        ))}
                        {chat.labels.length > 3 && (
                            <Text style={[styles.moreLabels, { color: colors.textMuted }]}>
                                +{chat.labels.length - 3}
                            </Text>
                        )}
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
};

// Tipos de pestañas para consultores
type ChatTab = 'nuevos' | 'usuarios' | 'asesores' | 'consultores' | 'grupos';

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
    type: 'chat' | 'user' | 'unclaimed';
    id: string;
    chat?: Chat;
    user?: User;
    unclaimedUser?: UnclaimedUserInfo;
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
    const [unclaimedUsers, setUnclaimedUsers] = useState<UnclaimedUserInfo[]>([]);
    const [isClaimingChat, setIsClaimingChat] = useState<string | null>(null);
    const [showFabMenu, setShowFabMenu] = useState(false);
    const [showLabelsModal, setShowLabelsModal] = useState(false);
    const [selectedChatForLabels, setSelectedChatForLabels] = useState<Chat | null>(null);
    const [availableLabels, setAvailableLabels] = useState<ChatLabel[]>([]);
    const [showNewLabelForm, setShowNewLabelForm] = useState(false);
    const [newLabelName, setNewLabelName] = useState('');
    const [newLabelColor, setNewLabelColor] = useState('#6B7AED');
    const [rfcSearchVisible, setRfcSearchVisible] = useState(false);
    const [isCreatingLabel, setIsCreatingLabel] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [filterLabels, setFilterLabels] = useState<string[]>([]);
    const fabMenuAnim = useRef(new Animated.Value(0)).current;
    const labelsModalAnim = useRef(new Animated.Value(0)).current;
    const filterModalAnim = useRef(new Animated.Value(0)).current;
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

            // Si es consultor, también cargar todos los usuarios y sin reclamar
            if (isConsultor && isInitialLoad) {
                const [usersResult, unclaimedResult] = await Promise.all([
                    api.getUsers(),
                    api.getUnclaimedUsers(),
                ]);
                console.log('📋 Usuarios cargados:', usersResult.data?.users?.length || 0);
                if (usersResult.data?.users) {
                    setAllUsers(usersResult.data.users);
                }
                if (unclaimedResult.data?.users) {
                    setUnclaimedUsers(unclaimedResult.data.users);
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
        // Función para verificar si un chat pasa el filtro de etiquetas
        const passesLabelFilter = (chat: Chat): boolean => {
            if (filterLabels.length === 0) return true;
            const chatLabelIds = chat.labels?.map(l => l.id) || [];
            return filterLabels.some(labelId => chatLabelIds.includes(labelId));
        };

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

        // Pestaña de nuevos - usuarios sin reclamar
        if (activeTab === 'nuevos') {
            unclaimedUsers.forEach(u => {
                const matchesSearch = u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    u.rfc?.toLowerCase().includes(searchQuery.toLowerCase());
                if (!matchesSearch) return;
                items.push({ type: 'unclaimed', id: u.chat_id, unclaimedUser: u });
            });
            return items;
        }

        // Pestaña de grupos - solo mostrar chats grupales
        if (activeTab === 'grupos') {
            chats.forEach(chat => {
                if (!chat.isGroup) return;
                if (!passesLabelFilter(chat)) return;
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

        // IDs de usuarios sin reclamar (para excluirlos del tab "usuarios")
        const unclaimedUserIds = new Set(unclaimedUsers.map(u => u.user_id));

        // Agregar chats existentes que coinciden con el tab
        chats.forEach(chat => {
            if (chat.isGroup) return; // Grupos solo en pestaña de grupos
            if (!passesLabelFilter(chat)) return; // Aplicar filtro de etiquetas

            const otherUser = chat.participants?.find(p => p.id !== user?.id);
            const name = otherUser?.name;
            const matchesSearch = name?.toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) return;

            // Filtrar por tipo de usuario
            const otherUserType = getUserType(otherUser);
            if (otherUserType === targetRole) {
                // En tab "usuarios", excluir los que están sin reclamar
                if (activeTab === 'usuarios' && otherUser && unclaimedUserIds.has(otherUser.id)) return;
                items.push({ type: 'chat', id: chat.id, chat });
            }
        });

        // Agregar usuarios sin chat (no aplica para tab "usuarios" ya que sin reclamar van en "nuevos")
        allUsers.forEach(u => {
            if (u.id === user?.id) return; // Excluir al usuario actual
            if (usersWithChat.has(u.id)) return; // Ya tiene chat
            if (activeTab === 'usuarios' && unclaimedUserIds.has(u.id)) return; // Sin reclamar van en "nuevos"

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

    // Reclamar un usuario sin reclamar
    const handleClaimUser = async (chatId: string) => {
        if (isClaimingChat) return;
        setIsClaimingChat(chatId);
        try {
            const result = await api.claimUser(chatId);
            if (result.data?.success) {
                // Remover de la lista de sin reclamar
                setUnclaimedUsers(prev => prev.filter(u => u.chat_id !== chatId));
                // Recargar chats para que aparezca en la lista normal
                await loadChats(true);
            } else if (result.error) {
                console.error('Error al reclamar:', result.error);
            }
        } catch (error) {
            console.error('Error claiming user:', error);
        } finally {
            setIsClaimingChat(null);
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

    // Funciones para el menú de etiquetas
    const loadAvailableLabels = async () => {
        try {
            const result = await api.getLabels();
            if (result.data?.labels) {
                setAvailableLabels(result.data.labels);
            }
        } catch (error) {
            console.error('Error loading labels:', error);
        }
    };

    const openLabelsModal = (chat: Chat) => {
        setSelectedChatForLabels(chat);
        loadAvailableLabels();
        setShowLabelsModal(true);
        Animated.spring(labelsModalAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
        }).start();
    };

    const closeLabelsModal = () => {
        Animated.timing(labelsModalAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            setShowLabelsModal(false);
            setSelectedChatForLabels(null);
        });
    };

    const handleToggleLabel = async (label: ChatLabel) => {
        if (!selectedChatForLabels) return;

        const chatLabels = selectedChatForLabels.labels || [];
        const hasLabel = chatLabels.some(l => l.id === label.id);

        try {
            let result;
            if (hasLabel) {
                result = await api.removeLabel(selectedChatForLabels.id, label.id);
                console.log('📝 Removiendo etiqueta:', label.name, 'del chat:', selectedChatForLabels.id, 'Resultado:', result);
            } else {
                result = await api.assignLabel(selectedChatForLabels.id, label.id);
                console.log('📝 Asignando etiqueta:', label.name, 'al chat:', selectedChatForLabels.id, 'Resultado:', result);
            }

            // Verificar si la operación fue exitosa
            if (result.error) {
                console.error('❌ Error al modificar etiqueta:', result.error);
                return;
            }

            // Solo actualizar el UI si la operación fue exitosa
            // Actualizar el chat localmente
            setChats(prevChats => prevChats.map(chat => {
                if (chat.id === selectedChatForLabels.id) {
                    const currentLabels = chat.labels || [];
                    if (hasLabel) {
                        return { ...chat, labels: currentLabels.filter(l => l.id !== label.id) };
                    } else {
                        return { ...chat, labels: [...currentLabels, label] };
                    }
                }
                return chat;
            }));

            // Actualizar el chat seleccionado
            setSelectedChatForLabels(prev => {
                if (!prev) return null;
                const currentLabels = prev.labels || [];
                if (hasLabel) {
                    return { ...prev, labels: currentLabels.filter(l => l.id !== label.id) };
                } else {
                    return { ...prev, labels: [...currentLabels, label] };
                }
            });
        } catch (error) {
            console.error('❌ Error toggling label:', error);
        }
    };

    // Colores disponibles para etiquetas personalizadas
    const labelColors = [
        '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
        '#EC4899', '#6366F1', '#14B8A6', '#F97316', '#84CC16',
    ];

    const handleCreateLabel = async () => {
        if (!newLabelName.trim() || isCreatingLabel) return;

        setIsCreatingLabel(true);
        try {
            console.log('📝 Creando etiqueta:', newLabelName.trim(), 'color:', newLabelColor);
            const result = await api.createLabel(newLabelName.trim(), newLabelColor);
            console.log('📝 Resultado crear etiqueta:', result);

            if (result.error) {
                console.error('❌ Error al crear etiqueta:', result.error);
                return;
            }

            if (result.data?.label) {
                console.log('✅ Etiqueta creada exitosamente:', result.data.label);
                setAvailableLabels(prev => [...prev, result.data!.label]);
                setNewLabelName('');
                setNewLabelColor('#6B7AED');
                setShowNewLabelForm(false);
            }
        } catch (error) {
            console.error('❌ Error creating label:', error);
        } finally {
            setIsCreatingLabel(false);
        }
    };

    // Funciones para filtro de etiquetas
    const openFilterModal = () => {
        loadAvailableLabels();
        setShowFilterModal(true);
        Animated.spring(filterModalAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
        }).start();
    };

    const closeFilterModal = () => {
        Animated.timing(filterModalAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            setShowFilterModal(false);
        });
    };

    const toggleFilterLabel = (labelId: string) => {
        setFilterLabels(prev =>
            prev.includes(labelId)
                ? prev.filter(id => id !== labelId)
                : [...prev, labelId]
        );
    };

    const clearFilters = () => {
        setFilterLabels([]);
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

    // Componente para mostrar usuario sin reclamar
    const renderUnclaimedItem = (unclaimedUser: UnclaimedUserInfo) => {
        const displayName = unclaimedUser.name || 'Usuario';
        const isClaiming = isClaimingChat === unclaimedUser.chat_id;

        return (
            <View
                style={[styles.chatItem, { backgroundColor: colors.background, borderBottomColor: colors.divider }]}
            >
                <View style={styles.avatarContainer}>
                    {unclaimedUser.avatar_url ? (
                        <Image source={{ uri: unclaimedUser.avatar_url }} style={[styles.avatar, { borderColor: colors.border }]} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: '#F59E0B' }]}>
                            <Text style={[styles.avatarText, { color: '#fff' }]}>
                                {displayName.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}
                </View>

                <View style={[styles.chatContent, { flex: 1 }]}>
                    <View style={styles.chatHeader}>
                        <Text style={[styles.chatName, { color: colors.textPrimary }]} numberOfLines={1}>
                            {displayName}
                        </Text>
                        <Text style={[styles.chatTime, { color: colors.textMuted, fontSize: 11 }]}>
                            {unclaimedUser.registered_at ? formatMessageTime(unclaimedUser.registered_at) : ''}
                        </Text>
                    </View>
                    <View style={styles.chatMessageRow}>
                        <Text style={[styles.chatMessage, { color: colors.textMuted }]} numberOfLines={1}>
                            {unclaimedUser.last_message || 'Sin mensajes'}
                        </Text>
                    </View>
                    {unclaimedUser.phone && (
                        <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                            {unclaimedUser.phone}
                        </Text>
                    )}
                </View>

                <TouchableOpacity
                    style={[
                        styles.claimButton,
                        { backgroundColor: '#F59E0B' },
                        isClaiming && { opacity: 0.6 }
                    ]}
                    onPress={() => handleClaimUser(unclaimedUser.chat_id)}
                    disabled={!!isClaimingChat}
                    activeOpacity={0.7}
                >
                    {isClaiming ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.claimButtonText}>Reclamar</Text>
                    )}
                </TouchableOpacity>
            </View>
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
                    onLongPress={isConsultor ? () => openLabelsModal(item.chat!) : undefined}
                    colors={colors}
                />
            );
        }
        if (item.type === 'user' && item.user) {
            return renderUserItem(item.user);
        }
        if (item.type === 'unclaimed' && item.unclaimedUser) {
            return renderUnclaimedItem(item.unclaimedUser);
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
                            <TouchableOpacity
                                style={[
                                    styles.iconButton,
                                    { backgroundColor: colors.surface },
                                    filterLabels.length > 0 && { backgroundColor: colors.primary }
                                ]}
                                onPress={openFilterModal}
                            >
                                <Ionicons
                                    name="filter"
                                    size={22}
                                    color={filterLabels.length > 0 ? '#fff' : colors.textPrimary}
                                />
                                {filterLabels.length > 0 && (
                                    <View style={styles.filterBadge}>
                                        <Text style={styles.filterBadgeText}>{filterLabels.length}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.iconButton, { backgroundColor: colors.surface }]} onPress={toggleSearch}>
                                <Ionicons name="search" size={24} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Search Bar - Solo consultores */}
                {isConsultor && isSearching && (
                    <View style={styles.searchContainer}>
                        <View style={styles.searchRow}>
                            <View style={[styles.searchInputContainer, { backgroundColor: colors.surface, flex: 1 }]}>
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
                            <TouchableOpacity
                                onPress={() => setRfcSearchVisible(true)}
                                activeOpacity={0.7}
                            >
                                <LinearGradient
                                    colors={['#5C76B2', '#7A93C8'] as [string, string]}
                                    style={styles.rfcSearchBtnGradient}
                                >
                                    <Ionicons name="search" size={14} color="#FFFFFF" />
                                    <Text style={styles.rfcSearchBtnText}>Buscar RFC</Text>
                                </LinearGradient>
                            </TouchableOpacity>
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
                        {unclaimedUsers.length > 0 && (
                            <TouchableOpacity
                                style={[
                                    styles.tabPill,
                                    activeTab === 'nuevos'
                                        ? { backgroundColor: '#F59E0B' }
                                        : { backgroundColor: '#FEF3C7', borderColor: '#F59E0B', borderWidth: 1 }
                                ]}
                                onPress={() => setActiveTab('nuevos')}
                                activeOpacity={0.7}
                            >
                                <Text style={[
                                    styles.tabPillText,
                                    { color: activeTab === 'nuevos' ? '#fff' : '#92400E', fontWeight: '700' }
                                ]}>
                                    Nuevos ({unclaimedUsers.length})
                                </Text>
                            </TouchableOpacity>
                        )}
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
                                    ? activeTab === 'nuevos'
                                        ? 'No hay usuarios nuevos sin reclamar'
                                        : activeTab === 'grupos'
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

            {/* Labels Modal */}
            <Modal
                visible={showLabelsModal}
                transparent
                animationType="none"
                onRequestClose={closeLabelsModal}
            >
                <Pressable style={styles.labelsModalOverlay} onPress={closeLabelsModal}>
                    <Animated.View
                        style={[
                            styles.labelsModalContainer,
                            {
                                backgroundColor: colors.surface,
                                transform: [
                                    {
                                        scale: labelsModalAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.9, 1],
                                        }),
                                    },
                                ],
                                opacity: labelsModalAnim,
                            },
                        ]}
                    >
                        <Pressable onPress={(e) => e.stopPropagation()}>
                            <View style={styles.labelsModalHeader}>
                                <Text style={[styles.labelsModalTitle, { color: colors.textPrimary }]}>
                                    Etiquetas
                                </Text>
                                <TouchableOpacity onPress={closeLabelsModal}>
                                    <Ionicons name="close" size={24} color={colors.textMuted} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.labelsModalScroll} showsVerticalScrollIndicator={false}>
                                <View style={styles.labelsModalContent}>
                                    {availableLabels.map((label) => {
                                        const isSelected = selectedChatForLabels?.labels?.some(l => l.id === label.id);
                                        return (
                                            <TouchableOpacity
                                                key={label.id}
                                                style={[
                                                    styles.labelOption,
                                                    { borderColor: colors.border },
                                                    isSelected && { backgroundColor: label.color + '20', borderColor: label.color }
                                                ]}
                                                onPress={() => handleToggleLabel(label)}
                                                activeOpacity={0.7}
                                            >
                                                <View style={[styles.labelOptionIcon, { backgroundColor: label.color }]}>
                                                    <Ionicons name={label.icon as any} size={14} color="#fff" />
                                                </View>
                                                <Text style={[
                                                    styles.labelOptionText,
                                                    { color: colors.textPrimary },
                                                    isSelected && { color: label.color, fontWeight: '600' }
                                                ]}>
                                                    {label.name}
                                                </Text>
                                                {isSelected && (
                                                    <Ionicons name="checkmark-circle" size={18} color={label.color} />
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </ScrollView>

                            {/* Formulario para crear nueva etiqueta - fuera del scroll */}
                            {showNewLabelForm ? (
                                <View style={[styles.newLabelForm, { borderColor: colors.border, backgroundColor: colors.background }]}>
                                    <TextInput
                                        style={[styles.newLabelInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
                                        placeholder="Nombre de la etiqueta"
                                        placeholderTextColor={colors.textMuted}
                                        value={newLabelName}
                                        onChangeText={setNewLabelName}
                                        maxLength={20}
                                        autoFocus
                                    />
                                    <View style={styles.colorPicker}>
                                        {labelColors.map((color) => (
                                            <TouchableOpacity
                                                key={color}
                                                style={[
                                                    styles.colorOption,
                                                    { backgroundColor: color },
                                                    newLabelColor === color && styles.colorOptionSelected
                                                ]}
                                                onPress={() => setNewLabelColor(color)}
                                            />
                                        ))}
                                    </View>
                                    <View style={styles.newLabelButtons}>
                                        <TouchableOpacity
                                            style={[styles.newLabelButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
                                            onPress={() => {
                                                setShowNewLabelForm(false);
                                                setNewLabelName('');
                                            }}
                                        >
                                            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Cancelar</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.newLabelButton, { backgroundColor: colors.primary }]}
                                            onPress={handleCreateLabel}
                                            disabled={!newLabelName.trim() || isCreatingLabel}
                                        >
                                            {isCreatingLabel ? (
                                                <ActivityIndicator size="small" color="#fff" />
                                            ) : (
                                                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Crear</Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={[styles.addLabelButton, { borderColor: colors.primary }]}
                                    onPress={() => setShowNewLabelForm(true)}
                                >
                                    <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                                    <Text style={[styles.addLabelText, { color: colors.primary }]}>
                                        Crear nueva etiqueta
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </Pressable>
                    </Animated.View>
                </Pressable>
            </Modal>

            {/* Filter Modal */}
            <Modal
                visible={showFilterModal}
                transparent
                animationType="none"
                onRequestClose={closeFilterModal}
            >
                <Pressable style={styles.labelsModalOverlay} onPress={closeFilterModal}>
                    <Animated.View
                        style={[
                            styles.labelsModalContainer,
                            {
                                backgroundColor: colors.surface,
                                transform: [
                                    {
                                        scale: filterModalAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.9, 1],
                                        }),
                                    },
                                ],
                                opacity: filterModalAnim,
                            },
                        ]}
                    >
                        <Pressable onPress={(e) => e.stopPropagation()}>
                            <View style={styles.labelsModalHeader}>
                                <Text style={[styles.labelsModalTitle, { color: colors.textPrimary }]}>
                                    Filtrar por etiquetas
                                </Text>
                                <TouchableOpacity onPress={closeFilterModal}>
                                    <Ionicons name="close" size={24} color={colors.textMuted} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.labelsModalScroll} showsVerticalScrollIndicator={false}>
                                <View style={styles.labelsModalContent}>
                                    {availableLabels.map((label) => {
                                        const isSelected = filterLabels.includes(label.id);
                                        return (
                                            <TouchableOpacity
                                                key={label.id}
                                                style={[
                                                    styles.labelOption,
                                                    { borderColor: colors.border },
                                                    isSelected && { backgroundColor: label.color + '20', borderColor: label.color }
                                                ]}
                                                onPress={() => toggleFilterLabel(label.id)}
                                                activeOpacity={0.7}
                                            >
                                                <View style={[styles.labelOptionIcon, { backgroundColor: label.color }]}>
                                                    <Ionicons name={label.icon as any} size={14} color="#fff" />
                                                </View>
                                                <Text style={[
                                                    styles.labelOptionText,
                                                    { color: colors.textPrimary },
                                                    isSelected && { color: label.color, fontWeight: '600' }
                                                ]}>
                                                    {label.name}
                                                </Text>
                                                {isSelected && (
                                                    <Ionicons name="checkmark-circle" size={18} color={label.color} />
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </ScrollView>

                            {filterLabels.length > 0 && (
                                <TouchableOpacity
                                    style={[styles.clearFiltersButton, { borderColor: colors.error }]}
                                    onPress={clearFilters}
                                >
                                    <Ionicons name="trash-outline" size={16} color={colors.error} />
                                    <Text style={[styles.clearFiltersText, { color: colors.error }]}>
                                        Limpiar filtros ({filterLabels.length})
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </Pressable>
                    </Animated.View>
                </Pressable>
            </Modal>

            {/* RFC Search Modal */}
            <RfcSearchModal
                visible={rfcSearchVisible}
                onClose={() => setRfcSearchVisible(false)}
            />
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
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    rfcSearchBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        height: 44,
        borderRadius: 12,
    },
    rfcSearchBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
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
        fontSize: 12,
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
    claimButton: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        marginLeft: 10,
        alignSelf: 'center',
        minWidth: 80,
        alignItems: 'center',
    },
    claimButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
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
    labelsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 6,
        gap: 6,
        alignItems: 'center',
    },
    labelPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        gap: 4,
    },
    labelText: {
        fontSize: 10,
        fontWeight: '600',
    },
    moreLabels: {
        fontSize: 10,
        fontWeight: '500',
    },
    labelsModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    labelsModalContainer: {
        width: '90%',
        maxWidth: 380,
        maxHeight: '80%',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 12,
    },
    labelsModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    labelsModalTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    labelsModalContent: {
        gap: 8,
        paddingBottom: 4,
    },
    labelOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        gap: 10,
    },
    labelOptionIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    labelOptionText: {
        flex: 1,
        fontSize: 14,
    },
    labelsModalHint: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 16,
    },
    labelsModalScroll: {
        flexGrow: 0,
        flexShrink: 1,
    },
    newLabelForm: {
        marginTop: 12,
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
    },
    newLabelInput: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 13,
        marginBottom: 10,
    },
    colorPicker: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 10,
    },
    colorOption: {
        width: 26,
        height: 26,
        borderRadius: 13,
    },
    colorOptionSelected: {
        borderWidth: 3,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 3,
    },
    newLabelButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    newLabelButton: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addLabelButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        marginTop: 12,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderRadius: 10,
        gap: 6,
    },
    addLabelText: {
        fontSize: 13,
        fontWeight: '500',
    },
    filterBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#fff',
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    filterBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#6B7AED',
    },
    clearFiltersButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        marginTop: 12,
        borderWidth: 1.5,
        borderRadius: 10,
        gap: 6,
    },
    clearFiltersText: {
        fontSize: 13,
        fontWeight: '500',
    },
});

export default ChatsScreen;
