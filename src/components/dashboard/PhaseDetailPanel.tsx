import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    ActivityIndicator, StyleSheet, Platform, Alert, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../api/client';
import { StatusBadge } from './StatusBadge';
import { DeadlineTrafficLight, getDeadlineSeverity } from './DeadlineTrafficLight';
import { PhaseDocuments } from './PhaseDocuments';
import { PhaseObservations } from './PhaseObservations';
import { PhaseChecklist } from './PhaseChecklist';
import type { PhaseDetail, PhaseStatus, ConsultorRow, PhaseRow } from '../../types';

const STATUS_OPTIONS: { value: PhaseStatus; label: string }[] = [
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'en_curso', label: 'En curso' },
    { value: 'bloqueado', label: 'Bloqueado' },
    { value: 'completado', label: 'Completado' },
];

interface PhaseDetailPanelProps {
    phaseId: string;
    projectId: string;
    clientId: string;
    onClose: () => void;
    onPhaseUpdated: () => void;
}

export const PhaseDetailPanel: React.FC<PhaseDetailPanelProps> = ({
    phaseId, projectId, clientId, onClose, onPhaseUpdated,
}) => {
    const { colors, isDark } = useTheme();
    const { width: screenWidth } = useWindowDimensions();
    const isMobile = screenWidth < 768;
    const [detail, setDetail] = useState<PhaseDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isChangingStatus, setIsChangingStatus] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editDeadline, setEditDeadline] = useState('');
    const [editExecutorId, setEditExecutorId] = useState('');
    const [consultors, setConsultors] = useState<ConsultorRow[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [editDependsOn, setEditDependsOn] = useState('');
    const [siblingPhases, setSiblingPhases] = useState<PhaseRow[]>([]);
    const [statusError, setStatusError] = useState<string | null>(null);

    const loadDetail = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await api.getPhaseDetail(phaseId);
            if (result.data) {
                setDetail(result.data);
            }
        } catch (error) {
            console.error('Error loading phase detail:', error);
        } finally {
            setIsLoading(false);
        }
    }, [phaseId]);

    useEffect(() => { loadDetail(); }, [loadDetail]);

    const handleStatusChange = async (newStatus: PhaseStatus) => {
        setIsChangingStatus(true);
        setStatusError(null);
        try {
            const result = await api.updatePhase(projectId, phaseId, { status: newStatus });
            if (result.error) {
                setStatusError(result.error);
                return;
            }
            loadDetail();
            onPhaseUpdated();
        } catch (error: any) {
            setStatusError(error?.message || 'Error al cambiar estado');
        } finally {
            setIsChangingStatus(false);
        }
    };

    const handleDelete = async () => {
        try {
            await api.deletePhase(projectId, phaseId);
            onClose();
            onPhaseUpdated();
        } catch (error) {
            console.error('Error deleting phase:', error);
        }
    };

    const startEditing = () => {
        if (!detail) return;
        setEditName(detail.phase.name);
        setEditDesc(detail.phase.description || '');
        setEditDeadline(detail.phase.deadline || '');
        setEditExecutorId(detail.phase.executor_id || '');
        setEditDependsOn(detail.phase.depends_on_phase_id || '');
        setIsEditing(true);
        api.getConsultors().then(r => {
            if (r.data) setConsultors(r.data.consultors);
        });
        api.getProject(projectId).then(r => {
            if (r.data) {
                setSiblingPhases(r.data.project.phases.filter((p: PhaseRow) => p.id !== phaseId));
            }
        });
    };

    const handleSaveEdit = async () => {
        if (!editName.trim()) return;
        setIsSaving(true);
        try {
            await api.updatePhase(projectId, phaseId, {
                name: editName.trim(),
                description: editDesc.trim() || undefined,
                deadline: editDeadline || undefined,
                executorId: editExecutorId || undefined,
                dependsOnPhaseId: editDependsOn || null,
            });
            setIsEditing(false);
            loadDetail();
            onPhaseUpdated();
        } catch (error) {
            console.error('Error updating phase:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const deadlineSeverity = detail?.phase.deadline ? getDeadlineSeverity(detail.phase.deadline) : null;
    const inputBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)';
    const inputBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

    return (
        <View style={[styles.container, isMobile && styles.containerMobile, {
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.95)',
            borderLeftColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        }]}>
            {/* Header */}
            <View style={[styles.header, {
                borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            }]}>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                    Detalle de Fase
                </Text>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    {!isEditing && detail && (
                        <TouchableOpacity onPress={startEditing}>
                            <Ionicons name="pencil-outline" size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={22} color={colors.textMuted} />
                    </TouchableOpacity>
                </View>
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                </View>
            ) : detail ? (
                <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
                    {isEditing ? (
                        <>
                            {/* Editable Phase Info */}
                            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Nombre *</Text>
                            <TextInput
                                style={[styles.editInput, { color: colors.textPrimary, backgroundColor: inputBg, borderColor: inputBorder }]}
                                value={editName}
                                onChangeText={setEditName}
                                placeholder="Nombre de la fase"
                                placeholderTextColor={colors.textMuted}
                            />

                            <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 14 }]}>Descripcion</Text>
                            <TextInput
                                style={[styles.editInput, styles.editTextArea, { color: colors.textPrimary, backgroundColor: inputBg, borderColor: inputBorder }]}
                                value={editDesc}
                                onChangeText={setEditDesc}
                                placeholder="Descripcion de la fase..."
                                placeholderTextColor={colors.textMuted}
                                multiline
                                numberOfLines={3}
                            />

                            <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 14 }]}>Fecha limite</Text>
                            {Platform.OS === 'web' ? (
                                <View style={[styles.editInput, { backgroundColor: inputBg, borderColor: inputBorder, flexDirection: 'row', alignItems: 'center' }]}>
                                    <input
                                        type="date"
                                        value={editDeadline}
                                        onChange={(e: any) => setEditDeadline(e.target.value)}
                                        style={{
                                            flex: 1,
                                            background: 'transparent',
                                            border: 'none',
                                            outline: 'none',
                                            color: isDark ? '#e5e5e5' : '#1a1a1a',
                                            fontSize: 13,
                                            fontWeight: 500,
                                            fontFamily: 'inherit',
                                            colorScheme: isDark ? 'dark' : 'light',
                                        }}
                                    />
                                </View>
                            ) : (
                                <TextInput
                                    style={[styles.editInput, { color: colors.textPrimary, backgroundColor: inputBg, borderColor: inputBorder }]}
                                    value={editDeadline}
                                    onChangeText={setEditDeadline}
                                    placeholder="YYYY-MM-DD"
                                    placeholderTextColor={colors.textMuted}
                                />
                            )}

                            <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 14 }]}>Responsable</Text>
                            <View style={styles.consultorGrid}>
                                <TouchableOpacity
                                    style={[styles.consultorChip, {
                                        backgroundColor: !editExecutorId ? `${colors.primary}15` : inputBg,
                                        borderColor: !editExecutorId ? colors.primary : inputBorder,
                                    }]}
                                    onPress={() => setEditExecutorId('')}
                                >
                                    <Text style={[styles.consultorChipText, {
                                        color: !editExecutorId ? colors.primary : colors.textSecondary,
                                    }]}>Sin asignar</Text>
                                </TouchableOpacity>
                                {consultors.map(c => (
                                    <TouchableOpacity
                                        key={c.id}
                                        style={[styles.consultorChip, {
                                            backgroundColor: editExecutorId === c.id ? `${colors.primary}15` : inputBg,
                                            borderColor: editExecutorId === c.id ? colors.primary : inputBorder,
                                        }]}
                                        onPress={() => setEditExecutorId(c.id)}
                                    >
                                        <Text style={[styles.consultorChipText, {
                                            color: editExecutorId === c.id ? colors.primary : colors.textSecondary,
                                        }]}>{c.name || c.rfc}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 14 }]}>Depende de</Text>
                            <View style={styles.consultorGrid}>
                                <TouchableOpacity
                                    style={[styles.consultorChip, {
                                        backgroundColor: !editDependsOn ? `${colors.primary}15` : inputBg,
                                        borderColor: !editDependsOn ? colors.primary : inputBorder,
                                    }]}
                                    onPress={() => setEditDependsOn('')}
                                >
                                    <Text style={[styles.consultorChipText, {
                                        color: !editDependsOn ? colors.primary : colors.textSecondary,
                                    }]}>Ninguna</Text>
                                </TouchableOpacity>
                                {siblingPhases.map(p => (
                                    <TouchableOpacity
                                        key={p.id}
                                        style={[styles.consultorChip, {
                                            backgroundColor: editDependsOn === p.id ? `${colors.primary}15` : inputBg,
                                            borderColor: editDependsOn === p.id ? colors.primary : inputBorder,
                                        }]}
                                        onPress={() => setEditDependsOn(p.id)}
                                    >
                                        <Text style={[styles.consultorChipText, {
                                            color: editDependsOn === p.id ? colors.primary : colors.textSecondary,
                                        }]}>{p.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Save / Cancel buttons */}
                            <View style={styles.editActions}>
                                <TouchableOpacity
                                    onPress={() => setIsEditing(false)}
                                    style={styles.editCancelBtn}
                                >
                                    <Text style={[styles.editCancelText, { color: colors.textMuted }]}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleSaveEdit}
                                    disabled={!editName.trim() || isSaving}
                                    style={[styles.editSaveBtn, { backgroundColor: colors.primary }, !editName.trim() && { opacity: 0.5 }]}
                                >
                                    {isSaving ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.editSaveText}>Guardar</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        <>
                            {/* Phase Info */}
                            <Text style={[styles.phaseName, { color: colors.textPrimary }]}>
                                {detail.phase.name}
                            </Text>
                            {detail.phase.description && (
                                <Text style={[styles.phaseDesc, { color: colors.textSecondary }]}>
                                    {detail.phase.description}
                                </Text>
                            )}

                            {/* Status */}
                            <View style={styles.section}>
                                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Estado</Text>
                                <View style={styles.statusRow}>
                                    {STATUS_OPTIONS.map(opt => (
                                        <TouchableOpacity
                                            key={opt.value}
                                            onPress={() => handleStatusChange(opt.value)}
                                            disabled={isChangingStatus || detail.phase.status === opt.value}
                                            style={[
                                                styles.statusChip,
                                                detail.phase.status === opt.value && {
                                                    backgroundColor: `${colors.primary}15`,
                                                    borderColor: colors.primary,
                                                },
                                                detail.phase.status !== opt.value && {
                                                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                                                    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                                                },
                                            ]}
                                        >
                                            <Text style={[
                                                styles.statusChipText,
                                                { color: detail.phase.status === opt.value ? colors.primary : colors.textMuted },
                                            ]}>
                                                {opt.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Meta info */}
                            <View style={styles.metaGrid}>
                                {detail.phase.executor_name && (
                                    <View style={styles.metaItem}>
                                        <Ionicons name="person-outline" size={14} color={colors.textMuted} />
                                        <View>
                                            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Responsable</Text>
                                            <Text style={[styles.metaValue, { color: colors.textPrimary }]}>
                                                {detail.phase.executor_name}
                                            </Text>
                                        </View>
                                    </View>
                                )}
                                {detail.phase.deadline && (
                                    <View style={styles.metaItem}>
                                        {deadlineSeverity && <DeadlineTrafficLight severity={deadlineSeverity} size={10} />}
                                        <View>
                                            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Fecha limite</Text>
                                            <Text style={[styles.metaValue, { color: colors.textPrimary }]}>
                                                {detail.phase.deadline}
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </View>

                            {/* Dependency info */}
                            {detail.phase.depends_on_phase_name && (
                                <View style={[styles.dependencyBanner, {
                                    backgroundColor: isDark ? 'rgba(251,191,36,0.08)' : 'rgba(251,191,36,0.1)',
                                    borderColor: isDark ? 'rgba(251,191,36,0.2)' : 'rgba(251,191,36,0.3)',
                                }]}>
                                    <Ionicons name="link-outline" size={14} color="#FBBF24" />
                                    <Text style={[styles.dependencyText, { color: colors.textSecondary }]}>
                                        Depende de: <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{detail.phase.depends_on_phase_name}</Text>
                                    </Text>
                                </View>
                            )}

                            {/* Status error */}
                            {statusError && (
                                <View style={[styles.dependencyBanner, {
                                    backgroundColor: isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.1)',
                                    borderColor: isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.3)',
                                }]}>
                                    <Ionicons name="alert-circle-outline" size={14} color="#EF4444" />
                                    <Text style={[styles.dependencyText, { color: '#EF4444' }]}>
                                        {statusError}
                                    </Text>
                                </View>
                            )}
                        </>
                    )}

                    {/* Divider */}
                    <View style={[styles.divider, {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                    }]} />

                    {/* Checklist */}
                    <PhaseChecklist
                        phaseId={phaseId}
                        checklist={detail.checklist}
                        onRefresh={loadDetail}
                    />

                    {/* Divider */}
                    <View style={[styles.divider, {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                    }]} />

                    {/* Documents */}
                    <PhaseDocuments
                        phaseId={phaseId}
                        clientId={clientId}
                        documents={detail.documents}
                        onRefresh={loadDetail}
                    />

                    {/* Divider */}
                    <View style={[styles.divider, {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                    }]} />

                    {/* Observations */}
                    <PhaseObservations
                        phaseId={phaseId}
                        observations={detail.observations}
                        onRefresh={loadDetail}
                    />

                    {/* Delete Phase */}
                    <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={handleDelete}
                    >
                        <Ionicons name="trash-outline" size={14} color="#EF4444" />
                        <Text style={styles.deleteBtnText}>Eliminar fase</Text>
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </ScrollView>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 520,
        borderLeftWidth: 1,
    },
    containerMobile: {
        width: '100%',
        borderLeftWidth: 0,
        borderTopWidth: 1,
        borderRadius: 14,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    body: {
        flex: 1,
        padding: 20,
    },
    phaseName: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 6,
    },
    phaseDesc: {
        fontSize: 13,
        fontWeight: '400',
        lineHeight: 20,
        marginBottom: 12,
    },
    section: {
        marginBottom: 16,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    statusRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    statusChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
    },
    statusChipText: {
        fontSize: 11,
        fontWeight: '600',
    },
    metaGrid: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 16,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    metaLabel: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    metaValue: {
        fontSize: 13,
        fontWeight: '500',
        marginTop: 1,
    },
    divider: {
        height: 1,
        marginVertical: 16,
    },
    deleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        marginTop: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#EF444430',
    },
    deleteBtnText: {
        color: '#EF4444',
        fontSize: 12,
        fontWeight: '600',
    },
    editInput: {
        fontSize: 13,
        fontWeight: '500',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
    },
    editTextArea: {
        minHeight: 70,
        textAlignVertical: 'top',
    },
    consultorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    consultorChip: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
    },
    consultorChipText: {
        fontSize: 12,
        fontWeight: '600',
    },
    editActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        marginTop: 20,
        marginBottom: 8,
    },
    editCancelBtn: {
        paddingVertical: 8,
        paddingHorizontal: 14,
    },
    editCancelText: {
        fontSize: 13,
        fontWeight: '600',
    },
    editSaveBtn: {
        paddingVertical: 8,
        paddingHorizontal: 18,
        borderRadius: 10,
    },
    editSaveText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
    dependencyBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 12,
    },
    dependencyText: {
        fontSize: 12,
        fontWeight: '500',
        flex: 1,
    },
});
