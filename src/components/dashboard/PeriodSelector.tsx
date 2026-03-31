import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

type Period = '7d' | '30d' | '90d';

interface PeriodSelectorProps {
    selected: Period;
    onChange: (period: Period) => void;
}

const periods: { value: Period; label: string }[] = [
    { value: '7d', label: '7 dias' },
    { value: '30d', label: '30 dias' },
    { value: '90d', label: '90 dias' },
];

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({ selected, onChange }) => {
    const { colors, isDark } = useTheme();

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                },
            ]}
        >
            {periods.map(({ value, label }) => {
                const isActive = selected === value;
                return (
                    <TouchableOpacity
                        key={value}
                        style={[
                            styles.button,
                            isActive && {
                                backgroundColor: colors.primary,
                                ...(Platform.OS === 'web' ? {
                                    // @ts-ignore
                                    boxShadow: `0 2px 8px ${colors.primary}40`,
                                } : {}),
                            },
                        ]}
                        onPress={() => onChange(value)}
                        activeOpacity={0.7}
                    >
                        <Text
                            style={[
                                styles.label,
                                { color: isActive ? '#FFFFFF' : colors.textMuted },
                                isActive && styles.labelActive,
                            ]}
                        >
                            {label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        borderRadius: 10,
        padding: 3,
        gap: 2,
    },
    button: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 8,
        ...(Platform.OS === 'web' ? {
            // @ts-ignore
            transition: 'all 0.2s ease',
            cursor: 'pointer',
        } : {}),
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
    },
    labelActive: {
        fontWeight: '700',
    },
});
