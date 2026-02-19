import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    StatusBar,
    ActivityIndicator,
    RefreshControl,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/client';
import { StatCard } from '../components/dashboard/StatCard';
import { ChartContainer } from '../components/dashboard/ChartContainer';
import { PeriodSelector } from '../components/dashboard/PeriodSelector';
import { UserMediaTable } from '../components/dashboard/UserMediaTable';
import type { DashboardSummary, DashboardActivity } from '../types';

// Conditionally import recharts only on web
let AreaChart: any,
    BarChart: any,
    PieChart: any,
    Area: any,
    Bar: any,
    Pie: any,
    Cell: any,
    XAxis: any,
    YAxis: any,
    CartesianGrid: any,
    Tooltip: any,
    ResponsiveContainer: any,
    Legend: any;

if (Platform.OS === 'web') {
    const recharts = require('recharts');
    AreaChart = recharts.AreaChart;
    BarChart = recharts.BarChart;
    PieChart = recharts.PieChart;
    Area = recharts.Area;
    Bar = recharts.Bar;
    Pie = recharts.Pie;
    Cell = recharts.Cell;
    XAxis = recharts.XAxis;
    YAxis = recharts.YAxis;
    CartesianGrid = recharts.CartesianGrid;
    Tooltip = recharts.Tooltip;
    ResponsiveContainer = recharts.ResponsiveContainer;
    Legend = recharts.Legend;
}

// Refined palette for charts
const CHART_COLORS = {
    blue: '#5C76B2',
    blueLight: '#97B1DE',
    slate: '#64748B',
    emerald: '#10B981',
    amber: '#F59E0B',
    rose: '#F43F5E',
    violet: '#8B5CF6',
    cyan: '#06B6D4',
};

const PIE_PALETTE = [CHART_COLORS.blue, CHART_COLORS.emerald, CHART_COLORS.amber, CHART_COLORS.rose, CHART_COLORS.violet, CHART_COLORS.cyan];

