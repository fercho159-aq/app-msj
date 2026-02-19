import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../api/client';
import type { UserMediaRow } from '../../types';

const getInitials = (name: string | null, rfc: string) => {
    if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return rfc.slice(0, 2).toUpperCase();
};

export const UserMediaTable: React.FC = () => {
    const { colors, isDark } = useTheme();
    const [users, setUsers] = useState<UserMediaRow[]>([]);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const limit = 15;

    const fetchData = useCallback(async (p: number, s: string) => {
        setLoading(true);
        try {
            const result = await api.getDashboardUsersMedia(p, limit, s || undefined);
            if (result.data) {
                setUsers(result.data.users);
                setTotalPages(Math.ceil(result.data.total / result.data.limit) || 1);
                setTotalCount(result.data.total);
            }
        } catch (error) {
            console.error('Error fetching users media:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(page, search);
    }, [page, fetchData]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
            fetchData(1, search);
        }, 400);
        return () => clearTimeout(timer);
    }, [search, fetchData]);

    const maxTotal = Math.max(...users.map(u => u.total), 1);

    const renderRow = ({ item, index }: { item: UserMediaRow; index: number }) => (
        <View
            style={[
                styles.row,
                { borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' },
                index % 2 === 0 && {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)',
                },
            ]}
        >
            {/* Avatar */}
            <View style={styles.avatarCell}>
                <LinearGradient
                    colors={isDark ? ['#5C76B2', '#97B1DE'] as [string, string] : ['#7A93C8', '#5C76B2'] as [string, string]}
                    style={styles.avatar}
                >
                    <Text style={styles.avatarText}>{getInitials(item.name, item.rfc)}</Text>
                </LinearGradient>
            </View>

            {/* User info */}
            <View style={styles.userCell}>
                <Text style={[styles.userName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {item.name || item.rfc}
                </Text>
                <Text style={[styles.userRfc, { color: colors.textMuted }]} numberOfLines={1}>
                    {item.rfc}
                </Text>
            </View>

            {/* Media counts */}
            <View style={styles.mediaCell}>
                <View style={styles.mediaBadge}>
                    <Ionicons name="image-outline" size={12} color={colors.textMuted} />
                    <Text style={[styles.mediaCount, { color: colors.textSecondary }]}>{item.images}</Text>
                </View>
            </View>
            <View style={styles.mediaCell}>
                <View style={styles.mediaBadge}>
                    <Ionicons name="videocam-outline" size={12} color={colors.textMuted} />
                    <Text style={[styles.mediaCount, { color: colors.textSecondary }]}>{item.videos}</Text>
                </View>
            </View>
            <View style={styles.mediaCell}>
                <View style={styles.mediaBadge}>
                    <Ionicons name="document-outline" size={12} color={colors.textMuted} />
                    <Text style={[styles.mediaCount, { color: colors.textSecondary }]}>{item.files}</Text>
                </View>
            </View>

            {/* Total with mini bar */}
            <View style={styles.totalCell}>
                <Text style={[styles.totalValue, { color: colors.textPrimary }]}>{item.total}</Text>
                <View style={[styles.miniBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                    <View
                        style={[
                            styles.miniBarFill,
                            {
                                width: `${Math.max((item.total / maxTotal) * 100, 4)}%`,
                                backgroundColor: colors.primary,
                            },
                        ]}
                    />
                </View>
            </View>
        </View>
    );

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.85)',
                    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                },
            ]}
        >
            {/* Header */}
            <View style={styles.tableHeader}>
                <View style={styles.titleGroup}>
                    <View style={[styles.titleDot, { backgroundColor: '#E57373' }]} />
                    <View>
                        <Text style={[styles.title, { color: colors.textPrimary }]}>Documentos y Fotos por Cliente</Text>
                        <Text style={[styles.titleSub, { color: colors.textMuted }]}>
                            {totalCount} usuario{totalCount !== 1 ? 's' : ''} registrado{totalCount !== 1 ? 's' : ''}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            {/* Search */}
            <View style={styles.searchWrapper}>
                <View
                    style={[
                        styles.searchContainer,
                        {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        },
                    ]}
                >
                    <Ionicons name="search" size={16} color={colors.textMuted} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.textPrimary }]}
                        placeholder="Buscar por nombre o RFC..."
                        placeholderTextColor={colors.textMuted}
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
                            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Column headers */}
            <View style={[styles.columnHeaders, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                <View style={styles.avatarCell} />
                <Text style={[styles.colHeader, styles.userCell, { color: colors.textMuted }]}>USUARIO</Text>
                <Text style={[styles.colHeader, styles.mediaCell, { color: colors.textMuted }]}>IMG</Text>
                <Text style={[styles.colHeader, styles.mediaCell, { color: colors.textMuted }]}>VID</Text>
                <Text style={[styles.colHeader, styles.mediaCell, { color: colors.textMuted }]}>ARCH</Text>
                <Text style={[styles.colHeader, styles.totalCell, { color: colors.textMuted }]}>TOTAL</Text>
            </View>

            {/* Body */}
            {loading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.loaderText, { color: colors.textMuted }]}>Cargando...</Text>
                </View>
            ) : users.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="folder-open-outline" size={36} color={colors.textMuted} />
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>No se encontraron resultados</Text>
                </View>
            ) : (
                <FlatList
                    data={users}
                    renderItem={renderRow}
                    keyExtractor={item => item.id}
                    scrollEnabled={false}
                />
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <View style={[styles.pagination, { borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}>
                    <Text style={[styles.pageInfo, { color: colors.textMuted }]}>
                        Pagina {page} de {totalPages}
                    </Text>
                    <View style={styles.pageButtons}>
                        <TouchableOpacity
                            disabled={page <= 1}
                            onPress={() => setPage(p => p - 1)}
                            style={[
                                styles.pageBtn,
                                {
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                                    opacity: page <= 1 ? 0.35 : 1,
                                },
                            ]}
                        >
                            <Ionicons name="chevron-back" size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            disabled={page >= totalPages}
                            onPress={() => setPage(p => p + 1)}
                            style={[
                                styles.pageBtn,
                                {
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                                    opacity: page >= totalPages ? 0.35 : 1,
                                },
                            ]}
                        >
                            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 14,
        borderWidth: 1,
        overflow: 'hidden',
        ...(Platform.OS === 'web' ? {
            // @ts-ignore
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
        } : {}),
    },
    tableHeader: {
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 14,
    },
    titleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    titleDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    titleSub: {
        fontSize: 12,
        marginTop: 2,
        fontWeight: '500',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginHorizontal: 20,
    },
    searchWrapper: {
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 8,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        gap: 10,
        ...(Platform.OS === 'web' ? {
            // @ts-ignore
            transition: 'border-color 0.2s ease',
        } : {}),
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        padding: 0,
    },
    clearBtn: {
        padding: 2,
    },
    columnHeaders: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    colHeader: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.8,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        ...(Platform.OS === 'web' ? {
            // @ts-ignore
            transition: 'background-color 0.15s ease',
        } : {}),
    },
    avatarCell: {
        width: 40,
        marginRight: 12,
    },
    avatar: {
        width: 34,
        height: 34,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    userCell: {
        flex: 3,
        paddingRight: 12,
    },
    userName: {
        fontSize: 13,
        fontWeight: '600',
    },
    userRfc: {
        fontSize: 11,
        marginTop: 2,
        fontWeight: '500',
    },
    mediaCell: {
        flex: 1,
        alignItems: 'center',
    },
    mediaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    mediaCount: {
        fontSize: 13,
        fontWeight: '600',
    },
    totalCell: {
        flex: 1.5,
        alignItems: 'flex-end',
        gap: 4,
    },
    totalValue: {
        fontSize: 14,
        fontWeight: '800',
    },
    miniBar: {
        width: '100%',
        height: 3,
        borderRadius: 2,
        overflow: 'hidden',
    },
    miniBarFill: {
        height: '100%',
        borderRadius: 2,
    },
    loaderContainer: {
        paddingVertical: 40,
        alignItems: 'center',
        gap: 10,
    },
    loaderText: {
        fontSize: 13,
    },
    emptyContainer: {
        paddingVertical: 40,
        alignItems: 'center',
        gap: 10,
    },
    emptyText: {
        fontSize: 13,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderTopWidth: 1,
    },
    pageInfo: {
        fontSize: 12,
        fontWeight: '500',
    },
    pageButtons: {
        flexDirection: 'row',
        gap: 6,
    },
    pageBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        ...(Platform.OS === 'web' ? {
            // @ts-ignore
            cursor: 'pointer',
            transition: 'opacity 0.15s ease',
        } : {}),
    },
});
