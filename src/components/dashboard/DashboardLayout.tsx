import React, { useState } from 'react';
import { View, StyleSheet, useWindowDimensions, TouchableOpacity, TouchableWithoutFeedback, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { DashboardSidebar, DashboardView } from './DashboardSidebar';

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

interface DashboardLayoutProps {
    activeView: DashboardView;
    onChangeView: (view: DashboardView) => void;
    onNavigateTab?: (tab: string) => void;
    children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
    activeView,
    onChangeView,
    onNavigateTab,
    children,
}) => {
    const { width } = useWindowDimensions();
    const { colors, isDark } = useTheme();
    const isMobile = width < MOBILE_BREAKPOINT;
    const isTablet = width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT;
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleChangeView = (view: DashboardView) => {
        onChangeView(view);
        if (isMobile) setSidebarOpen(false);
    };

    const handleNavigateTab = (tab: string) => {
        onNavigateTab?.(tab);
        if (isMobile) setSidebarOpen(false);
    };

    return (
        <View style={styles.container}>
            {/* Desktop/Tablet sidebar */}
            {!isMobile && (
                <DashboardSidebar
                    activeView={activeView}
                    onChangeView={onChangeView}
                    onNavigateTab={onNavigateTab}
                    collapsed={isTablet}
                />
            )}

            {/* Mobile hamburger button */}
            {isMobile && (
                <TouchableOpacity
                    style={[styles.hamburger, {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    }]}
                    onPress={() => setSidebarOpen(true)}
                    activeOpacity={0.7}
                >
                    <Ionicons name="menu" size={22} color={colors.textPrimary} />
                </TouchableOpacity>
            )}

            {/* Mobile sidebar overlay */}
            {isMobile && sidebarOpen && (
                <>
                    <TouchableWithoutFeedback onPress={() => setSidebarOpen(false)}>
                        <View style={styles.overlay} />
                    </TouchableWithoutFeedback>
                    <View style={[styles.mobileSidebar, {
                        backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
                        ...(Platform.OS === 'web' ? {
                            // @ts-ignore
                            boxShadow: '4px 0 24px rgba(0,0,0,0.2)',
                        } : {}),
                    }]}>
                        <DashboardSidebar
                            activeView={activeView}
                            onChangeView={handleChangeView}
                            onNavigateTab={handleNavigateTab}
                        />
                    </View>
                </>
            )}

            <View style={styles.content}>
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
    },
    content: {
        flex: 1,
    },
    hamburger: {
        position: 'absolute',
        top: 16,
        left: 12,
        zIndex: 100,
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        zIndex: 998,
    },
    mobileSidebar: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 999,
        width: 260,
    },
});
