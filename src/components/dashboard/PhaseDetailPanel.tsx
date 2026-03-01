import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView,
    ActivityIndicator, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../api/client';
import { StatusBadge } from './StatusBadge';
import { DeadlineTrafficLight, getDeadlineSeverity } from './DeadlineTrafficLight';
import { PhaseDocuments } from './PhaseDocuments';
import { PhaseObservations } from './PhaseObservations';
import { PhaseChecklist } from './PhaseChecklist';
import type { PhaseDetail, PhaseStatus } from '../../types';

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
    const [detail, setDetail] = useState<PhaseDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isChangingStatus, setIsChangingStatus] = useState(false);

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
        try {
            await api.updatePhase(projectId, phaseId, { status: newStatus });
            loadDetail();
            onPhaseUpdated();
        } catch (error) {
            console.error('Error updating status:', error);
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

    const deadlineSeverity = detail?.phase.deadline ? getDeadlineSeverity(detail.phase.deadline) : null;

    return (
        <View style={[styles.container, {
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
                <TouchableOpacity onPress={onClose}>
                    <Ionicons name="close" size={22} color={colors.textMuted} />
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                </View>
            ) : detail ? (
                <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
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
});
