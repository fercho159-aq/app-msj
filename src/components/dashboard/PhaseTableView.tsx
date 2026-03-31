import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    StyleSheet, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../api/client';
import { DeadlineTrafficLight, getDeadlineSeverity } from './DeadlineTrafficLight';
import type { PhaseRow, PhaseStatus, ChecklistItem } from '../../types';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    pendiente: { label: 'Pendiente', color: '#D97706', bg: '#F59E0B18' },
    en_curso: { label: 'En curso', color: '#2563EB', bg: '#3B82F618' },
    bloqueado: { label: 'Bloqueado', color: '#DC2626', bg: '#EF444418' },
    completado: { label: 'Completado', color: '#059669', bg: '#10B98118' },
};

const STATUS_CYCLE: PhaseStatus[] = ['pendiente', 'en_curso', 'bloqueado', 'completado'];

interface PhaseTableViewProps {
    phases: PhaseRow[];
    selectedPhaseId: string | null;
    projectId: string;
    onSelectPhase: (phase: PhaseRow) => void;
    onRefresh: () => void;
}

export const PhaseTableView: React.FC<PhaseTableViewProps> = ({
    phases, selectedPhaseId, projectId, onSelectPhase, onRefresh,
}) => {
    const { colors, isDark } = useTheme();
    const [hoveredRow, setHoveredRow] = useState<string | null>(null);
    const [statusError, setStatusError] = useState<string | null>(null);
    const [checklistData, setChecklistData] = useState<Record<string, ChecklistItem[]>>({});
    const [loadingAll, setLoadingAll] = useState(true);
    const [newItemLabels, setNewItemLabels] = useState<Record<string, string>>({});
    const [addingForPhase, setAddingForPhase] = useState<string | null>(null);
    const [togglingItemId, setTogglingItemId] = useState<string | null>(null);

    const divider = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const headerBg = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)';
    const hoverBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)';
    const selectedBg = isDark ? 'rgba(92,118,178,0.10)' : 'rgba(92,118,178,0.06)';

    // Load all checklists on mount
    useEffect(() => {
        const loadAll = async () => {
            setLoadingAll(true);
            const results: Record<string, ChecklistItem[]> = {};
            await Promise.all(phases.map(async (phase) => {
                try {
                    const r = await api.getPhaseDetail(phase.id);
                    if (r.data) results[phase.id] = r.data.checklist;
                } catch { /* skip */ }
            }));
            setChecklistData(results);
            setLoadingAll(false);
        };
        if (phases.length > 0) loadAll();
        else setLoadingAll(false);
    }, [phases.map(p => p.id).join(',')]);

    const reloadChecklist = async (phaseId: string) => {
        try {
            const r = await api.getPhaseDetail(phaseId);
            if (r.data) setChecklistData(prev => ({ ...prev, [phaseId]: r.data!.checklist }));
        } catch { /* skip */ }
        onRefresh();
    };

    const handleCycleStatus = async (phase: PhaseRow, e: any) => {
        e.stopPropagation();
        setStatusError(null);
        const nextStatus = STATUS_CYCLE[(STATUS_CYCLE.indexOf(phase.status) + 1) % STATUS_CYCLE.length];
        try {
            const result = await api.updatePhase(projectId, phase.id, { status: nextStatus });
            if (result.error) { setStatusError(result.error); setTimeout(() => setStatusError(null), 4000); return; }
            onRefresh();
        } catch (err: any) {
            setStatusError(err?.message || 'Error');
            setTimeout(() => setStatusError(null), 4000);
        }
    };

    const handleAddItem = async (phaseId: string) => {
        const label = (newItemLabels[phaseId] || '').trim();
        if (!label) return;
        setAddingForPhase(phaseId);
        try {
            await api.addChecklistItem(phaseId, label);
            setNewItemLabels(prev => ({ ...prev, [phaseId]: '' }));
            await reloadChecklist(phaseId);
        } catch { /* skip */ }
        finally { setAddingForPhase(null); }
    };

    const handleToggleItem = async (phaseId: string, itemId: string) => {
        setTogglingItemId(itemId);
        try {
            await api.toggleChecklistItem(phaseId, itemId);
            await reloadChecklist(phaseId);
        } catch { /* skip */ }
        finally { setTogglingItemId(null); }
    };

    const handleDeleteItem = async (phaseId: string, itemId: string) => {
        try {
            await api.deleteChecklistItem(phaseId, itemId);
            await reloadChecklist(phaseId);
        } catch { /* skip */ }
    };

    return (
        <View style={styles.wrapper}>
            {statusError && (
                <View style={[styles.errorToast, {
                    backgroundColor: isDark ? '#2D1215' : '#FEF2F2',
                    borderColor: isDark ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.15)',
                }]}>
                    <Ionicons name="alert-circle" size={14} color="#EF4444" />
                    <Text style={styles.errorToastText}>{statusError}</Text>
                    <TouchableOpacity onPress={() => setStatusError(null)}>
                        <Ionicons name="close" size={14} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            )}

            <View style={[styles.tableContainer, {
                borderColor: divider,
                backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.8)',
            }]}>
                {/* Header */}
                <View style={[styles.headerRow, { backgroundColor: headerBg, borderBottomColor: divider }]}>
                    <View style={styles.colNum}><Text style={[styles.hLabel, { color: colors.textMuted }]}>#</Text></View>
                    <View style={styles.colName}><Text style={[styles.hLabel, { color: colors.textMuted }]}>Fase</Text></View>
                    <View style={styles.colStatus}><Text style={[styles.hLabel, { color: colors.textMuted }]}>Estado</Text></View>
                    <View style={styles.colMeta}><Text style={[styles.hLabel, { color: colors.textMuted }]}>Info</Text></View>
                    <View style={styles.colChecklist}><Text style={[styles.hLabel, { color: colors.textMuted }]}>Pendientes</Text></View>
                </View>

                {/* Rows */}
                <ScrollView showsVerticalScrollIndicator={false}>
                    {phases.map((phase) => {
                        const isSelected = selectedPhaseId === phase.id;
                        const isHovered = hoveredRow === phase.id;
                        const severity = getDeadlineSeverity(phase.deadline);
                        const sc = STATUS_CONFIG[phase.status] || STATUS_CONFIG.pendiente;
                        const items = checklistData[phase.id] || [];
                        const pending = items.filter(i => !i.is_completed);
                        const done = items.filter(i => i.is_completed);
                        const inputVal = newItemLabels[phase.id] || '';

                        return (
                            <View
                                key={phase.id}
                                {...(Platform.OS === 'web' ? {
                                    // @ts-ignore
                                    onMouseEnter: () => setHoveredRow(phase.id),
                                    onMouseLeave: () => setHoveredRow(null),
                                } : {})}
                                style={[
                                    styles.dataRow,
                                    { borderBottomColor: divider },
                                    isHovered && { backgroundColor: hoverBg },
                                    isSelected && { backgroundColor: selectedBg, borderLeftColor: colors.primary, borderLeftWidth: 3 },
                                ]}
                            >
                                {/* Left: Phase info (clickable to open detail) */}
                                <TouchableOpacity
                                    style={styles.leftSection}
                                    onPress={() => onSelectPhase(phase)}
                                    activeOpacity={0.7}
                                >
                                    {/* # */}
                                    <View style={styles.colNum}>
                                        <Text style={[styles.numText, { color: colors.textMuted }]}>{phase.sort_order + 1}</Text>
                                    </View>

                                    {/* Name */}
                                    <View style={styles.colName}>
                                        <Text style={[styles.nameText, { color: colors.textPrimary }]} numberOfLines={1}>
                                            {phase.name}
                                        </Text>
                                    </View>

                                    {/* Status */}
                                    <View style={styles.colStatus}>
                                        <TouchableOpacity
                                            onPress={(e) => handleCycleStatus(phase, e)}
                                            style={[styles.statusPill, { backgroundColor: sc.bg }]}
                                            activeOpacity={0.6}
                                        >
                                            <View style={[styles.statusDot, { backgroundColor: sc.color }]} />
                                            <Text style={[styles.statusLabel, { color: sc.color }]}>{sc.label}</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Meta column: person, date, dependency stacked */}
                                    <View style={styles.colMeta}>
                                        {phase.executor_name && (
                                            <View style={styles.metaRow}>
                                                <View style={[styles.avatar, { backgroundColor: `${colors.primary}18` }]}>
                                                    <Text style={[styles.avatarLetter, { color: colors.primary }]}>
                                                        {phase.executor_name.charAt(0).toUpperCase()}
                                                    </Text>
                                                </View>
                                                <Text style={[styles.metaText, { color: colors.textPrimary }]} numberOfLines={1}>
                                                    {phase.executor_name}
                                                </Text>
                                            </View>
                                        )}
                                        {phase.deadline && (
                                            <View style={styles.metaRow}>
                                                {severity && <DeadlineTrafficLight severity={severity} size={6} />}
                                                <Ionicons name="calendar-outline" size={11} color={colors.textMuted} />
                                                <Text style={[styles.metaText, { color: colors.textSecondary }]}>{phase.deadline}</Text>
                                            </View>
                                        )}
                                        {phase.depends_on_phase_name && (
                                            <View style={styles.metaRow}>
                                                <Ionicons name="link-outline" size={11} color="#FBBF24" />
                                                <Text style={[styles.metaText, { color: colors.textMuted }]} numberOfLines={1}>
                                                    {phase.depends_on_phase_name}
                                                </Text>
                                            </View>
                                        )}
                                        {phase.docs_count > 0 && (
                                            <View style={styles.metaRow}>
                                                <Ionicons name="document-text-outline" size={11} color={colors.textMuted} />
                                                <Text style={[styles.metaText, { color: colors.textMuted }]}>{phase.docs_count} doc{phase.docs_count > 1 ? 's' : ''}</Text>
                                            </View>
                                        )}
                                        {!phase.executor_name && !phase.deadline && !phase.depends_on_phase_name && phase.docs_count === 0 && (
                                            <Text style={[styles.metaText, { color: colors.textMuted }]}>—</Text>
                                        )}
                                    </View>
                                </TouchableOpacity>

                                {/* Right: Checklist column - always visible */}
                                <View style={[styles.colChecklist, { borderLeftColor: divider }]}>
                                    {loadingAll ? (
                                        <ActivityIndicator size="small" color={colors.primary} />
                                    ) : (
                                        <>
                                            {/* Pending items */}
                                            {pending.map(item => (
                                                <View key={item.id} style={[styles.ckItem, {
                                                    borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                                                }]}>
                                                    <TouchableOpacity
                                                        onPress={() => handleToggleItem(phase.id, item.id)}
                                                        disabled={togglingItemId === item.id}
                                                        style={styles.ckBox}
                                                    >
                                                        {togglingItemId === item.id ? (
                                                            <ActivityIndicator size="small" color={colors.primary} />
                                                        ) : (
                                                            <View style={[styles.ckUnchecked, {
                                                                borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.18)',
                                                            }]} />
                                                        )}
                                                    </TouchableOpacity>
                                                    <Text style={[styles.ckLabel, { color: colors.textPrimary }]} numberOfLines={2}>
                                                        {item.label}
                                                    </Text>
                                                    <TouchableOpacity
                                                        onPress={() => handleDeleteItem(phase.id, item.id)}
                                                        style={styles.ckDelete}
                                                    >
                                                        <Ionicons name="close" size={12} color={colors.textMuted} />
                                                    </TouchableOpacity>
                                                </View>
                                            ))}

                                            {/* Done items - compact */}
                                            {done.map(item => (
                                                <View key={item.id} style={[styles.ckItem, styles.ckItemDone, {
                                                    borderBottomColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                                }]}>
                                                    <TouchableOpacity
                                                        onPress={() => handleToggleItem(phase.id, item.id)}
                                                        disabled={togglingItemId === item.id}
                                                        style={styles.ckBox}
                                                    >
                                                        {togglingItemId === item.id ? (
                                                            <ActivityIndicator size="small" color="#10B981" />
                                                        ) : (
                                                            <Ionicons name="checkbox" size={16} color="#10B981" />
                                                        )}
                                                    </TouchableOpacity>
                                                    <Text style={[styles.ckLabel, styles.ckLabelDone, { color: colors.textMuted }]} numberOfLines={1}>
                                                        {item.label}
                                                    </Text>
                                                </View>
                                            ))}

                                            {/* Add input - always visible */}
                                            <View style={styles.ckAddRow}>
                                                <Ionicons name="add" size={14} color={colors.textMuted} />
                                                <TextInput
                                                    style={[styles.ckAddInput, { color: colors.textPrimary }]}
                                                    value={inputVal}
                                                    onChangeText={(t) => setNewItemLabels(prev => ({ ...prev, [phase.id]: t }))}
                                                    placeholder="Agregar..."
                                                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.25)'}
                                                    onSubmitEditing={() => handleAddItem(phase.id)}
                                                />
                                                {inputVal.trim() ? (
                                                    <TouchableOpacity
                                                        onPress={() => handleAddItem(phase.id)}
                                                        disabled={addingForPhase === phase.id}
                                                    >
                                                        {addingForPhase === phase.id ? (
                                                            <ActivityIndicator size="small" color={colors.primary} />
                                                        ) : (
                                                            <Ionicons name="arrow-forward-circle" size={20} color={colors.primary} />
                                                        )}
                                                    </TouchableOpacity>
                                                ) : null}
                                            </View>
                                        </>
                                    )}
                                </View>
                            </View>
                        );
                    })}

                    {phases.length === 0 && (
                        <View style={styles.emptyState}>
                            <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>Sin fases registradas</Text>
                        </View>
                    )}
                </ScrollView>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: { flex: 1 },
    tableContainer: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 12,
        overflow: 'hidden',
    },
    // Header
    headerRow: {
        flexDirection: 'row',
        height: 38,
        alignItems: 'center',
        borderBottomWidth: 1,
        paddingHorizontal: 4,
    },
    hLabel: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    // Data row - horizontal split
    dataRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        minHeight: 52,
    },
    leftSection: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
        paddingVertical: 8,
    },
    // Left columns
    colNum: {
        width: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    colName: {
        flex: 2,
        paddingHorizontal: 8,
        justifyContent: 'center',
    },
    colStatus: {
        flex: 1.1,
        paddingHorizontal: 6,
        justifyContent: 'center',
    },
    colMeta: {
        flex: 1.6,
        paddingHorizontal: 8,
        justifyContent: 'center',
        gap: 3,
    },
    // Right: checklist
    colChecklist: {
        width: 280,
        borderLeftWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 6,
        justifyContent: 'center',
    },
    // Cell content
    numText: { fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
    nameText: { fontSize: 13, fontWeight: '600' },
    // Status
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 5,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 14,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusLabel: { fontSize: 11, fontWeight: '700' },
    // Meta stacked
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    metaText: { fontSize: 11, fontWeight: '500' },
    avatar: {
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarLetter: { fontSize: 9, fontWeight: '800' },
    // Checklist items
    ckItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        borderBottomWidth: 1,
    },
    ckItemDone: {
        opacity: 0.6,
    },
    ckBox: {
        width: 22,
        alignItems: 'center',
    },
    ckUnchecked: {
        width: 16,
        height: 16,
        borderRadius: 4,
        borderWidth: 1.5,
    },
    ckLabel: {
        flex: 1,
        fontSize: 12,
        fontWeight: '500',
    },
    ckLabelDone: {
        textDecorationLine: 'line-through',
    },
    ckDelete: {
        padding: 2,
        opacity: 0.4,
    },
    // Add item inline
    ckAddRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
        paddingVertical: 4,
    },
    ckAddInput: {
        flex: 1,
        fontSize: 12,
        fontWeight: '500',
        paddingVertical: 4,
    },
    // Empty
    emptyState: {
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyStateText: { fontSize: 13, fontWeight: '500' },
    emptyVal: { fontSize: 12 },
    // Error
    errorToast: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        marginBottom: 10,
    },
    errorToastText: {
        flex: 1,
        color: '#EF4444',
        fontSize: 12,
        fontWeight: '600',
    },
});
