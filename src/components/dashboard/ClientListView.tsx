import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TextInput, FlatList, ActivityIndicator, StyleSheet,
    TouchableOpacity, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../api/client';
import { ClientRow } from './ClientRow';
import { CreateClientModal } from './CreateClientModal';
import type { ClientRow as ClientRowType } from '../../types';

interface DeletedClient {
    id: string;
    rfc: string;
    name: string | null;
    razon_social: string | null;
    deleted_at: string;
    days_remaining: number;
}

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
    const [showTrash, setShowTrash] = useState(false);
    const [deletedClients, setDeletedClients] = useState<DeletedClient[]>([]);
    const [isLoadingTrash, setIsLoadingTrash] = useState(false);

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

    const loadDeletedClients = useCallback(async () => {
        setIsLoadingTrash(true);
        try {
            const result = await api.getDeletedClients();
            if (result.data) {
                setDeletedClients(result.data.clients);
            }
        } catch (error) {
            console.error('Error loading deleted clients:', error);
        } finally {
            setIsLoadingTrash(false);
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

    const confirmDelete = (client: ClientRowType) => {
        if (Platform.OS === 'web') {
            const confirmed = window.confirm(
                `¿Eliminar a ${client.name || client.razon_social || client.rfc}?\n\nEl cliente se moverá a la papelera y se eliminará permanentemente después de 3 días.`
            );
            if (confirmed) handleDelete(client);
        } else {
            Alert.alert(
                'Eliminar cliente',
                `¿Eliminar a ${client.name || client.razon_social || client.rfc}?\n\nEl cliente se moverá a la papelera y se eliminará permanentemente después de 3 días.`,
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Eliminar', style: 'destructive', onPress: () => handleDelete(client) },
                ]
            );
        }
    };

    const handleDelete = async (client: ClientRowType) => {
        const result = await api.deleteClient(client.id);
        if (result.data?.success) {
            loadClients(page, search);
            if (showTrash) loadDeletedClients();
        }
    };

    const confirmRestore = (client: DeletedClient) => {
        if (Platform.OS === 'web') {
            const confirmed = window.confirm(
                `¿Restaurar a ${client.name || client.razon_social || client.rfc}?`
            );
            if (confirmed) handleRestore(client.id);
        } else {
            Alert.alert(
                'Restaurar cliente',
                `¿Restaurar a ${client.name || client.razon_social || client.rfc}?`,
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Restaurar', onPress: () => handleRestore(client.id) },
                ]
            );
        }
    };

    const handleRestore = async (clientId: string) => {
        const result = await api.restoreClient(clientId);
        if (result.data?.success) {
            loadDeletedClients();
            loadClients(page, search);
        }
    };

    const handleToggleTrash = () => {
        if (!showTrash) loadDeletedClients();
        setShowTrash(!showTrash);
    };

    const totalPages = Math.ceil(total / 20);

    return (
        <View style={styles.container}>
            {/* Search Bar + Buttons */}
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
                    style={[styles.trashButton, {
                        backgroundColor: showTrash ? '#E54D4D20' : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'),
                        borderColor: showTrash ? '#E54D4D40' : 'transparent',
                    }]}
                    onPress={handleToggleTrash}
                >
                    <Ionicons name="trash-outline" size={18} color={showTrash ? '#E54D4D' : colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.createButton, { backgroundColor: colors.primary }]}
                    onPress={() => setShowCreateModal(true)}
                >
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.createButtonText}>Nuevo Cliente</Text>
                </TouchableOpacity>
            </View>

            {/* Trash Section */}
            {showTrash && (
                <View style={[styles.trashSection, {
                    backgroundColor: isDark ? 'rgba(229,77,77,0.06)' : 'rgba(229,77,77,0.04)',
                    borderColor: isDark ? 'rgba(229,77,77,0.15)' : 'rgba(229,77,77,0.1)',
                }]}>
                    <View style={styles.trashHeader}>
                        <Ionicons name="trash" size={16} color="#E54D4D" />
                        <Text style={[styles.trashTitle, { color: '#E54D4D' }]}>
                            Papelera ({deletedClients.length})
                        </Text>
                        <Text style={[styles.trashSubtitle, { color: colors.textMuted }]}>
                            Los clientes se eliminan permanentemente después de 3 días
                        </Text>
                    </View>
                    {isLoadingTrash ? (
                        <ActivityIndicator size="small" color="#E54D4D" style={{ padding: 12 }} />
                    ) : deletedClients.length === 0 ? (
                        <Text style={[styles.trashEmpty, { color: colors.textMuted }]}>Papelera vacía</Text>
                    ) : (
                        deletedClients.map(client => (
                            <View key={client.id} style={[styles.trashRow, {
                                borderTopColor: isDark ? 'rgba(229,77,77,0.1)' : 'rgba(229,77,77,0.08)',
                            }]}>
                                <View style={styles.trashRowInfo}>
                                    <Text style={[styles.trashRowName, { color: colors.textPrimary }]}>
                                        {client.name || client.razon_social || 'Sin nombre'}
                                    </Text>
                                    <Text style={[styles.trashRowRfc, { color: colors.textMuted }]}>
                                        {client.rfc}
                                    </Text>
                                </View>
                                <Text style={[styles.trashDays, { color: '#E54D4D' }]}>
                                    {client.days_remaining > 0 ? `${client.days_remaining}d restantes` : 'Por eliminar'}
                                </Text>
                                <TouchableOpacity
                                    style={styles.restoreButton}
                                    onPress={() => confirmRestore(client)}
                                >
                                    <Ionicons name="arrow-undo-outline" size={16} color={colors.primary} />
                                    <Text style={[styles.restoreText, { color: colors.primary }]}>Restaurar</Text>
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </View>
            )}

            {/* Header Row */}
            <View style={[styles.headerRow, {
                borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            }]}>
                <View style={{ width: 48 }} />
                <Text style={[styles.headerCell, { color: colors.textMuted, flex: 1 }]}>Cliente</Text>
                <Text style={[styles.headerCell, { color: colors.textMuted, flex: 1 }]}>Regimen</Text>
                <Text style={[styles.headerCell, { color: colors.textMuted, width: 120, textAlign: 'right' }]}>Proyectos</Text>
                <View style={{ width: 44 }} />
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
                        <ClientRow
                            client={item}
                            index={index}
                            onPress={onSelectClient}
                            onDelete={confirmDelete}
                        />
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
    trashButton: {
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
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
    // Trash section
    trashSection: {
        margin: 16,
        marginBottom: 0,
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    trashHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
    },
    trashTitle: {
        fontSize: 13,
        fontWeight: '700',
    },
    trashSubtitle: {
        fontSize: 11,
        fontWeight: '500',
        marginLeft: 'auto',
    },
    trashEmpty: {
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
        padding: 12,
    },
    trashRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 12,
        borderTopWidth: 1,
    },
    trashRowInfo: {
        flex: 1,
    },
    trashRowName: {
        fontSize: 12,
        fontWeight: '600',
    },
    trashRowRfc: {
        fontSize: 10,
        fontWeight: '500',
        marginTop: 1,
    },
    trashDays: {
        fontSize: 11,
        fontWeight: '600',
    },
    restoreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    restoreText: {
        fontSize: 12,
        fontWeight: '600',
    },
});
