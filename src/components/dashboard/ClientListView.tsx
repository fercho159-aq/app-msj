import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TextInput, FlatList, ActivityIndicator, StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../api/client';
import { ClientRow } from './ClientRow';
import { CreateClientModal } from './CreateClientModal';
import type { ClientRow as ClientRowType } from '../../types';

interface ClientListViewProps {
    onSelectClient: (client: ClientRowType) => void;
}

export const ClientListView: React.FC<ClientListViewProps> = ({ onSelectClient }) => {
    const { colors, isDark } = useTheme();
    const [clients, setClients] = useState<ClientRowType[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const loadClients = useCallback(async (p: number, s: string) => {
        setIsLoading(true);
        try {
            const result = await api.getProjectClients(p, 20, s || undefined);
            if (result.data) {
                setClients(result.data.clients);
                setTotal(result.data.total);
            }
        } catch (error) {
            console.error('Error loading clients:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
            loadClients(1, search);
        }, 400);
        return () => clearTimeout(timer);
    }, [search, loadClients]);

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        loadClients(newPage, search);
    };

    const totalPages = Math.ceil(total / 20);

    return (
        <View style={styles.container}>
            {/* Search Bar + Create Button */}
            <View style={styles.toolbarRow}>
                <View style={[styles.searchBar, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.95)',
                    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                }]}>
                    <Ionicons name="search-outline" size={18} color={colors.textMuted} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.textPrimary }]}
                        placeholder="Buscar por RFC, nombre o razon social..."
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
                <TouchableOpacity
                    style={[styles.createButton, { backgroundColor: colors.primary }]}
                    onPress={() => setShowCreateModal(true)}
                >
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.createButtonText}>Nuevo Cliente</Text>
                </TouchableOpacity>
            </View>

            {/* Header Row */}
            <View style={[styles.headerRow, {
                borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            }]}>
                <View style={{ width: 48 }} />
                <Text style={[styles.headerCell, { color: colors.textMuted, flex: 1 }]}>Cliente</Text>
                <Text style={[styles.headerCell, { color: colors.textMuted, flex: 1 }]}>Regimen</Text>
                <Text style={[styles.headerCell, { color: colors.textMuted, width: 120, textAlign: 'right' }]}>Proyectos</Text>
                <View style={{ width: 16 }} />
            </View>

            {/* List */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                </View>
            ) : clients.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="people-outline" size={40} color={colors.textMuted} />
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                        {search ? 'Sin resultados' : 'No hay clientes'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={clients}
                    keyExtractor={item => item.id}
                    renderItem={({ item, index }) => (
                        <ClientRow client={item} index={index} onPress={onSelectClient} />
                    )}
                    style={styles.list}
                />
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <View style={[styles.pagination, {
                    borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                }]}>
                    <Text style={[styles.pageInfo, { color: colors.textMuted }]}>
                        {total} clientes
                    </Text>
                    <View style={styles.pageButtons}>
                        <TouchableOpacity
                            onPress={() => handlePageChange(page - 1)}
                            disabled={page <= 1}
                            style={[styles.pageBtn, page <= 1 && { opacity: 0.3 }]}
                        >
                            <Ionicons name="chevron-back" size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                        <Text style={[styles.pageText, { color: colors.textPrimary }]}>
                            {page} / {totalPages}
                        </Text>
                        <TouchableOpacity
                            onPress={() => handlePageChange(page + 1)}
                            disabled={page >= totalPages}
                            style={[styles.pageBtn, page >= totalPages && { opacity: 0.3 }]}
                        >
                            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <CreateClientModal
                visible={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreated={() => {
                    setShowCreateModal(false);
                    setPage(1);
                    loadClients(1, search);
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    toolbarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        margin: 16,
        marginBottom: 0,
    },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        fontWeight: '500',
        outlineStyle: 'none',
    } as any,
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 1,
        gap: 12,
    },
    headerCell: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    list: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
        gap: 12,
    },
    emptyText: {
        fontSize: 13,
        fontWeight: '500',
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderTopWidth: 1,
    },
    pageInfo: {
        fontSize: 12,
        fontWeight: '500',
    },
    pageButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    pageBtn: {
        padding: 4,
    },
    pageText: {
        fontSize: 12,
        fontWeight: '600',
    },
});
