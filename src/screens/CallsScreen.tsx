import React, { useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    ActivityIndicator,
    RefreshControl,
    Linking,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import { api, CallRequest } from '../api';
import colors from '../theme/colors';

interface CallRequestItemProps {
    request: CallRequest;
    onCall: (phone: string) => void;
    onComplete: (id: string) => void;
}

const CallRequestItem: React.FC<CallRequestItemProps> = ({ request, onCall, onComplete }) => {
    const formatDate = (dateString: string) => {
        try {
            const date = parseISO(dateString);
            return format(date, "dd MMM, HH:mm", { locale: es });
        } catch {
            return dateString;
        }
    };

    return (
        <View style={styles.requestItem}>
            <View style={styles.requestHeader}>
                <LinearGradient
                    colors={['#E53935', '#C62828'] as [string, string]}
                    style={styles.requestAvatar}
                >
                    <Ionicons name="call" size={20} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.requestInfo}>
                    <Text style={styles.requestName}>{request.name}</Text>
                    <Text style={styles.requestPhone}>{request.phone}</Text>
                    <Text style={styles.requestTime}>{formatDate(request.created_at)}</Text>
                </View>
            </View>

            <View style={styles.emergencyContainer}>
                <Text style={styles.emergencyLabel}>Motivo:</Text>
                <Text style={styles.emergencyText}>{request.emergency}</Text>
            </View>

            <View style={styles.requestActions}>
                <TouchableOpacity
                    style={styles.callNowButton}
                    onPress={() => onCall(request.phone)}
                >
                    <Ionicons name="call" size={18} color="#FFFFFF" />
                    <Text style={styles.callNowText}>Llamar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.completeButton}
                    onPress={() => onComplete(request.id)}
                >
                    <Ionicons name="checkmark" size={18} color={colors.success} />
                    <Text style={styles.completeText}>Completado</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

// Componente para usuarios en línea
interface OnlineUserItemProps {
    user: { userId: string; name: string };
    onCallAudio: () => void;
    onCallVideo: () => void;
}

const OnlineUserItem: React.FC<OnlineUserItemProps> = ({ user, onCallAudio, onCallVideo }) => {
    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <View style={styles.onlineUserItem}>
            <View style={styles.onlineUserInfo}>
                <LinearGradient
                    colors={['#667eea', '#764ba2'] as [string, string]}
                    style={styles.onlineUserAvatar}
                >
                    <Text style={styles.onlineUserInitials}>{getInitials(user.name)}</Text>
                </LinearGradient>
                <View>
                    <Text style={styles.onlineUserName}>{user.name}</Text>
                    <View style={styles.onlineStatus}>
                        <View style={styles.onlineDot} />
                        <Text style={styles.onlineStatusText}>En línea</Text>
                    </View>
                </View>
            </View>
            <View style={styles.callButtons}>
                <TouchableOpacity
                    style={[styles.callIconButton, styles.audioCallButton]}
                    onPress={onCallAudio}
                >
                    <Ionicons name="call" size={20} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.callIconButton, styles.videoCallButton]}
                    onPress={onCallVideo}
                >
                    <Ionicons name="videocam" size={20} color="#FFFFFF" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export const CallsScreen: React.FC = () => {
    const { user } = useAuth();
    const { isConnected, onlineUsers, startCall, connect } = useCall();
    const [callRequests, setCallRequests] = useState<CallRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'voip' | 'pending' | 'completed'>('voip');
    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    const isAdmin = user?.rfc === 'ADMIN000CONS';

    const loadCallRequests = async (showLoading = true) => {
        if (!isAdmin) return;

        if (showLoading) setIsLoading(true);
        try {
            const status = activeTab === 'completed' ? 'completed' : 'pending';
            const result = await api.getCallRequests(status);
            if (result.data?.callRequests) {
                setCallRequests(result.data.callRequests);
            }
        } catch (error) {
            console.error('Error loading call requests:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            if (activeTab !== 'voip') {
                loadCallRequests();
            } else {
                setIsLoading(false);
            }

            if (isAdmin && activeTab !== 'voip') {
                pollingRef.current = setInterval(() => {
                    loadCallRequests(false);
                }, 10000);
            }

            return () => {
                if (pollingRef.current) {
                    clearInterval(pollingRef.current);
                    pollingRef.current = null;
                }
            };
        }, [isAdmin, activeTab])
    );

    const handleCall = (phone: string) => {
        Linking.openURL(`tel:${phone}`);
    };

    const handleComplete = async (requestId: string) => {
        Alert.alert(
            'Completar solicitud',
            '¿Marcar esta solicitud como completada?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Completar',
                    onPress: async () => {
                        const result = await api.completeCallRequest(requestId);
                        if (!result.error) {
                            loadCallRequests(false);
                        }
                    },
                },
            ]
        );
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        if (activeTab === 'voip') {
            connect().finally(() => setIsRefreshing(false));
        } else {
            loadCallRequests(false);
        }
    };

    const handleVoIPCall = (userId: string, userName: string, type: 'audio' | 'video') => {
        startCall(userId, userName, type);
    };

    // Vista para admin con tabs
    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <LinearGradient
                colors={[colors.backgroundSecondary, colors.background] as [string, string]}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <Text style={styles.title}>Llamadas</Text>
                    <View style={styles.connectionIndicator}>
                        <View style={[styles.connectionDot, isConnected && styles.connectedDot]} />
                        <Text style={styles.connectionText}>
                            {isConnected ? 'Conectado' : 'Desconectado'}
                        </Text>
                    </View>
                </View>

                {isAdmin && (
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'voip' && styles.tabActive]}
                            onPress={() => setActiveTab('voip')}
                        >
                            <Ionicons
                                name="wifi"
                                size={16}
                                color={activeTab === 'voip' ? colors.textPrimary : colors.textMuted}
                            />
                            <Text style={[styles.tabText, activeTab === 'voip' && styles.tabTextActive]}>
                                VoIP
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
                            onPress={() => setActiveTab('pending')}
                        >
                            <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
                                Pendientes
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'completed' && styles.tabActive]}
                            onPress={() => setActiveTab('completed')}
                        >
                            <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
                                Completadas
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </LinearGradient>

            {activeTab === 'voip' ? (
                // Vista de llamadas VoIP
                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            tintColor={colors.primary}
                        />
                    }
                >
                    {/* Info Card */}
                    <View style={styles.infoCard}>
                        <LinearGradient
                            colors={['#667eea', '#764ba2'] as [string, string]}
                            style={styles.infoIconContainer}
                        >
                            <Ionicons name="call" size={24} color="#FFFFFF" />
                        </LinearGradient>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoTitle}>Llamadas por Internet</Text>
                            <Text style={styles.infoText}>
                                Llama a otros usuarios conectados sin usar minutos de tu plan.
                            </Text>
                        </View>
                    </View>

                    {/* Lista de usuarios en línea */}
                    <Text style={styles.sectionTitle}>
                        Usuarios en línea ({onlineUsers.length})
                    </Text>

                    {onlineUsers.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="people-outline" size={64} color={colors.textMuted} />
                            <Text style={styles.emptyText}>No hay usuarios conectados</Text>
                            <Text style={styles.emptySubtext}>
                                Los usuarios aparecerán aquí cuando estén en línea
                            </Text>
                        </View>
                    ) : (
                        onlineUsers.map((onlineUser) => (
                            <OnlineUserItem
                                key={onlineUser.userId}
                                user={onlineUser}
                                onCallAudio={() => handleVoIPCall(onlineUser.userId, onlineUser.name, 'audio')}
                                onCallVideo={() => handleVoIPCall(onlineUser.userId, onlineUser.name, 'video')}
                            />
                        ))
                    )}
                </ScrollView>
            ) : isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Cargando solicitudes...</Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            tintColor={colors.primary}
                        />
                    }
                >
                    {callRequests.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons
                                name={activeTab === 'pending' ? 'call-outline' : 'checkmark-circle-outline'}
                                size={64}
                                color={colors.textMuted}
                            />
                            <Text style={styles.emptyText}>
                                {activeTab === 'pending'
                                    ? 'No hay solicitudes pendientes'
                                    : 'No hay solicitudes completadas'}
                            </Text>
                        </View>
                    ) : (
                        callRequests.map((request) => (
                            <CallRequestItem
                                key={request.id}
                                request={request}
                                onCall={handleCall}
                                onComplete={handleComplete}
                            />
                        ))
                    )}
                </ScrollView>
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
        paddingHorizontal: 20,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    connectionIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.surface,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    connectionDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.error,
    },
    connectedDot: {
        backgroundColor: colors.success,
    },
    connectionText: {
        fontSize: 12,
        color: colors.textMuted,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        gap: 6,
        borderRadius: 10,
    },
    tabActive: {
        backgroundColor: colors.primary,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textMuted,
    },
    tabTextActive: {
        color: colors.textPrimary,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
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
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 60,
    },
    emptyText: {
        fontSize: 16,
        color: colors.textMuted,
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: colors.textMuted,
        marginTop: 8,
        textAlign: 'center',
    },
    // Info Card
    infoCard: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        alignItems: 'center',
    },
    infoIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoContent: {
        flex: 1,
        marginLeft: 14,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    infoText: {
        fontSize: 13,
        color: colors.textMuted,
        lineHeight: 18,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 16,
    },
    // Online User Item
    onlineUserItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
    },
    onlineUserInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    onlineUserAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    onlineUserInitials: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    onlineUserName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    onlineStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    onlineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.success,
        marginRight: 6,
    },
    onlineStatusText: {
        fontSize: 12,
        color: colors.success,
    },
    callButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    callIconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    audioCallButton: {
        backgroundColor: colors.success,
    },
    videoCallButton: {
        backgroundColor: '#667eea',
    },
    // Request Item Styles
    requestItem: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#E53935',
    },
    requestHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    requestAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    requestInfo: {
        flex: 1,
        marginLeft: 12,
    },
    requestName: {
        fontSize: 17,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    requestPhone: {
        fontSize: 15,
        color: colors.primary,
        marginTop: 2,
    },
    requestTime: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 4,
    },
    emergencyContainer: {
        backgroundColor: colors.background,
        borderRadius: 10,
        padding: 12,
        marginTop: 12,
    },
    emergencyLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textMuted,
        marginBottom: 4,
    },
    emergencyText: {
        fontSize: 14,
        color: colors.textPrimary,
        lineHeight: 20,
    },
    requestActions: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 12,
    },
    callNowButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E53935',
        borderRadius: 10,
        paddingVertical: 12,
        gap: 6,
    },
    callNowText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 15,
    },
    completeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
        borderRadius: 10,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: colors.success,
        gap: 6,
    },
    completeText: {
        color: colors.success,
        fontWeight: '600',
        fontSize: 15,
    },
});

export default CallsScreen;
