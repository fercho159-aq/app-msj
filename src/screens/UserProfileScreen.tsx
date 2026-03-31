import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Dimensions,
    ScrollView,
    Alert,
    Modal,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import { api, Message, User } from '../api';
import { RootStackParamList } from '../types';
import { getAbsoluteMediaUrl } from '../utils/urlHelper';

// Componente de avatar combinado para grupos
interface GroupAvatarProps {
    participants: User[];
    size: number;
    colors: any;
}

const GroupAvatar: React.FC<GroupAvatarProps> = ({ participants, size, colors }) => {
    const displayParticipants = participants.slice(0, 4);
    const count = displayParticipants.length;

    if (count === 0) {
        return (
            <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="people" size={size * 0.5} color="#fff" />
            </View>
        );
    }

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

    // Grid layout: 2x2 con gap minimo, clippeado en circulo
    const gap = 2;
    const cellSize = (size - gap) / 2;

    const renderCell = (p: User, cellSz: number) => (
        p.avatar_url ? (
            <Image source={{ uri: p.avatar_url }} style={{ width: cellSz, height: cellSz }} />
        ) : (
            <View style={{ width: cellSz, height: cellSz, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: cellSz * 0.38, fontWeight: 'bold' }}>
                    {(p.name || '?').charAt(0).toUpperCase()}
                </Text>
            </View>
        )
    );

    if (count === 2) {
        return (
            <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: colors.background }}>
                <View style={{ flexDirection: 'row' }}>
                    <View style={{ width: cellSize, height: size }}>
                        {renderCell(displayParticipants[0], size)}
                    </View>
                    <View style={{ width: gap, backgroundColor: colors.background }} />
                    <View style={{ width: cellSize, height: size }}>
                        {renderCell(displayParticipants[1], size)}
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: colors.background }}>
            <View style={{ flexDirection: 'row', height: cellSize }}>
                <View style={{ width: cellSize, height: cellSize, overflow: 'hidden' }}>
                    {renderCell(displayParticipants[0], cellSize)}
                </View>
                <View style={{ width: gap }} />
                <View style={{ width: cellSize, height: cellSize, overflow: 'hidden' }}>
                    {renderCell(displayParticipants[1], cellSize)}
                </View>
            </View>
            <View style={{ height: gap }} />
            <View style={{ flexDirection: 'row', height: cellSize }}>
                <View style={{ width: cellSize, height: cellSize, overflow: 'hidden' }}>
                    {renderCell(displayParticipants[2], cellSize)}
                </View>
                <View style={{ width: gap }} />
                <View style={{ width: cellSize, height: cellSize, overflow: 'hidden' }}>
                    {count >= 4 ? renderCell(displayParticipants[3], cellSize) : (
                        <View style={{ width: cellSize, height: cellSize, backgroundColor: `${colors.primary}20`, justifyContent: 'center', alignItems: 'center' }}>
                            <Ionicons name="people" size={cellSize * 0.4} color={colors.primary} />
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
};

type UserProfileScreenRouteProp = RouteProp<RootStackParamList, 'UserProfile'>;
type UserProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'UserProfile'>;

interface UserProfileScreenProps {
    route: UserProfileScreenRouteProp;
    navigation: UserProfileScreenNavigationProp;
}

interface SharedFile {
    id: string;
    url: string;
    type: 'image' | 'file' | 'video' | 'audio';
    fileName?: string;
    timestamp: string;
}

const { width } = Dimensions.get('window');
const THUMBNAIL_SIZE = (width - 48) / 3;

export const UserProfileScreen: React.FC<UserProfileScreenProps> = ({ route, navigation }) => {
    const { userId, userName, userAvatar, userRfc, chatId, isGroup, participants } = route.params as any;
    const { colors } = useTheme();
    const { user } = useAuth();
    const { startCall } = useCall();

    const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'images' | 'files' | 'fiscal'>('images');
    const [fullUserData, setFullUserData] = useState<User | null>(null);
    const [isLoadingFiscal, setIsLoadingFiscal] = useState(false);

    // Moderation state
    const [isBlocked, setIsBlocked] = useState(false);
    const [isCheckingBlock, setIsCheckingBlock] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState<string>('');
    const [reportDescription, setReportDescription] = useState('');
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);

    const isAdmin = user?.rfc === 'ADMIN000CONS';
    const isConsultor = (user as any)?.role === 'consultor';

    // State para gestión de miembros del grupo
    const [localParticipants, setLocalParticipants] = useState<User[]>(participants || []);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [memberSearchQuery, setMemberSearchQuery] = useState('');
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);

    // Filtrar participantes excluyendo al usuario actual
    const groupParticipants = localParticipants?.filter((p: User) => p.id !== user?.id) || [];

    // Verificar si el usuario está bloqueado
    useEffect(() => {
        if (userId && !isGroup) {
            checkBlockStatus();
        }
    }, [userId]);

    // Cargar archivos compartidos del chat
    useEffect(() => {
        loadSharedFiles();
    }, [chatId]);

    // Cargar datos completos del usuario (incluyendo fiscales)
    useEffect(() => {
        if (userId && !isGroup) {
            loadUserFiscalData();
        }
    }, [userId]);

    const checkBlockStatus = async () => {
        setIsCheckingBlock(true);
        try {
            const result = await api.isUserBlocked(userId);
            if (result.data) {
                setIsBlocked(result.data.blocked);
            }
        } catch (error) {
            console.error('Error checking block status:', error);
        } finally {
            setIsCheckingBlock(false);
        }
    };

    const handleBlockUser = () => {
        Alert.alert(
            isBlocked ? 'Desbloquear usuario' : 'Bloquear usuario',
            isBlocked
                ? `¿Desbloquear a ${userName}? Podrás recibir mensajes de este usuario nuevamente.`
                : `¿Bloquear a ${userName}? No recibirás mensajes de este usuario y no podrá contactarte.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: isBlocked ? 'Desbloquear' : 'Bloquear',
                    style: isBlocked ? 'default' : 'destructive',
                    onPress: async () => {
                        try {
                            if (isBlocked) {
                                await api.unblockUser(userId);
                                setIsBlocked(false);
                                Alert.alert('Usuario desbloqueado', `${userName} ha sido desbloqueado.`);
                            } else {
                                await api.blockUser(userId);
                                setIsBlocked(true);
                                Alert.alert('Usuario bloqueado', `${userName} ha sido bloqueado. No recibirás mensajes de este usuario.`);
                            }
                        } catch (error) {
                            Alert.alert('Error', 'No se pudo completar la acción');
                        }
                    },
                },
            ]
        );
    };

    const handleReportUser = () => {
        setReportReason('');
        setReportDescription('');
        setShowReportModal(true);
    };

    const submitReport = async () => {
        if (!reportReason) {
            Alert.alert('Error', 'Selecciona un motivo para el reporte');
            return;
        }

        setIsSubmittingReport(true);
        try {
            const result = await api.reportUser(
                userId,
                reportReason,
                reportDescription || undefined,
                undefined,
                chatId
            );

            if (result.error) {
                Alert.alert('Error', result.error);
            } else {
                setShowReportModal(false);
                Alert.alert(
                    'Reporte enviado',
                    'Gracias por tu reporte. Nuestro equipo lo revisará en las próximas 24 horas.'
                );
            }
        } catch (error) {
            Alert.alert('Error', 'No se pudo enviar el reporte');
        } finally {
            setIsSubmittingReport(false);
        }
    };

    const loadUserFiscalData = async () => {
        try {
            setIsLoadingFiscal(true);
            const result = await api.getUser(userId);
            if (result.data?.user) {
                setFullUserData(result.data.user);
            }
        } catch (error) {
            console.error('Error loading user fiscal data:', error);
        } finally {
            setIsLoadingFiscal(false);
        }
    };

    const loadSharedFiles = async () => {
        try {
            setIsLoading(true);
            // Obtener mensajes del chat y filtrar solo los que tienen media
            const result = await api.getChatMessages(chatId, 500, 0); // Obtener más mensajes para ver archivos
            if (result.data?.messages) {
                const files: SharedFile[] = result.data.messages
                    .filter((msg: Message) => msg.type === 'image' || msg.type === 'file')
                    .map((msg: Message) => ({
                        id: msg.id,
                        url: getAbsoluteMediaUrl(msg.mediaUrl) || '',
                        type: msg.type as 'image' | 'file',
                        fileName: msg.text || undefined,
                        timestamp: msg.timestamp,
                    }))
                    .filter((file: SharedFile) => file.url); // Solo archivos con URL válida

                setSharedFiles(files);
            }
        } catch (error) {
            console.error('Error loading shared files:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCall = () => {
        if (isAdmin && userId) {
            startCall(userId, userName || 'Usuario', 'audio');
        }
    };

    // === Gestión de miembros del grupo ===

    const loadAvailableUsers = async () => {
        setIsLoadingUsers(true);
        try {
            const result = await api.getUsers();
            if (result.data?.users) {
                // Excluir usuarios que ya son participantes
                const participantIds = new Set(localParticipants.map((p: User) => p.id));
                const available = result.data.users.filter(
                    (u: User) => !participantIds.has(u.id)
                );
                setAllUsers(available);
            }
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            setIsLoadingUsers(false);
        }
    };

    const handleOpenAddMember = () => {
        setMemberSearchQuery('');
        setShowAddMemberModal(true);
        loadAvailableUsers();
    };

    const handleAddMember = async (selectedUser: User) => {
        try {
            const result = await api.addGroupMembers(chatId, [selectedUser.id]);
            if (result.error) {
                Alert.alert('Error', result.error);
                return;
            }
            setLocalParticipants(prev => [...prev, selectedUser]);
            // Remover de la lista de disponibles
            setAllUsers(prev => prev.filter(u => u.id !== selectedUser.id));
            Alert.alert('Listo', `${selectedUser.name || 'Usuario'} fue agregado al grupo.`);
        } catch (error) {
            Alert.alert('Error', 'No se pudo agregar al participante');
        }
    };

    const handleRemoveMember = (member: User) => {
        Alert.alert(
            'Eliminar participante',
            `¿Eliminar a ${member.name || 'este usuario'} del grupo?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const result = await api.removeGroupMember(chatId, member.id);
                            if (result.error) {
                                Alert.alert('Error', result.error);
                                return;
                            }
                            setLocalParticipants(prev => prev.filter(p => p.id !== member.id));
                        } catch (error) {
                            Alert.alert('Error', 'No se pudo eliminar al participante');
                        }
                    },
                },
            ]
        );
    };

    const filteredAvailableUsers = allUsers.filter(u =>
        u.name?.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
        u.rfc?.toLowerCase().includes(memberSearchQuery.toLowerCase())
    );

    const handleFilePress = (file: SharedFile) => {
        // Navegar de vuelta al chat para ver el archivo
        // O abrir un preview modal
        navigation.goBack();
    };

    const imageFiles = sharedFiles.filter(f => f.type === 'image');
    const documentFiles = sharedFiles.filter(f => f.type === 'file');

    const renderImageThumbnail = ({ item }: { item: SharedFile }) => (
        <TouchableOpacity
            style={[styles.thumbnailContainer, { backgroundColor: colors.surface }]}
            onPress={() => handleFilePress(item)}
            activeOpacity={0.8}
        >
            <Image
                source={{ uri: item.url }}
                style={styles.thumbnail}
                resizeMode="cover"
            />
        </TouchableOpacity>
    );

    const renderFileItem = ({ item }: { item: SharedFile }) => (
        <TouchableOpacity
            style={[styles.fileItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => handleFilePress(item)}
            activeOpacity={0.7}
        >
            <View style={[styles.fileIconContainer, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name="document-text" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.fileName, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.fileName || 'Archivo'}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header con botón de volver */}
            <LinearGradient
                colors={[colors.backgroundSecondary, colors.background]}
                style={[styles.header, { borderBottomColor: colors.divider }]}
            >
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                    {isGroup ? 'Grupo' : 'Perfil'}
                </Text>
                <View style={styles.headerPlaceholder} />
            </LinearGradient>

            <ScrollView
                style={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Perfil del usuario/grupo */}
                <View style={styles.profileSection}>
                    {/* Avatar grande */}
                    <View style={[styles.avatarContainer, { borderColor: colors.primary }]}>
                        {isGroup ? (
                            <GroupAvatar participants={groupParticipants} size={114} colors={colors} />
                        ) : userAvatar ? (
                            <Image
                                source={{ uri: userAvatar }}
                                style={styles.avatar}
                            />
                        ) : (
                            <LinearGradient
                                colors={['#4A90D9', '#357ABD']}
                                style={styles.avatarPlaceholder}
                            >
                                <Text style={styles.avatarInitial}>
                                    {(userName || 'U').replace(/^\s*\([sS]\)[:\s]*/g, '').charAt(0).toUpperCase()}
                                </Text>
                            </LinearGradient>
                        )}
                    </View>

                    {/* Nombre - limpiar artefactos OCR */}
                    <Text style={[styles.userName, { color: colors.textPrimary }]}>
                        {(userName || (isGroup ? 'Grupo' : 'Usuario')).replace(/^\s*\([sS]\)[:\s]*/g, '').trim()}
                    </Text>

                    {/* Info del grupo o RFC */}
                    {isGroup ? (
                        <Text style={[styles.userRfc, { color: colors.textSecondary }]}>
                            {localParticipants.length} participantes
                        </Text>
                    ) : userRfc && (
                        <Text style={[styles.userRfc, { color: colors.textSecondary }]}>
                            RFC: {userRfc}
                        </Text>
                    )}

                    {/* Botón de llamada - solo para usuarios, no grupos */}
                    {isAdmin && !isGroup && (
                        <TouchableOpacity
                            style={[styles.callButton, { backgroundColor: colors.primary }]}
                            onPress={handleCall}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="call" size={22} color="#FFFFFF" />
                            <Text style={styles.callButtonText}>Llamar</Text>
                        </TouchableOpacity>
                    )}

                    {/* Botones de moderación - solo para chats individuales */}
                    {!isGroup && userId !== user?.id && (
                        <View style={styles.moderationButtons}>
                            <TouchableOpacity
                                style={[
                                    styles.moderationButton,
                                    { borderColor: colors.border },
                                    isBlocked && { borderColor: '#EF4444', backgroundColor: '#EF444410' }
                                ]}
                                onPress={handleBlockUser}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name={isBlocked ? 'lock-open-outline' : 'ban-outline'}
                                    size={18}
                                    color={isBlocked ? '#EF4444' : colors.textSecondary}
                                />
                                <Text style={[
                                    styles.moderationButtonText,
                                    { color: isBlocked ? '#EF4444' : colors.textSecondary }
                                ]}>
                                    {isBlocked ? 'Desbloquear' : 'Bloquear'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.moderationButton, { borderColor: colors.border }]}
                                onPress={handleReportUser}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="flag-outline" size={18} color={colors.textSecondary} />
                                <Text style={[styles.moderationButtonText, { color: colors.textSecondary }]}>
                                    Reportar
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Lista de participantes del grupo */}
                {isGroup && groupParticipants.length > 0 && (
                    <View style={styles.participantsSection}>
                        <View style={styles.participantsSectionHeader}>
                            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                                Participantes
                            </Text>
                            <View style={[styles.participantCountBadge, { backgroundColor: `${colors.primary}18` }]}>
                                <Text style={[styles.participantCountText, { color: colors.primary }]}>
                                    {groupParticipants.length}
                                </Text>
                            </View>
                        </View>

                        <View style={[styles.participantsList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            {groupParticipants.map((participant: User, index: number) => (
                                <View
                                    key={participant.id}
                                    style={[
                                        styles.participantItem,
                                        index < groupParticipants.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: colors.divider },
                                    ]}
                                >
                                    {participant.avatar_url ? (
                                        <Image source={{ uri: participant.avatar_url }} style={styles.participantAvatar} />
                                    ) : (
                                        <LinearGradient
                                            colors={[colors.primary, colors.primaryDark]}
                                            style={[styles.participantAvatar, styles.participantAvatarPlaceholder]}
                                        >
                                            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                                                {(participant.name || '?').charAt(0).toUpperCase()}
                                            </Text>
                                        </LinearGradient>
                                    )}
                                    <View style={styles.participantInfo}>
                                        <Text style={[styles.participantName, { color: colors.textPrimary }]} numberOfLines={1}>
                                            {participant.name || 'Usuario'}
                                        </Text>
                                        <View style={[
                                            styles.roleBadge,
                                            {
                                                backgroundColor: participant.role === 'consultor'
                                                    ? `${colors.primary}15`
                                                    : participant.role === 'asesor'
                                                    ? '#F59E0B12'
                                                    : `${colors.textMuted}12`,
                                            }
                                        ]}>
                                            <Text style={[
                                                styles.roleBadgeText,
                                                {
                                                    color: participant.role === 'consultor'
                                                        ? colors.primary
                                                        : participant.role === 'asesor'
                                                        ? '#D97706'
                                                        : colors.textMuted,
                                                }
                                            ]}>
                                                {participant.role === 'consultor' ? 'Consultor' :
                                                 participant.role === 'asesor' ? 'Asesor' : 'Usuario'}
                                            </Text>
                                        </View>
                                    </View>
                                    {isConsultor && (
                                        <TouchableOpacity
                                            onPress={() => handleRemoveMember(participant)}
                                            style={[styles.removeParticipantButton, { backgroundColor: '#EF444410' }]}
                                            activeOpacity={0.6}
                                        >
                                            <Ionicons name="remove" size={16} color="#EF4444" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                        </View>

                        {/* Botón agregar participante */}
                        {isConsultor && (
                            <TouchableOpacity
                                style={[styles.addParticipantButton, { backgroundColor: `${colors.primary}10` }]}
                                onPress={handleOpenAddMember}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.addParticipantIcon, { backgroundColor: colors.primary }]}>
                                    <Ionicons name="add" size={18} color="#fff" />
                                </View>
                                <Text style={[styles.addParticipantText, { color: colors.primary }]}>
                                    Agregar participante
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Sección de archivos compartidos */}
                <View style={styles.filesSection}>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 16 }]}>
                        Archivos Compartidos
                    </Text>

                    {/* Tabs */}
                    <View style={[styles.tabsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <TouchableOpacity
                            style={[
                                styles.tab,
                                activeTab === 'images' && { backgroundColor: colors.primary }
                            ]}
                            onPress={() => setActiveTab('images')}
                        >
                            <Ionicons
                                name="images"
                                size={20}
                                color={activeTab === 'images' ? '#FFFFFF' : colors.textMuted}
                            />
                            <Text style={[
                                styles.tabText,
                                { color: activeTab === 'images' ? '#FFFFFF' : colors.textMuted }
                            ]}>
                                Fotos
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.tab,
                                activeTab === 'files' && { backgroundColor: colors.primary }
                            ]}
                            onPress={() => setActiveTab('files')}
                        >
                            <Ionicons
                                name="document"
                                size={20}
                                color={activeTab === 'files' ? '#FFFFFF' : colors.textMuted}
                            />
                            <Text style={[
                                styles.tabText,
                                { color: activeTab === 'files' ? '#FFFFFF' : colors.textMuted }
                            ]}>
                                Docs
                            </Text>
                        </TouchableOpacity>

                        {!isGroup && (
                            <TouchableOpacity
                                style={[
                                    styles.tab,
                                    activeTab === 'fiscal' && { backgroundColor: colors.primary }
                                ]}
                                onPress={() => setActiveTab('fiscal')}
                            >
                                <Ionicons
                                    name="receipt"
                                    size={20}
                                    color={activeTab === 'fiscal' ? '#FFFFFF' : colors.textMuted}
                                />
                                <Text style={[
                                    styles.tabText,
                                    { color: activeTab === 'fiscal' ? '#FFFFFF' : colors.textMuted }
                                ]}>
                                    Fiscal
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Contenido */}
                    {isLoading && activeTab !== 'fiscal' ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : (
                        <>
                            {activeTab === 'images' && (
                                imageFiles.length > 0 ? (
                                    <FlatList
                                        key="images-grid"
                                        data={imageFiles}
                                        renderItem={renderImageThumbnail}
                                        keyExtractor={(item) => item.id}
                                        numColumns={3}
                                        scrollEnabled={false}
                                        contentContainerStyle={styles.gridContainer}
                                    />
                                ) : (
                                    <View style={styles.emptyState}>
                                        <Ionicons name="images-outline" size={48} color={colors.textMuted} />
                                        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                                            No hay fotos compartidas
                                        </Text>
                                    </View>
                                )
                            )}
                            {activeTab === 'files' && (
                                documentFiles.length > 0 ? (
                                    <FlatList
                                        key="files-list"
                                        data={documentFiles}
                                        renderItem={renderFileItem}
                                        keyExtractor={(item) => item.id}
                                        scrollEnabled={false}
                                        contentContainerStyle={styles.filesListContainer}
                                    />
                                ) : (
                                    <View style={styles.emptyState}>
                                        <Ionicons name="document-outline" size={48} color={colors.textMuted} />
                                        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                                            No hay documentos compartidos
                                        </Text>
                                    </View>
                                )
                            )}
                            {activeTab === 'fiscal' && (
                                isLoadingFiscal ? (
                                    <View style={styles.loadingContainer}>
                                        <ActivityIndicator size="large" color={colors.primary} />
                                    </View>
                                ) : fullUserData ? (
                                    <View style={styles.fiscalContainer}>
                                        {/* RFC */}
                                        <View style={[styles.fiscalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                            <View style={[styles.fiscalIconContainer, { backgroundColor: `${colors.primary}15` }]}>
                                                <Ionicons name="card-outline" size={22} color={colors.primary} />
                                            </View>
                                            <View style={styles.fiscalInfo}>
                                                <Text style={[styles.fiscalLabel, { color: colors.textMuted }]}>RFC</Text>
                                                <Text style={[styles.fiscalValue, { color: colors.textPrimary }]}>
                                                    {fullUserData.rfc || 'No disponible'}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* CURP */}
                                        {fullUserData.curp && (
                                            <View style={[styles.fiscalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                                <View style={[styles.fiscalIconContainer, { backgroundColor: `${colors.primary}15` }]}>
                                                    <Ionicons name="finger-print-outline" size={22} color={colors.primary} />
                                                </View>
                                                <View style={styles.fiscalInfo}>
                                                    <Text style={[styles.fiscalLabel, { color: colors.textMuted }]}>CURP</Text>
                                                    <Text style={[styles.fiscalValue, { color: colors.textPrimary }]}>
                                                        {fullUserData.curp}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}

                                        {/* Razon Social */}
                                        {fullUserData.razon_social && (
                                            <View style={[styles.fiscalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                                <View style={[styles.fiscalIconContainer, { backgroundColor: `${colors.primary}15` }]}>
                                                    <Ionicons name="business-outline" size={22} color={colors.primary} />
                                                </View>
                                                <View style={styles.fiscalInfo}>
                                                    <Text style={[styles.fiscalLabel, { color: colors.textMuted }]}>Razon Social</Text>
                                                    <Text style={[styles.fiscalValue, { color: colors.textPrimary }]}>
                                                        {fullUserData.razon_social}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}

                                        {/* Tipo Persona */}
                                        {fullUserData.tipo_persona && (
                                            <View style={[styles.fiscalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                                <View style={[styles.fiscalIconContainer, { backgroundColor: `${colors.primary}15` }]}>
                                                    <Ionicons name="person-outline" size={22} color={colors.primary} />
                                                </View>
                                                <View style={styles.fiscalInfo}>
                                                    <Text style={[styles.fiscalLabel, { color: colors.textMuted }]}>Tipo de Persona</Text>
                                                    <Text style={[styles.fiscalValue, { color: colors.textPrimary }]}>
                                                        {fullUserData.tipo_persona === 'fisica' ? 'Persona Fisica' : 'Persona Moral'}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}

                                        {/* Regimen Fiscal */}
                                        {fullUserData.regimen_fiscal && (
                                            <View style={[styles.fiscalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                                <View style={[styles.fiscalIconContainer, { backgroundColor: `${colors.primary}15` }]}>
                                                    <Ionicons name="briefcase-outline" size={22} color={colors.primary} />
                                                </View>
                                                <View style={styles.fiscalInfo}>
                                                    <Text style={[styles.fiscalLabel, { color: colors.textMuted }]}>Regimen Fiscal</Text>
                                                    <Text style={[styles.fiscalValue, { color: colors.textPrimary }]}>
                                                        {fullUserData.regimen_fiscal}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}

                                        {/* Codigo Postal */}
                                        {fullUserData.codigo_postal && (
                                            <View style={[styles.fiscalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                                <View style={[styles.fiscalIconContainer, { backgroundColor: `${colors.primary}15` }]}>
                                                    <Ionicons name="location-outline" size={22} color={colors.primary} />
                                                </View>
                                                <View style={styles.fiscalInfo}>
                                                    <Text style={[styles.fiscalLabel, { color: colors.textMuted }]}>Codigo Postal</Text>
                                                    <Text style={[styles.fiscalValue, { color: colors.textPrimary }]}>
                                                        {fullUserData.codigo_postal}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}

                                        {/* Estado */}
                                        {fullUserData.estado && (
                                            <View style={[styles.fiscalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                                <View style={[styles.fiscalIconContainer, { backgroundColor: `${colors.primary}15` }]}>
                                                    <Ionicons name="map-outline" size={22} color={colors.primary} />
                                                </View>
                                                <View style={styles.fiscalInfo}>
                                                    <Text style={[styles.fiscalLabel, { color: colors.textMuted }]}>Estado</Text>
                                                    <Text style={[styles.fiscalValue, { color: colors.textPrimary }]}>
                                                        {fullUserData.estado}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}

                                        {/* Domicilio */}
                                        {fullUserData.domicilio && (
                                            <View style={[styles.fiscalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                                <View style={[styles.fiscalIconContainer, { backgroundColor: `${colors.primary}15` }]}>
                                                    <Ionicons name="home-outline" size={22} color={colors.primary} />
                                                </View>
                                                <View style={styles.fiscalInfo}>
                                                    <Text style={[styles.fiscalLabel, { color: colors.textMuted }]}>Domicilio Fiscal</Text>
                                                    <Text style={[styles.fiscalValue, { color: colors.textPrimary }]}>
                                                        {fullUserData.domicilio}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}

                                        {/* Telefono */}
                                        {fullUserData.phone && (
                                            <View style={[styles.fiscalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                                <View style={[styles.fiscalIconContainer, { backgroundColor: `${colors.primary}15` }]}>
                                                    <Ionicons name="call-outline" size={22} color={colors.primary} />
                                                </View>
                                                <View style={styles.fiscalInfo}>
                                                    <Text style={[styles.fiscalLabel, { color: colors.textMuted }]}>Telefono</Text>
                                                    <Text style={[styles.fiscalValue, { color: colors.textPrimary }]}>
                                                        {fullUserData.phone}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}

                                        {/* Sin datos fiscales */}
                                        {!fullUserData.curp && !fullUserData.razon_social && !fullUserData.regimen_fiscal &&
                                         !fullUserData.codigo_postal && !fullUserData.estado && !fullUserData.domicilio && (
                                            <View style={styles.emptyState}>
                                                <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
                                                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                                                    No hay informacion fiscal disponible
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                ) : (
                                    <View style={styles.emptyState}>
                                        <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
                                        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                                            No se pudo cargar la informacion fiscal
                                        </Text>
                                    </View>
                                )
                            )}
                        </>
                    )}
                </View>
            </ScrollView>

            {/* Modal de Reporte */}
            <Modal
                visible={showReportModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowReportModal(false)}
            >
                <View style={styles.reportModalOverlay}>
                    <TouchableOpacity
                        style={styles.reportModalDismiss}
                        activeOpacity={1}
                        onPress={() => setShowReportModal(false)}
                    />
                    <View style={[styles.reportModalContent, { backgroundColor: colors.background }]}>
                        <View style={styles.reportModalHeader}>
                            <Text style={[styles.reportModalTitle, { color: colors.textPrimary }]}>
                                Reportar usuario
                            </Text>
                            <TouchableOpacity onPress={() => setShowReportModal(false)}>
                                <Ionicons name="close" size={24} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.reportModalSubtitle, { color: colors.textMuted }]}>
                            Selecciona el motivo del reporte. Nuestro equipo revisará el caso en las próximas 24 horas.
                        </Text>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {[
                                { key: 'spam', label: 'Spam', icon: 'mail-outline' },
                                { key: 'harassment', label: 'Acoso', icon: 'warning-outline' },
                                { key: 'inappropriate', label: 'Contenido inapropiado', icon: 'eye-off-outline' },
                                { key: 'violence', label: 'Violencia o amenazas', icon: 'alert-circle-outline' },
                                { key: 'other', label: 'Otro motivo', icon: 'help-circle-outline' },
                            ].map((option) => (
                                <TouchableOpacity
                                    key={option.key}
                                    style={[
                                        styles.reportOption,
                                        { borderColor: colors.border },
                                        reportReason === option.key && { borderColor: colors.primary, backgroundColor: `${colors.primary}10` }
                                    ]}
                                    onPress={() => setReportReason(option.key)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={option.icon as any}
                                        size={20}
                                        color={reportReason === option.key ? colors.primary : colors.textMuted}
                                    />
                                    <Text style={[
                                        styles.reportOptionText,
                                        { color: reportReason === option.key ? colors.primary : colors.textPrimary }
                                    ]}>
                                        {option.label}
                                    </Text>
                                    {reportReason === option.key && (
                                        <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                                    )}
                                </TouchableOpacity>
                            ))}

                            <TextInput
                                style={[
                                    styles.reportDescriptionInput,
                                    { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }
                                ]}
                                placeholder="Descripción adicional (opcional)"
                                placeholderTextColor={colors.textMuted}
                                value={reportDescription}
                                onChangeText={setReportDescription}
                                multiline
                                numberOfLines={3}
                            />

                            <TouchableOpacity
                                style={[
                                    styles.reportSubmitButton,
                                    { backgroundColor: colors.primary },
                                    (!reportReason || isSubmittingReport) && { opacity: 0.5 }
                                ]}
                                onPress={submitReport}
                                disabled={!reportReason || isSubmittingReport}
                                activeOpacity={0.8}
                            >
                                {isSubmittingReport ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.reportSubmitText}>Enviar reporte</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Modal para agregar miembros al grupo */}
            <Modal
                visible={showAddMemberModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowAddMemberModal(false)}
            >
                <View style={styles.reportModalOverlay}>
                    <TouchableOpacity
                        style={styles.reportModalDismiss}
                        activeOpacity={1}
                        onPress={() => setShowAddMemberModal(false)}
                    />
                    <View style={[styles.addMemberModalContent, { backgroundColor: colors.background }]}>
                        {/* Handle bar */}
                        <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

                        <View style={styles.reportModalHeader}>
                            <Text style={[styles.reportModalTitle, { color: colors.textPrimary }]}>
                                Agregar participante
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowAddMemberModal(false)}
                                style={[styles.modalCloseButton, { backgroundColor: colors.surfaceLight }]}
                            >
                                <Ionicons name="close" size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.memberSearchContainer, { backgroundColor: colors.surfaceLight }]}>
                            <Ionicons name="search" size={18} color={colors.textMuted} />
                            <TextInput
                                style={[styles.memberSearchInput, { color: colors.textPrimary }]}
                                placeholder="Buscar por nombre o RFC..."
                                placeholderTextColor={colors.textMuted}
                                value={memberSearchQuery}
                                onChangeText={setMemberSearchQuery}
                                autoFocus
                            />
                            {memberSearchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setMemberSearchQuery('')}>
                                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {isLoadingUsers ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={colors.primary} />
                            </View>
                        ) : (
                            <FlatList
                                data={filteredAvailableUsers}
                                keyExtractor={(item) => item.id}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: 20 }}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[styles.addMemberItem, { borderBottomColor: colors.divider }]}
                                        onPress={() => handleAddMember(item)}
                                        activeOpacity={0.6}
                                    >
                                        {item.avatar_url ? (
                                            <Image source={{ uri: item.avatar_url }} style={styles.addMemberAvatar} />
                                        ) : (
                                            <LinearGradient
                                                colors={[colors.primary, colors.primaryDark]}
                                                style={[styles.addMemberAvatar, { justifyContent: 'center', alignItems: 'center' }]}
                                            >
                                                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
                                                    {(item.name || '?').charAt(0).toUpperCase()}
                                                </Text>
                                            </LinearGradient>
                                        )}
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.addMemberName, { color: colors.textPrimary }]} numberOfLines={1}>
                                                {item.name || 'Usuario'}
                                            </Text>
                                            <Text style={[styles.addMemberRfc, { color: colors.textMuted }]}>
                                                {item.rfc}
                                            </Text>
                                        </View>
                                        <View style={[styles.addMemberAction, { backgroundColor: `${colors.primary}12` }]}>
                                            <Ionicons name="person-add" size={16} color={colors.primary} />
                                        </View>
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={
                                    <View style={styles.emptyState}>
                                        <Ionicons name="people-outline" size={44} color={colors.textMuted} />
                                        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                                            {memberSearchQuery ? 'Sin resultados' : 'No hay usuarios disponibles'}
                                        </Text>
                                    </View>
                                }
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingVertical: 12,
        paddingTop: 56,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    headerPlaceholder: {
        width: 44,
    },
    scrollContainer: {
        flex: 1,
    },
    profileSection: {
        alignItems: 'center',
        paddingVertical: 32,
        paddingHorizontal: 20,
    },
    avatarContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        padding: 3,
        marginBottom: 16,
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 57,
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        borderRadius: 57,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    userName: {
        fontSize: 26,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    userRfc: {
        fontSize: 14,
        marginBottom: 20,
    },
    callButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 30,
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    callButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '600',
    },
    filesSection: {
        paddingHorizontal: 16,
        paddingBottom: 32,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    tabsContainer: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 5,
        marginBottom: 16,
        borderWidth: 1,
        gap: 4,
    },
    tab: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 10,
        gap: 4,
    },
    tabText: {
        fontSize: 11,
        fontWeight: '600',
    },
    gridContainer: {
        gap: 4,
    },
    thumbnailContainer: {
        width: THUMBNAIL_SIZE,
        height: THUMBNAIL_SIZE,
        margin: 2,
        borderRadius: 8,
        overflow: 'hidden',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
    filesListContainer: {
        gap: 8,
    },
    fileItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
    },
    fileIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    fileName: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
    },
    loadingContainer: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 15,
        marginTop: 12,
    },
    participantsSection: {
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    participantsSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    participantCountBadge: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 12,
    },
    participantCountText: {
        fontSize: 13,
        fontWeight: '700',
    },
    participantsList: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    participantItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
    },
    participantAvatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        marginRight: 12,
    },
    participantAvatarPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    participantInfo: {
        flex: 1,
        gap: 4,
    },
    participantName: {
        fontSize: 15,
        fontWeight: '600',
    },
    roleBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    roleBadgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    // Estilos de gestión de miembros
    removeParticipantButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addParticipantButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        marginTop: 10,
        borderRadius: 14,
        gap: 10,
    },
    addParticipantIcon: {
        width: 26,
        height: 26,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addParticipantText: {
        fontSize: 15,
        fontWeight: '600',
    },
    // Modal agregar miembro
    addMemberModalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingTop: 12,
        paddingBottom: 40,
        maxHeight: '75%',
    },
    modalHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 14,
    },
    modalCloseButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    memberSearchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 12,
        marginBottom: 16,
        gap: 8,
    },
    memberSearchInput: {
        flex: 1,
        fontSize: 15,
        paddingVertical: 12,
    },
    addMemberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 11,
        borderBottomWidth: 0.5,
    },
    addMemberAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    addMemberName: {
        fontSize: 15,
        fontWeight: '600',
    },
    addMemberRfc: {
        fontSize: 12,
        marginTop: 2,
    },
    addMemberAction: {
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Estilos de moderación
    moderationButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    },
    moderationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        gap: 6,
    },
    moderationButtonText: {
        fontSize: 14,
        fontWeight: '500',
    },
    // Estilos del modal de reporte
    reportModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    reportModalDismiss: {
        flex: 1,
    },
    reportModalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
        maxHeight: '80%',
    },
    reportModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    reportModalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    reportModalSubtitle: {
        fontSize: 14,
        marginBottom: 20,
        lineHeight: 20,
    },
    reportOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
        gap: 12,
    },
    reportOptionText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
    },
    reportDescriptionInput: {
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        borderWidth: 1,
        marginTop: 8,
        marginBottom: 16,
        height: 80,
        textAlignVertical: 'top',
    },
    reportSubmitButton: {
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginBottom: 16,
    },
    reportSubmitText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    // Estilos para informacion fiscal
    fiscalContainer: {
        gap: 12,
    },
    fiscalCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    fiscalIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    fiscalInfo: {
        flex: 1,
    },
    fiscalLabel: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    fiscalValue: {
        fontSize: 15,
        fontWeight: '600',
    },
});

export default UserProfileScreen;
