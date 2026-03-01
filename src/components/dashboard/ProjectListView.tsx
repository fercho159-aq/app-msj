import React, { useState, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView,
    ActivityIndicator, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../api/client';
import { ProjectCard } from './ProjectCard';
import { CreateProjectModal } from './CreateProjectModal';
import type { ProjectRow } from '../../types';

interface ProjectListViewProps {
    clientId: string;
    onSelectProject: (project: ProjectRow) => void;
}

export const ProjectListView: React.FC<ProjectListViewProps> = ({ clientId, onSelectProject }) => {
    const { colors, isDark } = useTheme();
    const [projects, setProjects] = useState<ProjectRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const loadProjects = async () => {
        setIsLoading(true);
        try {
            const result = await api.getProjectsList({ clientId });
            if (result.data) {
                setProjects(result.data.projects);
            }
        } catch (error) {
            console.error('Error loading projects:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadProjects(); }, [clientId]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>Proyectos</Text>
                <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: colors.primary }]}
                    onPress={() => setShowCreateModal(true)}
                >
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={styles.addBtnText}>Nuevo</Text>
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                </View>
            ) : projects.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="folder-open-outline" size={36} color={colors.textMuted} />
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                        Sin proyectos
                    </Text>
                    <TouchableOpacity
                        style={[styles.emptyBtn, { borderColor: colors.primary }]}
                        onPress={() => setShowCreateModal(true)}
                    >
                        <Text style={[styles.emptyBtnText, { color: colors.primary }]}>
                            Crear primer proyecto
                        </Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} style={styles.list}>
                    {projects.map(project => (
                        <ProjectCard
                            key={project.id}
                            project={project}
                            onPress={onSelectProject}
                        />
                    ))}
                </ScrollView>
            )}

            <CreateProjectModal
                visible={showCreateModal}
                clientId={clientId}
                onClose={() => setShowCreateModal(false)}
                onCreated={() => {
                    setShowCreateModal(false);
                    loadProjects();
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 7,
        paddingHorizontal: 14,
        borderRadius: 8,
    },
    addBtnText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    list: {
        flex: 1,
    },
    loadingContainer: {
        paddingVertical: 40,
        alignItems: 'center',
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
    emptyBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        marginTop: 6,
    },
    emptyBtnText: {
        fontSize: 12,
        fontWeight: '600',
    },
});
