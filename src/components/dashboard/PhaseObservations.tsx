import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../api/client';
import type { PhaseObservation } from '../../types';

interface PhaseObservationsProps {
    phaseId: string;
    observations: PhaseObservation[];
    onRefresh: () => void;
}

export const PhaseObservations: React.FC<PhaseObservationsProps> = ({
    phaseId, observations, onRefresh,
}) => {
    const { colors, isDark } = useTheme();
    const [newContent, setNewContent] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');

    const handleAdd = async () => {
        if (!newContent.trim()) return;
        setIsAdding(true);
        try {
            await api.addPhaseObservation(phaseId, newContent.trim());
            setNewContent('');
            onRefresh();
        } catch (error) {
            console.error('Error adding observation:', error);
        } finally {
            setIsAdding(false);
        }
    };

    const handleUpdate = async (obsId: string) => {
        if (!editContent.trim()) return;
        try {
            await api.updatePhaseObservation(phaseId, obsId, editContent.trim());
            setEditingId(null);
            onRefresh();
        } catch (error) {
            console.error('Error updating observation:', error);
        }
    };

    const handleDelete = async (obsId: string) => {
        try {
            await api.deletePhaseObservation(phaseId, obsId);
            onRefresh();
        } catch (error) {
            console.error('Error deleting observation:', error);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
                Bitacora ({observations.length})
            </Text>

            {/* Add new observation */}
            <View style={[styles.addRow, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            }]}>
                <TextInput
                    style={[styles.addInput, { color: colors.textPrimary }]}
                    value={newContent}
                    onChangeText={setNewContent}
                    placeholder="Agregar observacion..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                />
                <TouchableOpacity
                    onPress={handleAdd}
                    disabled={!newContent.trim() || isAdding}
                    style={[styles.addBtn, { backgroundColor: colors.primary }, !newContent.trim() && { opacity: 0.5 }]}
                >
                    {isAdding ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Ionicons name="send" size={14} color="#fff" />
                    )}
                </TouchableOpacity>
            </View>

            {/* Observations list */}
            {observations.map(obs => (
                <View
                    key={obs.id}
                    style={[styles.obsCard, {
                        borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                    }]}
                >
                    <View style={styles.obsHeader}>
                        <View style={styles.obsAuthor}>
                            <Ionicons name="person-circle-outline" size={16} color={colors.textMuted} />
                            <Text style={[styles.obsAuthorName, { color: colors.textSecondary }]}>
                                {obs.author_name || 'Desconocido'}
                            </Text>
                        </View>
                        <Text style={[styles.obsDate, { color: colors.textMuted }]}>
                            {new Date(obs.created_at).toLocaleString('es-MX', {
                                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                            })}
                        </Text>
                    </View>

                    {editingId === obs.id ? (
                        <View style={styles.editRow}>
                            <TextInput
                                style={[styles.editInput, {
                                    color: colors.textPrimary,
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                }]}
                                value={editContent}
                                onChangeText={setEditContent}
                                multiline
                            />
                            <View style={styles.editActions}>
                                <TouchableOpacity onPress={() => setEditingId(null)}>
                                    <Text style={[styles.cancelText, { color: colors.textMuted }]}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleUpdate(obs.id)}>
                                    <Text style={[styles.saveText, { color: colors.primary }]}>Guardar</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <>
                            <Text style={[styles.obsContent, { color: colors.textPrimary }]}>
                                {obs.content}
                            </Text>
                            <View style={styles.obsActions}>
                                <TouchableOpacity
                                    onPress={() => { setEditingId(obs.id); setEditContent(obs.content); }}
                                    style={styles.actionBtn}
                                >
                                    <Ionicons name="pencil-outline" size={13} color={colors.textMuted} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDelete(obs.id)} style={styles.actionBtn}>
                                    <Ionicons name="trash-outline" size={13} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    title: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 10,
    },
    addRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        marginBottom: 10,
    },
    addInput: {
        flex: 1,
        fontSize: 12,
        fontWeight: '500',
        minHeight: 32,
        maxHeight: 80,
    },
    addBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    obsCard: {
        borderBottomWidth: 1,
        paddingVertical: 10,
    },
    obsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    obsAuthor: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    obsAuthorName: {
        fontSize: 11,
        fontWeight: '600',
    },
    obsDate: {
        fontSize: 10,
        fontWeight: '500',
    },
    obsContent: {
        fontSize: 12,
        fontWeight: '400',
        lineHeight: 18,
    },
    obsActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 6,
        justifyContent: 'flex-end',
    },
    actionBtn: {
        padding: 4,
    },
    editRow: {
        gap: 8,
    },
    editInput: {
        fontSize: 12,
        fontWeight: '500',
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
        minHeight: 50,
    },
    editActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    cancelText: {
        fontSize: 12,
        fontWeight: '600',
    },
    saveText: {
        fontSize: 12,
        fontWeight: '700',
    },
});
