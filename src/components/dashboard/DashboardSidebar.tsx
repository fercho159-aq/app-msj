import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export type DashboardView = 'dashboard' | 'gestion' | 'documentos';

interface SidebarProps {
    activeView: DashboardView;
    onChangeView: (view: DashboardView) => void;
    onNavigateTab?: (tab: string) => void;
    collapsed?: boolean;
}

const NAV_ITEMS: { key: DashboardView; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: 'analytics-outline' },
    { key: 'gestion', label: 'Gestion de Clientes', icon: 'briefcase-outline' },
    { key: 'documentos', label: 'Documentos', icon: 'document-text-outline' },
];

const SECONDARY_NAV: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'Chats', label: 'Chats', icon: 'chatbubbles-outline' },
    { key: 'Settings', label: 'Ajustes', icon: 'settings-outline' },
];

export const DashboardSidebar: React.FC<SidebarProps> = ({ activeView, onChangeView, onNavigateTab, collapsed }) => {
    const { colors, isDark } = useTheme();

    return (
        <View style={[
            styles.container,
            {
                backgroundColor: isDark ? '#0a0a0a' : 'rgba(255,255,255,0.95)',
                borderRightColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            },
            collapsed && styles.containerCollapsed,
        ]}>
            <View style={[styles.logoSection, collapsed && styles.logoSectionCollapsed]}>
                <View style={[styles.logoCircle, { backgroundColor: `${colors.primary}15` }]}>
                    <Ionicons name="business-outline" size={22} color={colors.primary} />
                </View>
                {!collapsed && (
                    <>
                        <Text style={[styles.logoText, { color: colors.textPrimary }]}>Yaakob</Text>
                        <Text style={[styles.logoSub, { color: colors.textMuted }]}>Panel Admin</Text>
                    </>
                )}
            </View>

            <View style={styles.nav}>
                {NAV_ITEMS.map(item => {
                    const isActive = activeView === item.key;
                    return (
                        <TouchableOpacity
                            key={item.key}
                            style={[
                                styles.navItem,
                                isActive && {
                                    backgroundColor: `${colors.primary}12`,
                                },
                                collapsed && styles.navItemCollapsed,
                            ]}
                            onPress={() => onChangeView(item.key)}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={isActive ? (item.icon.replace('-outline', '') as any) : item.icon}
                                size={20}
                                color={isActive ? colors.primary : colors.textMuted}
                            />
                            {!collapsed && (
                                <Text style={[
                                    styles.navLabel,
                                    { color: isActive ? colors.primary : colors.textSecondary },
                                    isActive && styles.navLabelActive,
                                ]}>
                                    {item.label}
                                </Text>
                            )}
                            {isActive && !collapsed && (
                                <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} />
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Secondary nav at bottom */}
            <View style={styles.spacer} />
            <View style={[styles.secondaryNav, {
                borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            }]}>
                {SECONDARY_NAV.map(item => (
                    <TouchableOpacity
                        key={item.key}
                        style={[styles.secondaryItem, collapsed && styles.navItemCollapsed]}
                        onPress={() => onNavigateTab?.(item.key)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name={item.icon} size={18} color={colors.textMuted} />
                        {!collapsed && (
                            <Text style={[styles.secondaryLabel, { color: colors.textSecondary }]}>
                                {item.label}
                            </Text>
                        )}
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 220,
        borderRightWidth: 1,
        paddingTop: 24,
        paddingHorizontal: 12,
        flexShrink: 0,
    },
    containerCollapsed: {
        width: 68,
        paddingHorizontal: 8,
    },
    logoSection: {
        alignItems: 'center',
        paddingBottom: 24,
        marginBottom: 8,
    },
    logoSectionCollapsed: {
        paddingBottom: 16,
        marginBottom: 4,
    },
    logoCircle: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    logoText: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    logoSub: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2,
    },
    nav: {
        gap: 4,
    },
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
        position: 'relative',
    },
    navItemCollapsed: {
        justifyContent: 'center',
        paddingHorizontal: 0,
        gap: 0,
    },
    navLabel: {
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
    },
    navLabelActive: {
        fontWeight: '700',
    },
    activeIndicator: {
        position: 'absolute',
        left: 0,
        top: 8,
        bottom: 8,
        width: 3,
        borderRadius: 2,
    },
    spacer: {
        flex: 1,
    },
    secondaryNav: {
        borderTopWidth: 1,
        paddingTop: 12,
        paddingBottom: 20,
        gap: 2,
    },
    secondaryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 10,
    },
    secondaryLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
});
