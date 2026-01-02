import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { api, CallRequest } from '../api';
import colors, { gradients } from '../theme/colors';

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

export const CallsScreen: React.FC = () => {
    const { user } = useAuth();
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
            const result = await api.getCallRequests(activeTab);
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

            // Polling cada 10 segundos para nuevas solicitudes
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

    // Vista para usuarios normales
    if (!isAdmin) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" />

                <LinearGradient
                    colors={[colors.backgroundSecondary, colors.background] as [string, string]}
                    style={styles.header}
                >
                    <View style={styles.headerContent}>
                        <Text style={styles.title}>Llamadas</Text>
                    </View>
                </LinearGradient>

                <View style={styles.userInfoContainer}>
                    <View style={styles.userInfoCard}>
                        <LinearGradient
                            colors={['#E53935', '#C62828'] as [string, string]}
                            style={styles.phoneIconContainer}
                        >
                            <Ionicons name="call" size={32} color="#FFFFFF" />
                        </LinearGradient>
                        <Text style={styles.userInfoTitle}>¿Necesitas ayuda urgente?</Text>
                        <Text style={styles.userInfoText}>
                            Para solicitar una llamada, abre el chat con el consultor y presiona el botón rojo de llamada.
                        </Text>
                        <Text style={styles.userInfoSubtext}>
                            Un consultor te contactará lo antes posible.
                        </Text>
                    </View>
                </View>
            </View>
        );
    }

    // Vista para admin
    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <LinearGradient
                colors={[colors.backgroundSecondary, colors.background] as [string, string]}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <Text style={styles.title}>Solicitudes de Llamada</Text>
                </View>

                <View style={styles.tabContainer}>
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
            </LinearGradient>

            {isLoading ? (
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
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    tabActive: {
        backgroundColor: colors.primary,
    },
    tabText: {
        fontSize: 15,
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
        paddingTop: 100,
    },
    emptyText: {
        fontSize: 16,
        color: colors.textMuted,
        marginTop: 16,
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
    // User info styles (for non-admin)
    userInfoContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    userInfoCard: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 32,
        alignItems: 'center',
        width: '100%',
    },
    phoneIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    userInfoTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: 12,
        textAlign: 'center',
    },
    userInfoText: {
        fontSize: 15,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 12,
    },
    userInfoSubtext: {
        fontSize: 14,
        color: colors.textMuted,
        textAlign: 'center',
    },
});

export default CallsScreen;
