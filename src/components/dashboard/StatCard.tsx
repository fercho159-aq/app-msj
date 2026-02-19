import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface StatCardProps {
    title: string;
    value: number | string;
    icon: keyof typeof Ionicons.glyphMap;
    color?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => {
    const { colors } = useTheme();
    const iconColor = color || colors.primary;

    return (
        <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
            <View style={[styles.iconContainer, { backgroundColor: `${iconColor}18` }]}>
                <Ionicons name={icon} size={24} color={iconColor} />
            </View>
            <Text style={[styles.value, { color: colors.textPrimary }]}>
                {typeof value === 'number' ? value.toLocaleString() : value}
            </Text>
            <Text style={[styles.title, { color: colors.textMuted }]}>{title}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        width: '48%',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    value: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 4,
    },
    title: {
        fontSize: 13,
        fontWeight: '500',
    },
});
