import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { PhaseStatus, ProjectStatus } from '../../types';

type BadgeStatus = PhaseStatus | ProjectStatus;

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
    pendiente: { label: 'Pendiente', bg: '#F59E0B18', text: '#D97706' },
    en_curso: { label: 'En curso', bg: '#3B82F618', text: '#2563EB' },
    bloqueado: { label: 'Bloqueado', bg: '#EF444418', text: '#DC2626' },
    completado: { label: 'Completado', bg: '#10B98118', text: '#059669' },
    activo: { label: 'Activo', bg: '#10B98118', text: '#059669' },
    pausado: { label: 'Pausado', bg: '#F59E0B18', text: '#D97706' },
    cancelado: { label: 'Cancelado', bg: '#EF444418', text: '#DC2626' },
};

interface StatusBadgeProps {
    status: BadgeStatus;
    small?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, small }) => {
    const config = STATUS_CONFIG[status] || { label: status, bg: '#64748B18', text: '#64748B' };

    return (
        <View style={[styles.badge, { backgroundColor: config.bg }, small && styles.badgeSmall]}>
            <View style={[styles.dot, { backgroundColor: config.text }]} />
            <Text style={[styles.label, { color: config.text }, small && styles.labelSmall]}>
                {config.label}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    badgeSmall: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        gap: 4,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
    },
    labelSmall: {
        fontSize: 10,
    },
});
