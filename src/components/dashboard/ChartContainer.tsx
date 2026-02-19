import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface ChartContainerProps {
    title: string;
    children: React.ReactNode;
    rightContent?: React.ReactNode;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({ title, children, rightContent }) => {
    const { colors } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
                {rightContent}
            </View>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
    },
});
