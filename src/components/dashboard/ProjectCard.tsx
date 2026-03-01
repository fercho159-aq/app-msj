import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { StatusBadge } from './StatusBadge';
import type { ProjectRow } from '../../types';

interface ProjectCardProps {
    project: ProjectRow;
    onPress: (project: ProjectRow) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onPress }) => {
    const { colors, isDark } = useTheme();
    const progress = project.total_phases > 0
        ? (project.completed_phases / project.total_phases) * 100
        : 0;

    return (
        <TouchableOpacity
            style={[styles.card, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.95)',
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            }]}
            onPress={() => onPress(project)}
            activeOpacity={0.7}
        >
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                        {project.name}
                    </Text>
                    <StatusBadge status={project.status as any} small />
                </View>
                <Text style={[styles.serviceType, { color: colors.textMuted }]}>
                    {project.service_type}
                </Text>
            </View>

            {project.description && (
                <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
                    {project.description}
                </Text>
            )}

            {/* Progress Bar */}
            <View style={styles.progressSection}>
                <View style={styles.progressInfo}>
                    <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
                        Fases: {project.completed_phases}/{project.total_phases}
                    </Text>
                    <Text style={[styles.progressPercent, { color: colors.textSecondary }]}>
                        {Math.round(progress)}%
                    </Text>
                </View>
                <View style={[styles.progressTrack, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                }]}>
                    <View style={[
                        styles.progressFill,
                        {
                            width: `${progress}%`,
                            backgroundColor: progress === 100 ? '#10B981' : colors.primary,
                        },
                    ]} />
                </View>
            </View>

            <View style={styles.footer}>
                <View style={styles.footerItem}>
                    <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
                    <Text style={[styles.footerText, { color: colors.textMuted }]}>
                        {new Date(project.created_at).toLocaleDateString('es-MX')}
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 16,
        marginBottom: 10,
    },
    header: {
        marginBottom: 8,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
    name: {
        fontSize: 14,
        fontWeight: '700',
        flex: 1,
    },
    serviceType: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2,
    },
    description: {
        fontSize: 12,
        fontWeight: '400',
        lineHeight: 18,
        marginBottom: 10,
    },
    progressSection: {
        marginBottom: 10,
    },
    progressInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    progressLabel: {
        fontSize: 11,
        fontWeight: '500',
    },
    progressPercent: {
        fontSize: 11,
        fontWeight: '700',
    },
    progressTrack: {
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    footerText: {
        fontSize: 11,
        fontWeight: '500',
    },
});
