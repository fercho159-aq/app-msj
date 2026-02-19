import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface ChartContainerProps {
    title: string;
    children: React.ReactNode;
    rightContent?: React.ReactNode;
    subtitle?: string;
    fullWidth?: boolean;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
    title,
    children,
    rightContent,
    subtitle,
    fullWidth,
}) => {
    const { colors, isDark } = useTheme();

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.85)',
                    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                },
                fullWidth && styles.fullWidth,
            ]}
        >
            <View style={styles.header}>
                <View style={styles.titleGroup}>
                    <View style={[styles.titleDot, { backgroundColor: colors.primary }]} />
                    <View>
                        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
                        {subtitle && (
                            <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
                        )}
                    </View>
                </View>
                {rightContent}
            </View>
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
            <View style={styles.content}>
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 14,
        borderWidth: 1,
        overflow: 'hidden',
        ...(Platform.OS === 'web' ? {
            // @ts-ignore
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
        } : {}),
    },
    fullWidth: {
        marginBottom: 14,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 14,
    },
    titleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    titleDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    subtitle: {
        fontSize: 12,
        marginTop: 2,
        fontWeight: '500',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginHorizontal: 20,
    },
    content: {
        padding: 20,
        paddingTop: 16,
    },
});
