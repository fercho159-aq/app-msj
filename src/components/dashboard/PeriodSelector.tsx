import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

type Period = '7d' | '30d' | '90d';

interface PeriodSelectorProps {
    selected: Period;
    onChange: (period: Period) => void;
}

const periods: { value: Period; label: string }[] = [
    { value: '7d', label: '7d' },
    { value: '30d', label: '30d' },
    { value: '90d', label: '90d' },
];

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({ selected, onChange }) => {
    const { colors } = useTheme();

    return (
        <View style={styles.container}>
            {periods.map(({ value, label }) => {
                const isActive = selected === value;
                return (
                    <TouchableOpacity
                        key={value}
                        style={[
                            styles.button,
                            { backgroundColor: isActive ? colors.primary : colors.background },
                        ]}
                        onPress={() => onChange(value)}
                    >
                        <Text
                            style={[
                                styles.label,
                                { color: isActive ? '#FFFFFF' : colors.textMuted },
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
        gap: 6,
    },
    button: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
    },
});
