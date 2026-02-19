import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../api/client';
import type { UserMediaRow } from '../../types';

export const UserMediaTable: React.FC = () => {
    const { colors } = useTheme();
    const [users, setUsers] = useState<UserMediaRow[]>([]);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);

    const limit = 20;

    const fetchData = useCallback(async (p: number, s: string) => {
        setLoading(true);
        try {
            const result = await api.getDashboardUsersMedia(p, limit, s || undefined);
            if (result.data) {
                setUsers(result.data.users);
                setTotalPages(Math.ceil(result.data.total / result.data.limit) || 1);
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

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
            fetchData(1, search);
        }, 400);
        return () => clearTimeout(timer);
    }, [search, fetchData]);

    const renderRow = ({ item }: { item: UserMediaRow }) => (
        <View style={[styles.row, { borderBottomColor: colors.divider }]}>
            <View style={styles.userCell}>
                <Text style={[styles.userName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {item.name || item.rfc}
                </Text>
                <Text style={[styles.userRfc, { color: colors.textMuted }]} numberOfLines={1}>
                    {item.rfc}
                </Text>
            </View>
            <Text style={[styles.cell, { color: colors.textSecondary }]}>{item.images}</Text>
            <Text style={[styles.cell, { color: colors.textSecondary }]}>{item.videos}</Text>
            <Text style={[styles.cell, { color: colors.textSecondary }]}>{item.files}</Text>
            <Text style={[styles.cellBold, { color: colors.textPrimary }]}>{item.total}</Text>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Documentos y Fotos por Cliente</Text>

            <View style={[styles.searchContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="search" size={18} color={colors.textMuted} />
                <TextInput
                    style={[styles.searchInput, { color: colors.textPrimary }]}
                    placeholder="Buscar por nombre o RFC..."
                    placeholderTextColor={colors.textMuted}
                    value={search}
                    onChangeText={setSearch}
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')}>
                        <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Table header */}
            <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.headerCell, styles.userCell, { color: colors.textMuted }]}>Usuario</Text>
                <Text style={[styles.headerCell, styles.cell, { color: colors.textMuted }]}>Img</Text>
                <Text style={[styles.headerCell, styles.cell, { color: colors.textMuted }]}>Vid</Text>
                <Text style={[styles.headerCell, styles.cell, { color: colors.textMuted }]}>Arch</Text>
                <Text style={[styles.headerCell, styles.cell, { color: colors.textMuted }]}>Total</Text>
            </View>

            {loading ? (
                <ActivityIndicator style={styles.loader} color={colors.primary} />
            ) : users.length === 0 ? (
                <Text style={[styles.empty, { color: colors.textMuted }]}>No se encontraron resultados</Text>
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
                <View style={styles.pagination}>
                    <TouchableOpacity
                        disabled={page <= 1}
                        onPress={() => setPage(p => p - 1)}
                        style={[styles.pageButton, { opacity: page <= 1 ? 0.4 : 1 }]}
                    >
                        <Ionicons name="chevron-back" size={18} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={[styles.pageText, { color: colors.textSecondary }]}>
                        {page} / {totalPages}
                    </Text>
                    <TouchableOpacity
                        disabled={page >= totalPages}
                        onPress={() => setPage(p => p + 1)}
                        style={[styles.pageButton, { opacity: page >= totalPages ? 0.4 : 1 }]}
                    >
                        <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        marginBottom: 12,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        padding: 0,
    },
    headerRow: {
        flexDirection: 'row',
        paddingVertical: 8,
        borderBottomWidth: 1,
    },
    headerCell: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    userCell: {
        flex: 2,
        paddingRight: 8,
    },
    userName: {
        fontSize: 13,
        fontWeight: '600',
    },
    userRfc: {
        fontSize: 11,
        marginTop: 2,
    },
    cell: {
        flex: 1,
        textAlign: 'center',
        fontSize: 13,
    },
    cellBold: {
        flex: 1,
        textAlign: 'center',
        fontSize: 13,
        fontWeight: '700',
    },
    loader: {
        paddingVertical: 30,
    },
    empty: {
        textAlign: 'center',
        paddingVertical: 30,
        fontSize: 14,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
        gap: 16,
    },
    pageButton: {
        padding: 6,
    },
    pageText: {
        fontSize: 13,
        fontWeight: '500',
    },
});
