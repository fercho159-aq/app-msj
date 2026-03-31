import React from 'react';
import { View, Text, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';

interface StatCardProps {
    title: string;
    value: number | string;
    icon: keyof typeof Ionicons.glyphMap;
    color?: string;
    accentGradient?: [string, string];
    subtitle?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    icon,
    color,
    accentGradient,
    subtitle,
}) => {
    const { colors, isDark } = useTheme();
    const { width: screenWidth } = useWindowDimensions();
    const isMobile = screenWidth < 768;
    const iconColor = color || colors.primary;
    const gradient = accentGradient || [iconColor, `${iconColor}88`];

    return (
        <View
            style={[
                styles.card,
                {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.9)',
                    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                },
                isMobile && styles.cardMobile,
            ]}
        >
            {/* Accent strip */}
            <LinearGradient
                colors={gradient as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.accentStrip}
            />

            <View style={styles.cardInner}>
                <View style={styles.topRow}>
                    <View style={[styles.iconContainer, { backgroundColor: `${iconColor}12` }]}>
                        <Ionicons name={icon} size={20} color={iconColor} />
                    </View>
                    <Text style={[styles.title, { color: colors.textMuted }]}>{title}</Text>
                </View>

                <Text style={[styles.value, { color: colors.textPrimary }]}>
                    {typeof value === 'number' ? value.toLocaleString('es-MX') : value}
                </Text>

                {subtitle && (
                    <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        flex: 1,
        minWidth: 200,
        maxWidth: '100%',
        borderRadius: 14,
        borderWidth: 1,
        overflow: 'hidden' as const,
        flexDirection: 'row' as const,
        marginBottom: 0,
    },
    cardMobile: {
        minWidth: 140,
    },
    accentStrip: {
        width: 4,
        alignSelf: 'stretch',
    },
    cardInner: {
        flex: 1,
        padding: 18,
        paddingLeft: 16,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        flex: 1,
    },
    value: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -1,
        lineHeight: 32,
    },
    subtitle: {
        fontSize: 12,
        marginTop: 6,
        fontWeight: '500',
    },
});
