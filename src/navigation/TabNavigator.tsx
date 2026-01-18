import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { ChatsScreen, SettingsScreen, CallsScreen } from '../screens';
import { BottomTabParamList } from '../types';
import { useTheme } from '../context/ThemeContext';

const Tab = createBottomTabNavigator<BottomTabParamList>();

interface TabIconProps {
    name: any;
    focused: boolean;
    color: string;
    primaryColor: string;
}

const TabIcon: React.FC<TabIconProps> = ({ name, focused, color, primaryColor }) => {
    if (focused) {
        return (
            <View style={styles.activeIconContainer}>
                <View style={[styles.activeIconBg, { backgroundColor: `${primaryColor}30` }]} />
                <Ionicons name={name} size={24} color={primaryColor} />
            </View>
        );
    }
    return <Ionicons name={name} size={24} color={color} />;
};

export const TabNavigator: React.FC = () => {
    const { colors } = useTheme();

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
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
                            primaryColor={colors.primary}
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
                            primaryColor={colors.primary}
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
                            primaryColor={colors.primary}
                        />
                    ),
                }}
            />
        </Tab.Navigator>
    );
};

const styles = StyleSheet.create({
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
    },
});

export default TabNavigator;
