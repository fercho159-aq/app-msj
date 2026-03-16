import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView,
    ActivityIndicator, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../api/client';
import { PhaseCard } from './PhaseCard';
import { CreatePhaseModal } from './CreatePhaseModal';
import { CreateProjectModal } from './CreateProjectModal';
import { StatusBadge } from './StatusBadge';
import type { ProjectDetail, PhaseRow } from '../../types';

interface PhaseBoardProps {
    projectId: string;
    selectedPhaseId: string | null;
    onSelectPhase: (phase: PhaseRow) => void;
    onProjectLoaded?: (project: ProjectDetail) => void;
}

export const PhaseBoard: React.FC<PhaseBoardProps> = ({
    projectId, selectedPhaseId, onSelectPhase, onProjectLoaded,
}) => {
    const { colors, isDark } = useTheme();
    const [project, setProject] = useState<ProjectDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditProjectModal, setShowEditProjectModal] = useState(false);

    const loadProject = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await api.getProject(projectId);
            if (result.data) {
                setProject(result.data.project);
                onProjectLoaded?.(result.data.project);
            }
        } catch (error) {
            console.error('Error loading project:', error);
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    useEffect(() => { loadProject(); }, [loadProject]);

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
            </View>
        );
    }

    if (!project) return null;

    return (
        <View style={styles.container}>
            {/* Project Header */}
            <View style={[styles.projectHeader, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.95)',
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            }]}>
                <View style={styles.projectInfo}>
                    <View style={styles.projectTitleRow}>
                        <Text style={[styles.projectName, { color: colors.textPrimary }]}>
                            {project.name}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <StatusBadge status={project.status as any} small />
                            <TouchableOpacity onPress={() => setShowEditProjectModal(true)}>
                                <Ionicons name="pencil-outline" size={16} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <Text style={[styles.projectService, { color: colors.textMuted }]}>
                        {project.service_type}
                    </Text>
                    {project.description && (
                        <Text style={[styles.projectDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                            {project.description}
                        </Text>
                    )}
                </View>
            </View>

            {/* Phases Header */}
            <View style={styles.phasesHeader}>
                <Text style={[styles.phasesTitle, { color: colors.textPrimary }]}>
                    Fases ({project.phases.length})
                </Text>
                <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: colors.primary }]}
                    onPress={() => setShowCreateModal(true)}
                >
                    <Ionicons name="add" size={14} color="#fff" />
                    <Text style={styles.addBtnText}>Nueva Fase</Text>
                </TouchableOpacity>
            </View>

            {/* Phases List */}
            {project.phases.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="layers-outline" size={36} color={colors.textMuted} />
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>Sin fases</Text>
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} style={styles.phasesList}>
                    {project.phases.map(phase => (
                        <PhaseCard
                            key={phase.id}
                            phase={phase}
                            isSelected={selectedPhaseId === phase.id}
                            onPress={onSelectPhase}
                        />
                    ))}
                </ScrollView>
            )}

            <CreatePhaseModal
                visible={showCreateModal}
                projectId={projectId}
                onClose={() => setShowCreateModal(false)}
                onCreated={() => {
                    setShowCreateModal(false);
                    loadProject();
                }}
            />

            {project && (
                <CreateProjectModal
                    visible={showEditProjectModal}
                    clientId={project.client_id}
                    editProject={{
                        id: project.id,
                        name: project.name,
                        serviceType: project.service_type,
                        description: project.description,
                    }}
                    onClose={() => setShowEditProjectModal(false)}
                    onCreated={() => {
                        setShowEditProjectModal(false);
                        loadProject();
                    }}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    projectHeader: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 18,
        marginBottom: 18,
    },
    projectInfo: {},
    projectTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
    projectName: {
        fontSize: 16,
        fontWeight: '700',
        flex: 1,
    },
    projectService: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 4,
    },
    projectDesc: {
        fontSize: 12,
        fontWeight: '400',
        lineHeight: 18,
        marginTop: 6,
    },
    phasesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    phasesTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    addBtnText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    phasesList: {
        flex: 1,
    },
    emptyContainer: {
        paddingVertical: 40,
        alignItems: 'center',
        gap: 10,
    },
    emptyText: {
        fontSize: 13,
        fontWeight: '500',
    },
});
