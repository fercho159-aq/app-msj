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
import { useTheme } from '../context/ThemeContext';
import { api, CallRequest } from '../api';

interface CallRequestItemProps {
    request: CallRequest;
    onCall: (phone: string) => void;
    onComplete: (id: string) => void;
    colors: any;
}

const CallRequestItem: React.FC<CallRequestItemProps> = ({ request, onCall, onComplete, colors }) => {
    const formatDate = (dateString: string) => {
        try {
            const date = parseISO(dateString);
            return format(date, "dd MMM, HH:mm", { locale: es });
        } catch {
            return dateString;
        }
    };

    return (
        <View style={[styles.requestItem, { backgroundColor: colors.surface }]}>
            <View style={styles.requestHeader}>
                <LinearGradient
                    colors={['#E53935', '#C62828'] as [string, string]}
                    style={styles.requestAvatar}
                >
                    <Ionicons name="call" size={20} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.requestInfo}>
                    <Text style={[styles.requestName, { color: colors.textPrimary }]}>{request.name}</Text>
                    <Text style={[styles.requestPhone, { color: colors.primary }]}>{request.phone}</Text>
                    <Text style={[styles.requestTime, { color: colors.textMuted }]}>{formatDate(request.created_at)}</Text>
                </View>
            </View>

            <View style={[styles.emergencyContainer, { backgroundColor: colors.background }]}>
                <Text style={[styles.emergencyLabel, { color: colors.textMuted }]}>Motivo:</Text>
                <Text style={[styles.emergencyText, { color: colors.textPrimary }]}>{request.emergency}</Text>
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
                    style={[styles.completeButton, { backgroundColor: colors.background, borderColor: colors.success }]}
                    onPress={() => onComplete(request.id)}
                >
                    <Ionicons name="checkmark" size={18} color={colors.success} />
                    <Text style={[styles.completeText, { color: colors.success }]}>Completado</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

// Componente para usuarios en línea
interface OnlineUserItemProps {
    user: { id: string; name: string };
    onCallAudio: () => void;
    onCallVideo: () => void;
    colors: any;
}

const OnlineUserItem: React.FC<OnlineUserItemProps> = ({ user, onCallAudio, onCallVideo, colors }) => {
    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <View style={[styles.onlineUserItem, { backgroundColor: colors.surface }]}>
            <View style={styles.onlineUserInfo}>
                <LinearGradient
                    colors={['#667eea', '#764ba2'] as [string, string]}
                    style={styles.onlineUserAvatar}
                >
                    <Text style={styles.onlineUserInitials}>{getInitials(user.name)}</Text>
                </LinearGradient>
                <View>
                    <Text style={[styles.onlineUserName, { color: colors.textPrimary }]}>{user.name}</Text>
                    <View style={styles.onlineStatus}>
                        <View style={[styles.onlineDot, { backgroundColor: colors.success }]} />
                        <Text style={[styles.onlineStatusText, { color: colors.success }]}>En línea</Text>
                    </View>
                </View>
            </View>
            <View style={styles.callButtons}>
                <TouchableOpacity
                    style={[styles.callIconButton, { backgroundColor: colors.success }]}
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
    const { colors, isDark } = useTheme();
    const { isConnected, onlineUsers, startCall, connect } = useCall();
    const [callRequests, setCallRequests] = useState<CallRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
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
            loadCallRequests();

            if (isAdmin) {
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
        loadCallRequests(false);
    };

    const handleVoIPCall = (userId: string, userName: string, type: 'audio' | 'video') => {
        startCall(userId, userName, type);
    };

    // Vista para admin con tabs
    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            <LinearGradient
                colors={[colors.backgroundSecondary, colors.background] as [string, string]}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <Text style={[styles.title, { color: colors.textPrimary }]}>Llamadas</Text>
                    <View style={[styles.connectionIndicator, { backgroundColor: colors.surface }]}>
                        <View style={[styles.connectionDot, { backgroundColor: colors.error }, isConnected && { backgroundColor: colors.success }]} />
                        <Text style={[styles.connectionText, { color: colors.textMuted }]}>
                            {isConnected ? 'Conectado' : 'Desconectado'}
                        </Text>
                    </View>
                </View>

                {isAdmin && (
                    <View style={[styles.tabContainer, { backgroundColor: colors.surface }]}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'pending' && [styles.tabActive, { backgroundColor: colors.primary }]]}
                            onPress={() => setActiveTab('pending')}
                        >
                            <Ionicons
                                name="time-outline"
                                size={16}
                                color={activeTab === 'pending' ? colors.background : colors.textMuted}
                            />
                            <Text style={[styles.tabText, { color: colors.textMuted }, activeTab === 'pending' && { color: colors.background }]}>
                                Pendientes
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'completed' && [styles.tabActive, { backgroundColor: colors.primary }]]}
                            onPress={() => setActiveTab('completed')}
                        >
                            <Ionicons
                                name="checkmark-circle-outline"
                                size={16}
                                color={activeTab === 'completed' ? colors.background : colors.textMuted}
                            />
                            <Text style={[styles.tabText, { color: colors.textMuted }, activeTab === 'completed' && { color: colors.background }]}>
                                Completadas
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </LinearGradient>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textMuted }]}>Cargando solicitudes...</Text>
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
                            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
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
                                colors={colors}
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
    },
    connectionIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    connectionDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    connectionText: {
        fontSize: 12,
    },
    tabContainer: {
        flexDirection: 'row',
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
    tabActive: {},
    tabText: {
        fontSize: 14,
        fontWeight: '500',
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
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 60,
    },
    emptyText: {
        fontSize: 16,
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
    },
    // Info Card
    infoCard: {
        flexDirection: 'row',
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
        marginBottom: 4,
    },
    infoText: {
        fontSize: 13,
        lineHeight: 18,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
    },
    // Online User Item
    onlineUserItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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
        marginRight: 6,
    },
    onlineStatusText: {
        fontSize: 12,
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
    videoCallButton: {
        backgroundColor: '#667eea',
    },
    // Request Item Styles
    requestItem: {
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
    },
    requestPhone: {
        fontSize: 15,
        marginTop: 2,
    },
    requestTime: {
        fontSize: 12,
        marginTop: 4,
    },
    emergencyContainer: {
        borderRadius: 10,
        padding: 12,
        marginTop: 12,
    },
    emergencyLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 4,
    },
    emergencyText: {
        fontSize: 14,
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
        borderRadius: 10,
        paddingVertical: 12,
        borderWidth: 1,
        gap: 6,
    },
    completeText: {
        fontWeight: '600',
        fontSize: 15,
    },
});

export default CallsScreen;