export const DashboardScreen: React.FC = () => {
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [activity, setActivity] = useState<DashboardActivity | null>(null);
    const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadData = async (showLoading = true) => {
        if (showLoading) setIsLoading(true);
        try {
            const [summaryResult, activityResult] = await Promise.all([
                api.getDashboardSummary(),
                api.getDashboardActivity(period),
            ]);
            if (summaryResult.data) setSummary(summaryResult.data.summary);
            if (activityResult.data) setActivity(activityResult.data.activity);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [period])
    );

    const handleRefresh = () => {
        setIsRefreshing(true);
        loadData(false);
    };

    const handlePeriodChange = (newPeriod: '7d' | '30d' | '90d') => {
        setPeriod(newPeriod);
    };

    const formatDateLabel = (dateStr: string) => {
        const parts = dateStr.split('-');
        return `${parts[1]}/${parts[2]}`;
    };

    const pendingCallRequests = summary?.callRequests.byStatus.find(s => s.status === 'pending')?.count || 0;
    const pendingReports = summary?.reports.byStatus.find(s => s.status === 'pending')?.count || 0;

    const tooltipStyle = {
        backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
        borderRadius: 10,
        padding: '10px 14px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        fontSize: 12,
    };

    const axisStyle = { fill: colors.textMuted, fontSize: 10, fontWeight: 500 };
    const gridColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';

    if (Platform.OS !== 'web') {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Text style={[styles.fallbackText, { color: colors.textPrimary }]}>
                    Dashboard solo disponible en web
                </Text>
            </View>
        );
    }

    // Current date formatted
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0a0a0a' : '#f0f2f5' }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textMuted }]}>Cargando dashboard...</Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.scroll}
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
                    {/* ═══════ HEADER ═══════ */}
                    <View style={styles.header}>
                        <View style={styles.headerTop}>
                            <View>
                                <Text style={[styles.greeting, { color: colors.textMuted }]}>
                                    {dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}
                                </Text>
                                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                                    Dashboard
                                </Text>
                            </View>
                            <View style={[styles.userBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                <LinearGradient
                                    colors={['#5C76B2', '#97B1DE'] as [string, string]}
                                    style={styles.userAvatar}
                                >
                                    <Text style={styles.userInitial}>
                                        {(user?.name || 'C').charAt(0).toUpperCase()}
                                    </Text>
                                </LinearGradient>
                                <View>
                                    <Text style={[styles.userName, { color: colors.textPrimary }]}>
                                        {user?.name || 'Consultor'}
                                    </Text>
                                    <Text style={[styles.userRole, { color: colors.textMuted }]}>Consultor</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* ═══════ KPI CARDS ═══════ */}
                    <View style={styles.kpiGrid}>
                        <StatCard
                            title="Usuarios"
                            value={summary?.users.total || 0}
                            icon="people"
                            color="#5C76B2"
                            accentGradient={['#5C76B2', '#97B1DE']}
                            subtitle={`${summary?.chats.total || 0} chats activos`}
                        />
                        <StatCard
                            title="Mensajes"
                            value={summary?.messages.total || 0}
                            icon="chatbubble-ellipses"
                            color="#10B981"
                            accentGradient={['#10B981', '#6EE7B7']}
                            subtitle={`${summary?.messages.byType.length || 0} tipos`}
                        />
                        <StatCard
                            title="Llamadas Pend."
                            value={pendingCallRequests}
                            icon="call"
                            color="#F43F5E"
                            accentGradient={['#F43F5E', '#FB7185']}
                            subtitle={`${summary?.callHistory.total || 0} en historial`}
                        />
                        <StatCard
                            title="Reportes Pend."
                            value={pendingReports}
                            icon="shield-checkmark"
                            color="#F59E0B"
                            accentGradient={['#F59E0B', '#FCD34D']}
                            subtitle={`${summary?.blockedUsers || 0} bloqueados`}
                        />
                    </View>

                    {/* ═══════ USERS MEDIA TABLE (PRINCIPAL) ═══════ */}
                    <View style={styles.mainSection}>
                        <UserMediaTable />
                    </View>

                    {/* ═══════ CHARTS ROW 1: Activity ═══════ */}
                    <ChartContainer
                        title="Actividad de Mensajes"
                        subtitle={`Periodo: ${period === '7d' ? 'ultima semana' : period === '30d' ? 'ultimo mes' : 'ultimos 3 meses'}`}
                        rightContent={<PeriodSelector selected={period} onChange={handlePeriodChange} />}
                        fullWidth
                    >
                        {activity && activity.messages.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <AreaChart data={activity.messages.map(d => ({ ...d, label: formatDateLabel(d.date) }))}>
                                    <defs>
                                        <linearGradient id="msgGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={CHART_COLORS.blue} stopOpacity={0.25} />
                                            <stop offset="100%" stopColor={CHART_COLORS.blue} stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                                    <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
                                    <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={40} />
                                    <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: colors.textPrimary, fontWeight: 600 }} />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        stroke={CHART_COLORS.blue}
                                        strokeWidth={2.5}
                                        fill="url(#msgGradient)"
                                        dot={false}
                                        activeDot={{ r: 5, fill: CHART_COLORS.blue, strokeWidth: 2, stroke: '#fff' }}
                                        name="Mensajes"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <View style={styles.noDataContainer}>
                                <Ionicons name="analytics-outline" size={32} color={colors.textMuted} />
                                <Text style={[styles.noData, { color: colors.textMuted }]}>Sin datos para este periodo</Text>
                            </View>
                        )}
                    </ChartContainer>

                    {/* ═══════ CHARTS ROW 2: Two columns ═══════ */}
                    <View style={styles.chartRow}>
                        {/* New users bar chart */}
                        <View style={styles.chartHalf}>
                            <ChartContainer title="Nuevos Usuarios" subtitle="Registros por dia">
                                {activity && activity.newUsers.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={240}>
                                        <BarChart data={activity.newUsers.map(d => ({ ...d, label: formatDateLabel(d.date) }))}>
                                            <defs>
                                                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor={CHART_COLORS.emerald} stopOpacity={0.9} />
                                                    <stop offset="100%" stopColor={CHART_COLORS.emerald} stopOpacity={0.5} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                                            <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
                                            <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={30} />
                                            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: colors.textPrimary, fontWeight: 600 }} />
                                            <Bar dataKey="count" fill="url(#barGradient)" radius={[6, 6, 0, 0]} name="Usuarios" maxBarSize={32} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <View style={styles.noDataContainer}>
                                        <Text style={[styles.noData, { color: colors.textMuted }]}>Sin datos</Text>
                                    </View>
                                )}
                            </ChartContainer>
                        </View>

                        {/* Message types donut */}
                        <View style={styles.chartHalf}>
                            <ChartContainer title="Tipos de Mensaje" subtitle="Distribucion por formato">
                                {summary && summary.messages.byType.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={240}>
                                        <PieChart>
                                            <Pie
                                                data={summary.messages.byType.map(t => ({ name: t.type, value: t.count }))}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={55}
                                                outerRadius={90}
                                                dataKey="value"
                                                paddingAngle={3}
                                                cornerRadius={4}
                                            >
                                                {summary.messages.byType.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={PIE_PALETTE[index % PIE_PALETTE.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={tooltipStyle} />
                                            <Legend
                                                verticalAlign="bottom"
                                                height={36}
                                                iconType="circle"
                                                iconSize={8}
                                                formatter={(value: string) => (
                                                    <span style={{ color: colors.textSecondary, fontSize: 11, fontWeight: 500 }}>{value}</span>
                                                )}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <View style={styles.noDataContainer}>
                                        <Text style={[styles.noData, { color: colors.textMuted }]}>Sin datos</Text>
                                    </View>
                                )}
                            </ChartContainer>
                        </View>
                    </View>

                    {/* ═══════ CHARTS ROW 3: Two columns ═══════ */}
                    <View style={styles.chartRow}>
                        {/* User roles donut */}
                        <View style={styles.chartHalf}>
                            <ChartContainer title="Roles de Usuario" subtitle="Distribucion por tipo">
                                {summary && summary.users.byRole.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={240}>
                                        <PieChart>
                                            <Pie
                                                data={summary.users.byRole.map(r => ({ name: r.role, value: r.count }))}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={55}
                                                outerRadius={90}
                                                dataKey="value"
                                                paddingAngle={3}
                                                cornerRadius={4}
                                            >
                                                {summary.users.byRole.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={PIE_PALETTE[index % PIE_PALETTE.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={tooltipStyle} />
                                            <Legend
                                                verticalAlign="bottom"
                                                height={36}
                                                iconType="circle"
                                                iconSize={8}
                                                formatter={(value: string) => (
                                                    <span style={{ color: colors.textSecondary, fontSize: 11, fontWeight: 500 }}>{value}</span>
                                                )}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <View style={styles.noDataContainer}>
                                        <Text style={[styles.noData, { color: colors.textMuted }]}>Sin datos</Text>
                                    </View>
                                )}
                            </ChartContainer>
                        </View>

                        {/* Call summary */}
                        <View style={styles.chartHalf}>
                            <ChartContainer title="Resumen de Llamadas" subtitle="Solicitudes e historial">
                                {summary && (summary.callRequests.byStatus.length > 0 || summary.callHistory.byStatus.length > 0) ? (
                                    <ResponsiveContainer width="100%" height={240}>
                                        <BarChart
                                            data={[
                                                ...summary.callRequests.byStatus.map(s => ({
                                                    name: s.status,
                                                    Solicitudes: s.count,
                                                    Historial: 0,
                                                })),
                                                ...summary.callHistory.byStatus.map(s => ({
                                                    name: s.status,
                                                    Solicitudes: 0,
                                                    Historial: s.count,
                                                })),
                                            ]}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                                            <XAxis dataKey="name" tick={{ ...axisStyle, fontSize: 9 }} axisLine={false} tickLine={false} />
                                            <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={30} />
                                            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: colors.textPrimary, fontWeight: 600 }} />
                                            <Bar dataKey="Solicitudes" fill={CHART_COLORS.amber} radius={[4, 4, 0, 0]} maxBarSize={24} />
                                            <Bar dataKey="Historial" fill={CHART_COLORS.violet} radius={[4, 4, 0, 0]} maxBarSize={24} />
                                            <Legend
                                                iconType="circle"
                                                iconSize={8}
                                                formatter={(value: string) => (
                                                    <span style={{ color: colors.textSecondary, fontSize: 11, fontWeight: 500 }}>{value}</span>
                                                )}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <View style={styles.noDataContainer}>
                                        <Text style={[styles.noData, { color: colors.textMuted }]}>Sin datos</Text>
                                    </View>
                                )}
                            </ChartContainer>
                        </View>
                    </View>

                    {/* ═══════ MODERATION ═══════ */}
                    <ChartContainer title="Moderacion" subtitle="Estado de reportes y bloqueos" fullWidth>
                        <View style={styles.moderationGrid}>
                            {summary?.reports.byStatus.map(s => {
                                const statusConfig: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
                                    pending: { icon: 'time-outline', color: CHART_COLORS.amber },
                                    reviewed: { icon: 'eye-outline', color: CHART_COLORS.blue },
                                    resolved: { icon: 'checkmark-circle-outline', color: CHART_COLORS.emerald },
                                    dismissed: { icon: 'close-circle-outline', color: CHART_COLORS.slate },
                                };
                                const config = statusConfig[s.status] || { icon: 'help-circle-outline' as any, color: CHART_COLORS.slate };
                                return (
                                    <View
                                        key={s.status}
                                        style={[
                                            styles.modCard,
                                            {
                                                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                                borderColor: `${config.color}25`,
                                            },
                                        ]}
                                    >
                                        <View style={[styles.modIconBg, { backgroundColor: `${config.color}15` }]}>
                                            <Ionicons name={config.icon} size={20} color={config.color} />
                                        </View>
                                        <Text style={[styles.modValue, { color: colors.textPrimary }]}>{s.count}</Text>
                                        <Text style={[styles.modLabel, { color: colors.textMuted }]}>{s.status}</Text>
                                    </View>
                                );
                            })}
                            <View
                                style={[
                                    styles.modCard,
                                    {
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                        borderColor: `${CHART_COLORS.rose}25`,
                                    },
                                ]}
                            >
                                <View style={[styles.modIconBg, { backgroundColor: `${CHART_COLORS.rose}15` }]}>
                                    <Ionicons name="ban-outline" size={20} color={CHART_COLORS.rose} />
                                </View>
                                <Text style={[styles.modValue, { color: colors.textPrimary }]}>{summary?.blockedUsers || 0}</Text>
                                <Text style={[styles.modLabel, { color: colors.textMuted }]}>bloqueados</Text>
                            </View>
                        </View>
                    </ChartContainer>

                    <View style={styles.bottomSpacer} />
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    fallbackText: {
        fontSize: 16,
        textAlign: 'center',
        marginTop: 100,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 14,
    },
    loadingText: {
        fontSize: 13,
        fontWeight: '500',
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
        maxWidth: 1280,
        alignSelf: 'center',
        width: '100%',
    },

    // Header
    header: {
        paddingTop: 32,
        paddingBottom: 8,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    greeting: {
        fontSize: 13,
        fontWeight: '500',
        textTransform: 'capitalize',
        marginBottom: 4,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: -0.8,
    },
    userBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
        paddingRight: 16,
        borderRadius: 50,
    },
    userAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    userInitial: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    userName: {
        fontSize: 13,
        fontWeight: '600',
    },
    userRole: {
        fontSize: 11,
        fontWeight: '500',
    },

    // KPI Grid
    kpiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 14,
        marginTop: 20,
        marginBottom: 20,
    },

    // Main section (user table)
    mainSection: {
        marginBottom: 24,
    },

    // Charts
    chartRow: {
        flexDirection: 'row',
        gap: 14,
        marginBottom: 14,
    },
    chartHalf: {
        flex: 1,
    },

    noDataContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        gap: 10,
    },
    noData: {
        fontSize: 13,
        fontWeight: '500',
    },

    // Moderation
    moderationGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    modCard: {
        flex: 1,
        minWidth: 120,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        gap: 8,
    },
    modIconBg: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modValue: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    modLabel: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'capitalize',
        letterSpacing: 0.3,
    },

    bottomSpacer: {
        height: 60,
    },
});
