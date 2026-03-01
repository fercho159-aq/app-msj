import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../api/client';
import type { ChecklistItem } from '../../types';

interface PhaseChecklistProps {
    phaseId: string;
    checklist: ChecklistItem[];
    onRefresh: () => void;
}

export const PhaseChecklist: React.FC<PhaseChecklistProps> = ({
    phaseId, checklist, onRefresh,
}) => {
    const { colors, isDark } = useTheme();
    const [newLabel, setNewLabel] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const handleAdd = async () => {
        if (!newLabel.trim()) return;
        setIsAdding(true);
        try {
            await api.addChecklistItem(phaseId, newLabel.trim());
            setNewLabel('');
            onRefresh();
        } catch (error) {
            console.error('Error adding checklist item:', error);
        } finally {
            setIsAdding(false);
        }
    };

    const handleToggle = async (itemId: string) => {
        setTogglingId(itemId);
        try {
            await api.toggleChecklistItem(phaseId, itemId);
            onRefresh();
        } catch (error) {
            console.error('Error toggling checklist item:', error);
        } finally {
            setTogglingId(null);
        }
    };

    const handleDelete = async (itemId: string) => {
        try {
            await api.deleteChecklistItem(phaseId, itemId);
            onRefresh();
        } catch (error) {
            console.error('Error deleting checklist item:', error);
        }
    };

    const completed = checklist.filter(c => c.is_completed).length;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                    Checklist ({completed}/{checklist.length})
                </Text>
                {checklist.length > 0 && (
                    <View style={[styles.progressTrack, {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                    }]}>
                        <View style={[styles.progressFill, {
                            width: `${checklist.length > 0 ? (completed / checklist.length) * 100 : 0}%`,
                            backgroundColor: completed === checklist.length ? '#10B981' : colors.primary,
                        }]} />
                    </View>
                )}
            </View>

            {/* Add new item */}
            <View style={[styles.addRow, {
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            }]}>
                <TextInput
                    style={[styles.addInput, { color: colors.textPrimary }]}
                    value={newLabel}
                    onChangeText={setNewLabel}
                    placeholder="Agregar item..."
                    placeholderTextColor={colors.textMuted}
                    onSubmitEditing={handleAdd}
                />
                <TouchableOpacity
                    onPress={handleAdd}
                    disabled={!newLabel.trim() || isAdding}
                    style={[styles.addBtn, !newLabel.trim() && { opacity: 0.4 }]}
                >
                    {isAdding ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                        <Ionicons name="add-circle" size={22} color={colors.primary} />
                    )}
                </TouchableOpacity>
            </View>

            {/* Checklist items */}
            {checklist.map(item => (
                <View key={item.id} style={[styles.itemRow, {
                    borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                }]}>
                    <TouchableOpacity
                        onPress={() => handleToggle(item.id)}
                        disabled={togglingId === item.id}
                        style={styles.checkbox}
                    >
                        {togglingId === item.id ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                            <Ionicons
                                name={item.is_completed ? 'checkbox' : 'square-outline'}
                                size={20}
                                color={item.is_completed ? '#10B981' : colors.textMuted}
                            />
                        )}
                    </TouchableOpacity>
                    <View style={styles.itemContent}>
                        <Text style={[
                            styles.itemLabel,
                            { color: colors.textPrimary },
                            item.is_completed && styles.itemLabelDone,
                        ]}>
                            {item.label}
                        </Text>
                        {item.is_completed && item.completer_name && (
                            <Text style={[styles.itemMeta, { color: colors.textMuted }]}>
                                {item.completer_name} - {new Date(item.completed_at!).toLocaleDateString('es-MX')}
                            </Text>
                        )}
                    </View>
                    <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                        <Ionicons name="close" size={14} color={colors.textMuted} />
                    </TouchableOpacity>
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        gap: 12,
    },
    title: {
        fontSize: 13,
        fontWeight: '700',
    },
    progressTrack: {
        flex: 1,
        maxWidth: 120,
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },
    addRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 6,
        borderBottomWidth: 1,
        marginBottom: 4,
    },
    addInput: {
        flex: 1,
        fontSize: 12,
        fontWeight: '500',
        paddingVertical: 4,
    },
    addBtn: {
        padding: 2,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        borderBottomWidth: 1,
    },
    checkbox: {
        padding: 2,
    },
    itemContent: {
        flex: 1,
    },
    itemLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
    itemLabelDone: {
        textDecorationLine: 'line-through',
        opacity: 0.6,
    },
    itemMeta: {
        fontSize: 10,
        fontWeight: '500',
        marginTop: 2,
    },
    deleteBtn: {
        padding: 4,
    },
});
