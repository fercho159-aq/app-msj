import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView,
    ActivityIndicator, StyleSheet, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../api/client';
import { StatCard } from './StatCard';
import { ClientListView } from './ClientListView';
import { ClientFiscalProfile } from './ClientFiscalProfile';
import { ProjectListView } from './ProjectListView';
import { PhaseBoard } from './PhaseBoard';
import { PhaseDetailPanel } from './PhaseDetailPanel';
import type {
    ClientRow, ProjectRow, PhaseRow, ProjectDetail, ProjectsSummary,
} from '../../types';

type GestionLevel = 'clients' | 'client-detail' | 'project-detail';

interface BreadcrumbItem {
    label: string;
    level: GestionLevel;
}

const MOBILE_BREAKPOINT = 768;

export const GestionView: React.FC = () => {
    const { colors, isDark } = useTheme();
    const { width: screenWidth } = useWindowDimensions();
    const isMobile = screenWidth < MOBILE_BREAKPOINT;
    const [level, setLevel] = useState<GestionLevel>('clients');
    const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
    const [selectedProject, setSelectedProject] = useState<ProjectRow | null>(null);
    const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
    const [projectDetail, setProjectDetail] = useState<ProjectDetail | null>(null);
    const [summary, setSummary] = useState<ProjectsSummary | null>(null);
    const [isLoadingSummary, setIsLoadingSummary] = useState(true);

    const loadSummary = useCallback(async () => {
        setIsLoadingSummary(true);
        try {
            const result = await api.getProjectsSummary();
            if (result.data) setSummary(result.data.summary);
        } catch (error) {
            console.error('Error loading summary:', error);
        } finally {
            setIsLoadingSummary(false);
        }
    }, []);

    useEffect(() => { loadSummary(); }, [loadSummary]);

    const handleSelectClient = (client: ClientRow) => {
        setSelectedClient(client);
        setSelectedProject(null);
        setSelectedPhaseId(null);
        setLevel('client-detail');
    };

    const handleSelectProject = (project: ProjectRow) => {
        setSelectedProject(project);
        setSelectedPhaseId(null);
        setLevel('project-detail');
    };

    const handleSelectPhase = (phase: PhaseRow) => {
        setSelectedPhaseId(phase.id);
    };

    const handleBreadcrumbNav = (targetLevel: GestionLevel) => {
        if (targetLevel === 'clients') {
            setSelectedClient(null);
            setSelectedProject(null);
            setSelectedPhaseId(null);
        } else if (targetLevel === 'client-detail') {
            setSelectedProject(null);
            setSelectedPhaseId(null);
        }
        setLevel(targetLevel);
    };

    const getBreadcrumbs = (): BreadcrumbItem[] => {
        const items: BreadcrumbItem[] = [{ label: 'Clientes', level: 'clients' }];
        if (selectedClient && (level === 'client-detail' || level === 'project-detail')) {
            items.push({
                label: selectedClient.name || selectedClient.rfc,
                level: 'client-detail',
            });
        }
        if (selectedProject && level === 'project-detail') {
            items.push({
                label: selectedProject.name,
                level: 'project-detail',
            });
        }
        return items;
    };

    const breadcrumbs = getBreadcrumbs();

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0a0a0a' : '#f0f2f5' }]}>
            {/* Header */}
            <View style={[styles.header, isMobile && styles.headerMobile]}>
                <View>
                    <Text style={[styles.headerTitle, { color: colors.textPrimary }, isMobile && styles.headerTitleMobile]}>
                        Gestion de Clientes
                    </Text>
                    {/* Breadcrumb */}
                    <View style={styles.breadcrumb}>
                        {breadcrumbs.map((item, index) => (
                            <View key={item.level} style={styles.breadcrumbItem}>
                                {index > 0 && (
                                    <Ionicons name="chevron-forward" size={12} color={colors.textMuted} style={styles.breadcrumbSep} />
                                )}
                                <TouchableOpacity
                                    onPress={() => handleBreadcrumbNav(item.level)}
                                    disabled={index === breadcrumbs.length - 1}
                                >
                                    <Text style={[
                                        styles.breadcrumbText,
                                        {
                                            color: index === breadcrumbs.length - 1
                                                ? colors.textPrimary
                                                : colors.primary,
                                        },
                                        index === breadcrumbs.length - 1 && styles.breadcrumbActive,
                                    ]}>
                                        {item.label}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                </View>
            </View>

            {/* KPI Cards */}
            {level === 'clients' && (
                <View style={[styles.kpiGrid, isMobile && styles.kpiGridMobile]}>
                    <StatCard
                        title="Clientes"
                        value={summary?.totalClients || 0}
                        icon="people"
                        color="#5C76B2"
                        accentGradient={['#5C76B2', '#97B1DE']}
                    />
                    <StatCard
                        title="Proyectos Activos"
                        value={summary?.activeProjects || 0}
                        icon="briefcase"
                        color="#10B981"
                        accentGradient={['#10B981', '#6EE7B7']}
                    />
                    <StatCard
                        title="Fases Vencidas"
                        value={summary?.overduePhases || 0}
                        icon="alert-circle"
                        color="#EF4444"
                        accentGradient={['#EF4444', '#FCA5A5']}
                    />
                    <StatCard
                        title="Completacion"
                        value={`${summary?.completionRate || 0}%`}
                        icon="checkmark-done"
                        color="#F59E0B"
                        accentGradient={['#F59E0B', '#FCD34D']}
                    />
                </View>
            )}

            {/* Content */}
            <View style={[styles.content, isMobile && styles.contentMobile]}>
                {level === 'clients' && (
                    <View style={[styles.contentCard, {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.95)',
                        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                    }]}>
                        <ClientListView onSelectClient={handleSelectClient} />
                    </View>
                )}

                {level === 'client-detail' && selectedClient && (
                    <View style={[styles.splitLayout, isMobile && styles.splitLayoutMobile]}>
                        <View style={[styles.splitLeft, isMobile && styles.splitLeftMobile]}>
                            <ClientFiscalProfile clientId={selectedClient.id} />
                        </View>
                        <View style={styles.splitRight}>
                            <ProjectListView
                                clientId={selectedClient.id}
                                onSelectProject={handleSelectProject}
                            />
                        </View>
                    </View>
                )}

                {level === 'project-detail' && selectedProject && selectedClient && (
                    <View style={[styles.projectLayout, isMobile && styles.projectLayoutMobile]}>
                        <View style={styles.phaseBoardArea}>
                            <PhaseBoard
                                projectId={selectedProject.id}
                                selectedPhaseId={selectedPhaseId}
                                onSelectPhase={handleSelectPhase}
                                onProjectLoaded={setProjectDetail}
                            />
                        </View>
                        {selectedPhaseId && (
                            <PhaseDetailPanel
                                phaseId={selectedPhaseId}
                                projectId={selectedProject.id}
                                clientId={selectedClient.id}
                                onClose={() => setSelectedPhaseId(null)}
                                onPhaseUpdated={() => {
                                    // Force reload PhaseBoard by updating key
                                    const prevId = selectedProject.id;
                                    setSelectedProject({ ...selectedProject });
                                }}
                            />
                        )}
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 28,
        paddingBottom: 8,
    },
    headerMobile: {
        paddingHorizontal: 14,
        paddingTop: 56,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -0.8,
    },
    headerTitleMobile: {
        fontSize: 22,
    },
    breadcrumb: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    breadcrumbItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    breadcrumbSep: {
        marginHorizontal: 6,
    },
    breadcrumbText: {
        fontSize: 12,
        fontWeight: '500',
    },
    breadcrumbActive: {
        fontWeight: '700',
    },
    kpiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 14,
        paddingHorizontal: 24,
        marginTop: 16,
        marginBottom: 16,
    },
    kpiGridMobile: {
        paddingHorizontal: 14,
        gap: 10,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    contentMobile: {
        paddingHorizontal: 14,
    },
    contentCard: {
        flex: 1,
        borderRadius: 14,
        borderWidth: 1,
        overflow: 'hidden',
    },
    splitLayout: {
        flex: 1,
        flexDirection: 'row',
        gap: 24,
    },
    splitLayoutMobile: {
        flexDirection: 'column',
        gap: 14,
    },
    splitLeft: {
        width: 380,
    },
    splitLeftMobile: {
        width: '100%',
    },
    splitRight: {
        flex: 1,
    },
    projectLayout: {
        flex: 1,
        flexDirection: 'row',
    },
    projectLayoutMobile: {
        flexDirection: 'column',
    },
    phaseBoardArea: {
        flex: 1,
        paddingRight: 0,
    },
});
