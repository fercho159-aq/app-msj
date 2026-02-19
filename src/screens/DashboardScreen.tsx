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
let LineChart: any,
    BarChart: any,
    PieChart: any,
    Line: any,
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
    LineChart = recharts.LineChart;
    BarChart = recharts.BarChart;
    PieChart = recharts.PieChart;
    Line = recharts.Line;
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

const PIE_COLORS = ['#5C76B2', '#7A93C8', '#97B1DE', '#b0c4ef', '#c5d9ed', '#d9e8f5'];

export const DashboardScreen: React.FC = () => {
    const { user } = useAuth();
    const { colors, isDark, gradients } = useTheme();
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

    // Format date labels for charts
    const formatDateLabel = (dateStr: string) => {
        const parts = dateStr.split('-');
        return `${parts[1]}/${parts[2]}`;
    };

    const pendingCallRequests = summary?.callRequests.byStatus.find(s => s.status === 'pending')?.count || 0;
    const pendingReports = summary?.reports.byStatus.find(s => s.status === 'pending')?.count || 0;

    if (Platform.OS !== 'web') {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>Dashboard solo disponible en web</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            <LinearGradient
                colors={[colors.backgroundSecondary, colors.background] as [string, string]}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <Text style={[styles.title, { color: colors.textPrimary }]}>Dashboard</Text>
                    <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                        Bienvenido, {user?.name || 'Consultor'}
                    </Text>
                </View>
            </LinearGradient>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textMuted }]}>Cargando dashboard...</Text>
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
                    {/* KPI Cards */}
                    <View style={styles.kpiRow}>
                        <StatCard
                            title="Total Usuarios"
                            value={summary?.users.total || 0}
                            icon="people"
                            color={colors.primary}
                        />
                        <StatCard
                            title="Total Mensajes"
                            value={summary?.messages.total || 0}
                            icon="chatbubble-ellipses"
                            color="#7A93C8"
                        />
                        <StatCard
                            title="Llamadas Pendientes"
                            value={pendingCallRequests}
                            icon="call"
                            color="#E57373"
                        />
                        <StatCard
                            title="Reportes Pendientes"
                            value={pendingReports}
                            icon="warning"
                            color="#FFB74D"
                        />
                    </View>

                    {/* Messages per day - Line Chart */}
                    <ChartContainer
                        title="Mensajes por dia"
                        rightContent={<PeriodSelector selected={period} onChange={handlePeriodChange} />}
                    >
                        {activity && activity.messages.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <LineChart data={activity.messages.map(d => ({ ...d, label: formatDateLabel(d.date) }))}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={colors.divider} />
                                    <XAxis dataKey="label" tick={{ fill: colors.textMuted, fontSize: 11 }} />
                                    <YAxis tick={{ fill: colors.textMuted, fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8 }}
                                        labelStyle={{ color: colors.textPrimary }}
                                    />
                                    <Line type="monotone" dataKey="count" stroke={colors.primary} strokeWidth={2} dot={{ r: 3 }} name="Mensajes" />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <Text style={[styles.noData, { color: colors.textMuted }]}>Sin datos para este periodo</Text>
                        )}
                    </ChartContainer>

                    {/* New users per day - Bar Chart */}
                    <ChartContainer title="Nuevos Usuarios por dia">
                        {activity && activity.newUsers.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={activity.newUsers.map(d => ({ ...d, label: formatDateLabel(d.date) }))}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={colors.divider} />
                                    <XAxis dataKey="label" tick={{ fill: colors.textMuted, fontSize: 11 }} />
                                    <YAxis tick={{ fill: colors.textMuted, fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8 }}
                                        labelStyle={{ color: colors.textPrimary }}
                                    />
                                    <Bar dataKey="count" fill={colors.primary} radius={[4, 4, 0, 0]} name="Usuarios" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <Text style={[styles.noData, { color: colors.textMuted }]}>Sin datos para este periodo</Text>
                        )}
                    </ChartContainer>

                    {/* Message types - Pie Chart */}
                    <ChartContainer title="Tipos de Mensaje">
                        {summary && summary.messages.byType.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <PieChart>
                                    <Pie
                                        data={summary.messages.byType.map(t => ({ name: t.type, value: t.count }))}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        dataKey="value"
                                        label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {summary.messages.byType.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8 }}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <Text style={[styles.noData, { color: colors.textMuted }]}>Sin datos</Text>
                        )}
                    </ChartContainer>

                    {/* User roles - Pie Chart */}
                    <ChartContainer title="Roles de Usuario">
                        {summary && summary.users.byRole.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <PieChart>
                                    <Pie
                                        data={summary.users.byRole.map(r => ({ name: r.role, value: r.count }))}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        dataKey="value"
                                        label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {summary.users.byRole.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8 }}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <Text style={[styles.noData, { color: colors.textMuted }]}>Sin datos</Text>
                        )}
                    </ChartContainer>

                    {/* Call summary - Bar Chart */}
                    <ChartContainer title="Resumen de Llamadas">
                        {summary && (summary.callRequests.byStatus.length > 0 || summary.callHistory.byStatus.length > 0) ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart
                                    data={[
                                        ...summary.callRequests.byStatus.map(s => ({
                                            name: `Solicitud ${s.status}`,
                                            count: s.count,
                                        })),
                                        ...summary.callHistory.byStatus.map(s => ({
                                            name: `Llamada ${s.status}`,
                                            count: s.count,
                                        })),
                                    ]}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke={colors.divider} />
                                    <XAxis dataKey="name" tick={{ fill: colors.textMuted, fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                                    <YAxis tick={{ fill: colors.textMuted, fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8 }}
                                        labelStyle={{ color: colors.textPrimary }}
                                    />
                                    <Bar dataKey="count" fill="#7A93C8" radius={[4, 4, 0, 0]} name="Cantidad" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <Text style={[styles.noData, { color: colors.textMuted }]}>Sin datos</Text>
                        )}
                    </ChartContainer>

                    {/* Moderation cards */}
                    <ChartContainer title="Moderacion">
                        <View style={styles.moderationRow}>
                            {summary?.reports.byStatus.map(s => (
                                <View
                                    key={s.status}
                                    style={[styles.moderationCard, { backgroundColor: colors.background }]}
                                >
                                    <Text style={[styles.moderationValue, { color: colors.textPrimary }]}>{s.count}</Text>
                                    <Text style={[styles.moderationLabel, { color: colors.textMuted }]}>{s.status}</Text>
                                </View>
                            ))}
                            <View style={[styles.moderationCard, { backgroundColor: colors.background }]}>
                                <Text style={[styles.moderationValue, { color: colors.textPrimary }]}>{summary?.blockedUsers || 0}</Text>
                                <Text style={[styles.moderationLabel, { color: colors.textMuted }]}>bloqueados</Text>
                            </View>
                        </View>
                    </ChartContainer>

                    {/* Users media table */}
                    <UserMediaTable />

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
    header: {
        paddingTop: 50,
        paddingBottom: 16,
        paddingHorizontal: 20,
    },
    headerContent: {
        flexDirection: 'column',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 14,
        marginTop: 4,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    kpiRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    noData: {
        textAlign: 'center',
        paddingVertical: 40,
        fontSize: 14,
    },
    moderationRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    moderationCard: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        alignItems: 'center',
        minWidth: 90,
    },
    moderationValue: {
        fontSize: 20,
        fontWeight: '700',
    },
    moderationLabel: {
        fontSize: 12,
        marginTop: 4,
        textTransform: 'capitalize',
    },
    bottomSpacer: {
        height: 40,
    },
});
