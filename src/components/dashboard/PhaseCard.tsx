import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { StatusBadge } from './StatusBadge';
import { DeadlineTrafficLight, getDeadlineSeverity } from './DeadlineTrafficLight';
import type { PhaseRow } from '../../types';

interface PhaseCardProps {
    phase: PhaseRow;
    isSelected: boolean;
    onPress: (phase: PhaseRow) => void;
}

export const PhaseCard: React.FC<PhaseCardProps> = ({ phase, isSelected, onPress }) => {
    const { colors, isDark } = useTheme();
    const deadlineSeverity = getDeadlineSeverity(phase.deadline);

    return (
        <TouchableOpacity
            style={[
                styles.card,
                {
                    backgroundColor: isSelected
                        ? `${colors.primary}10`
                        : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.95)'),
                    borderColor: isSelected
                        ? `${colors.primary}40`
                        : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
                },
            ]}
            onPress={() => onPress(phase)}
            activeOpacity={0.7}
        >
            <View style={styles.header}>
                <View style={styles.orderBadge}>
                    <Text style={[styles.orderText, { color: colors.textMuted }]}>
                        {phase.sort_order + 1}
                    </Text>
                </View>
                <View style={styles.titleSection}>
                    <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                        {phase.name}
                    </Text>
                    <StatusBadge status={phase.status as any} small />
                </View>
            </View>

            <View style={styles.meta}>
                {phase.executor_name && (
                    <View style={styles.metaItem}>
                        <Ionicons name="person-outline" size={12} color={colors.textMuted} />
                        <Text style={[styles.metaText, { color: colors.textMuted }]} numberOfLines={1}>
                            {phase.executor_name}
                        </Text>
                    </View>
                )}
                {phase.deadline && (
                    <View style={styles.metaItem}>
                        {deadlineSeverity && <DeadlineTrafficLight severity={deadlineSeverity} size={8} />}
                        <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
                        <Text style={[styles.metaText, { color: colors.textMuted }]}>
                            {phase.deadline}
                        </Text>
                    </View>
                )}
            </View>

            <View style={styles.counters}>
                {phase.depends_on_phase_name && (
                    <View style={styles.counter}>
                        <Ionicons name="link-outline" size={12} color="#FBBF24" />
                        <Text style={[styles.counterText, { color: colors.textMuted }]} numberOfLines={1}>
                            {phase.depends_on_phase_name}
                        </Text>
                    </View>
                )}
                {phase.docs_count > 0 && (
                    <View style={styles.counter}>
                        <Ionicons name="document-outline" size={12} color={colors.textMuted} />
                        <Text style={[styles.counterText, { color: colors.textMuted }]}>
                            {phase.docs_count}
                        </Text>
                    </View>
                )}
                {phase.checklist_total > 0 && (
                    <View style={styles.counter}>
                        <Ionicons name="checkbox-outline" size={12} color={colors.textMuted} />
                        <Text style={[styles.counterText, { color: colors.textMuted }]}>
                            {phase.checklist_done}/{phase.checklist_total}
                        </Text>
                    </View>
                )}
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
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    orderBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(92,118,178,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    orderText: {
        fontSize: 11,
        fontWeight: '700',
    },
    titleSection: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
    name: {
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
    },
    meta: {
        flexDirection: 'row',
        gap: 14,
        marginTop: 8,
        paddingLeft: 34,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 11,
        fontWeight: '500',
    },
    counters: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 8,
        paddingLeft: 34,
    },
    counter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    counterText: {
        fontSize: 10,
        fontWeight: '600',
    },
});
