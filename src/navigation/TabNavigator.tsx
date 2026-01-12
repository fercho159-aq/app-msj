import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { ChatsScreen, SettingsScreen, CallsScreen } from '../screens';
import { BottomTabParamList } from '../types';
<<<<<<< HEAD
import { useTheme } from '../context/ThemeContext';
=======
import colors from '../theme/colors';
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24

const Tab = createBottomTabNavigator<BottomTabParamList>();

interface TabIconProps {
    name: any;
    focused: boolean;
    color: string;
<<<<<<< HEAD
    primaryColor: string;
}

const TabIcon: React.FC<TabIconProps> = ({ name, focused, color, primaryColor }) => {
    if (focused) {
        return (
            <View style={styles.activeIconContainer}>
                <View style={[styles.activeIconBg, { backgroundColor: `${primaryColor}30` }]} />
                <Ionicons name={name} size={24} color={primaryColor} />
=======
}

const TabIcon: React.FC<TabIconProps> = ({ name, focused, color }) => {
    if (focused) {
        return (
            <View style={styles.activeIconContainer}>
                <View style={styles.activeIconBg} />
                <Ionicons name={name} size={24} color={colors.textPrimary} />
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
            </View>
        );
    }
    return <Ionicons name={name} size={24} color={color} />;
};

export const TabNavigator: React.FC = () => {
<<<<<<< HEAD
    const { colors } = useTheme();

=======
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
<<<<<<< HEAD
                tabBarStyle: {
                    backgroundColor: colors.backgroundSecondary,
                    borderTopWidth: 0,
                    height: 85,
                    paddingTop: 10,
                    paddingBottom: 25,
                    shadowColor: colors.shadow,
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 10,
                },
=======
                tabBarStyle: styles.tabBar,
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
                tabBarShowLabel: true,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarLabelStyle: styles.tabLabel,
            }}
        >
            <Tab.Screen
                name="Chats"
                component={ChatsScreen}
                options={{
                    tabBarLabel: 'Chats',
                    tabBarIcon: ({ focused, color }) => (
                        <TabIcon
                            name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
                            focused={focused}
                            color={color}
<<<<<<< HEAD
                            primaryColor={colors.primary}
=======
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
                        />
                    ),
                }}
            />
            <Tab.Screen
                name="Calls"
                component={CallsScreen}
                options={{
                    tabBarLabel: 'Llamadas',
                    tabBarIcon: ({ focused, color }) => (
                        <TabIcon
                            name={focused ? 'call' : 'call-outline'}
                            focused={focused}
                            color={color}
<<<<<<< HEAD
                            primaryColor={colors.primary}
=======
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
                        />
                    ),
                }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                    tabBarLabel: 'Ajustes',
                    tabBarIcon: ({ focused, color }) => (
                        <TabIcon
                            name={focused ? 'settings' : 'settings-outline'}
                            focused={focused}
                            color={color}
<<<<<<< HEAD
                            primaryColor={colors.primary}
=======
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
                        />
                    ),
                }}
            />
        </Tab.Navigator>
    );
};

const styles = StyleSheet.create({
<<<<<<< HEAD
=======
    tabBar: {
        backgroundColor: colors.backgroundSecondary,
        borderTopWidth: 0,
        height: 85,
        paddingTop: 10,
        paddingBottom: 25,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 10,
    },
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
    tabLabel: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 4,
    },
    activeIconContainer: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        width: 48,
        height: 32,
    },
    activeIconBg: {
        position: 'absolute',
        width: 48,
        height: 32,
        borderRadius: 16,
<<<<<<< HEAD
=======
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
    },
});

export default TabNavigator;
<<<<<<< HEAD
=======

>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
