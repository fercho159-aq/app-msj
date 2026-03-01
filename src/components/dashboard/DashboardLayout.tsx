import React from 'react';
import { View, StyleSheet } from 'react-native';
import { DashboardSidebar, DashboardView } from './DashboardSidebar';

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
    return (
        <View style={styles.container}>
            <DashboardSidebar
                activeView={activeView}
                onChangeView={onChangeView}
                onNavigateTab={onNavigateTab}
            />
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
});
