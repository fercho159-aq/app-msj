import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Image,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
<<<<<<< HEAD
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../types';
=======
import { RootStackParamList } from '../types';
import colors, { gradients } from '../theme/colors';
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24

type SettingsNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SettingItemProps {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showArrow?: boolean;
    danger?: boolean;
<<<<<<< HEAD
    colors: any;
=======
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
}

const SettingItem: React.FC<SettingItemProps> = ({
    icon,
    title,
    subtitle,
    onPress,
    showArrow = true,
    danger = false,
<<<<<<< HEAD
    colors,
}) => (
    <TouchableOpacity
        style={[styles.settingItem, { borderBottomColor: colors.divider }]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View style={[
            styles.settingIcon,
            { backgroundColor: `${colors.primary}20` },
            danger && { backgroundColor: `${colors.error}20` }
        ]}>
=======
}) => (
    <TouchableOpacity
        style={styles.settingItem}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View style={[styles.settingIcon, danger && styles.settingIconDanger]}>
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
            <Ionicons
                name={icon}
                size={22}
                color={danger ? colors.error : colors.primary}
            />
        </View>
        <View style={styles.settingContent}>
<<<<<<< HEAD
            <Text style={[styles.settingTitle, { color: colors.textPrimary }, danger && { color: colors.error }]}>
                {title}
            </Text>
            {subtitle && <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>}
=======
            <Text style={[styles.settingTitle, danger && styles.settingTitleDanger]}>
                {title}
            </Text>
            {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
        </View>
        {showArrow && (
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        )}
    </TouchableOpacity>
);

export const SettingsScreen: React.FC = () => {
    const { user, logout } = useAuth();
<<<<<<< HEAD
    const { colors, gradients, isDark } = useTheme();
=======
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
    const navigation = useNavigation<SettingsNavigationProp>();

    const handleLogout = () => {
        Alert.alert(
            'Cerrar sesión',
            '¿Estás seguro de que deseas cerrar sesión?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Cerrar sesión',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                    },
                },
            ]
        );
    };

    return (
<<<<<<< HEAD
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
=======
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24

            <LinearGradient
                colors={[colors.backgroundSecondary, colors.background]}
                style={styles.header}
            >
                <View style={styles.headerContent}>
<<<<<<< HEAD
                    <Text style={[styles.title, { color: colors.textPrimary }]}>Ajustes</Text>
=======
                    <Text style={styles.title}>Ajustes</Text>
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Profile Section */}
                <TouchableOpacity
<<<<<<< HEAD
                    style={[styles.profileSection, { backgroundColor: colors.surface }]}
=======
                    style={styles.profileSection}
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('EditProfile')}
                >
                    <View style={styles.profileAvatar}>
                        {user?.avatar_url ? (
                            <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
                        ) : (
                            <LinearGradient
                                colors={gradients.primary as [string, string, ...string[]]}
                                style={styles.avatarPlaceholder}
                            >
<<<<<<< HEAD
                                <Text style={[styles.avatarText, { color: colors.background }]}>
=======
                                <Text style={styles.avatarText}>
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
                                    {(user?.name || 'U').charAt(0).toUpperCase()}
                                </Text>
                            </LinearGradient>
                        )}
                    </View>
                    <View style={styles.profileInfo}>
<<<<<<< HEAD
                        <Text style={[styles.profileName, { color: colors.textPrimary }]}>{user?.name || 'Usuario'}</Text>
                        <Text style={[styles.profileRfc, { color: colors.textMuted }]}>RFC: {user?.rfc || 'N/A'}</Text>
=======
                        <Text style={styles.profileName}>{user?.name || 'Usuario'}</Text>
                        <Text style={styles.profileRfc}>RFC: {user?.rfc || 'N/A'}</Text>
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
                    </View>
                    <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
                </TouchableOpacity>

                {/* Account Section */}
                <View style={styles.section}>
<<<<<<< HEAD
                    <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Cuenta</Text>
                    <View style={[styles.sectionContent, { backgroundColor: colors.surface }]}>
=======
                    <Text style={styles.sectionTitle}>Cuenta</Text>
                    <View style={styles.sectionContent}>
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
                        <SettingItem
                            icon="person-outline"
                            title="Editar perfil"
                            subtitle="Nombre, foto de perfil"
                            onPress={() => navigation.navigate('EditProfile')}
<<<<<<< HEAD
                            colors={colors}
=======
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
                        />
                        <SettingItem
                            icon="shield-checkmark-outline"
                            title="Privacidad"
                            subtitle="Última vez, foto de perfil"
                            onPress={() => navigation.navigate('Privacy')}
<<<<<<< HEAD
                            colors={colors}
=======
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
                        />
                        <SettingItem
                            icon="notifications-outline"
                            title="Notificaciones"
                            subtitle="Sonidos, alertas"
                            onPress={() => navigation.navigate('Notifications')}
<<<<<<< HEAD
                            colors={colors}
=======
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
                        />
                    </View>
                </View>

                {/* App Section */}
                <View style={styles.section}>
<<<<<<< HEAD
                    <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Aplicación</Text>
                    <View style={[styles.sectionContent, { backgroundColor: colors.surface }]}>
=======
                    <Text style={styles.sectionTitle}>Aplicación</Text>
                    <View style={styles.sectionContent}>
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
                        <SettingItem
                            icon="color-palette-outline"
                            title="Apariencia"
                            subtitle="Tema oscuro"
                            onPress={() => navigation.navigate('Appearance')}
<<<<<<< HEAD
                            colors={colors}
=======
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
                        />
                        <SettingItem
                            icon="chatbubble-outline"
                            title="Chats"
                            subtitle="Tamaño de fuente"
                            onPress={() => navigation.navigate('ChatSettings')}
<<<<<<< HEAD
                            colors={colors}
=======
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
                        />
                    </View>
                </View>

                {/* Help Section */}
                <View style={styles.section}>
<<<<<<< HEAD
                    <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Ayuda</Text>
                    <View style={[styles.sectionContent, { backgroundColor: colors.surface }]}>
=======
                    <Text style={styles.sectionTitle}>Ayuda</Text>
                    <View style={styles.sectionContent}>
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
                        <SettingItem
                            icon="help-circle-outline"
                            title="Centro de ayuda"
                            onPress={() => navigation.navigate('HelpCenter')}
<<<<<<< HEAD
                            colors={colors}
=======
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
                        />
                        <SettingItem
                            icon="document-text-outline"
                            title="Términos y condiciones"
                            onPress={() => navigation.navigate('Terms')}
<<<<<<< HEAD
                            colors={colors}
=======
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
                        />
                        <SettingItem
                            icon="information-circle-outline"
                            title="Acerca de"
                            subtitle="Versión 1.0.0"
<<<<<<< HEAD
                            colors={colors}
=======
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
                        />
                    </View>
                </View>

                {/* Logout */}
                <View style={styles.section}>
<<<<<<< HEAD
                    <View style={[styles.sectionContent, { backgroundColor: colors.surface }]}>
=======
                    <View style={styles.sectionContent}>
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
                        <SettingItem
                            icon="log-out-outline"
                            title="Cerrar sesión"
                            onPress={handleLogout}
                            showArrow={false}
                            danger
<<<<<<< HEAD
                            colors={colors}
=======
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
                        />
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
<<<<<<< HEAD
=======
        backgroundColor: colors.background,
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
    },
    header: {
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
<<<<<<< HEAD
=======
        color: colors.textPrimary,
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
<<<<<<< HEAD
=======
        backgroundColor: colors.surface,
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
    },
    profileAvatar: {
        marginRight: 14,
    },
    avatarImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    avatarPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 24,
        fontWeight: 'bold',
<<<<<<< HEAD
=======
        color: colors.textPrimary,
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 18,
        fontWeight: '600',
<<<<<<< HEAD
=======
        color: colors.textPrimary,
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
        marginBottom: 4,
    },
    profileRfc: {
        fontSize: 14,
<<<<<<< HEAD
=======
        color: colors.textMuted,
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
<<<<<<< HEAD
=======
        color: colors.textMuted,
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginLeft: 4,
    },
    sectionContent: {
<<<<<<< HEAD
=======
        backgroundColor: colors.surface,
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
        borderRadius: 16,
        overflow: 'hidden',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderBottomWidth: 0.5,
<<<<<<< HEAD
=======
        borderBottomColor: colors.divider,
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
    },
    settingIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
<<<<<<< HEAD
=======
        backgroundColor: `${colors.primary}20`,
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
<<<<<<< HEAD
=======
    settingIconDanger: {
        backgroundColor: `${colors.error}20`,
    },
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
    settingContent: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
<<<<<<< HEAD
        marginBottom: 2,
    },
    settingSubtitle: {
        fontSize: 13,
=======
        color: colors.textPrimary,
        marginBottom: 2,
    },
    settingTitleDanger: {
        color: colors.error,
    },
    settingSubtitle: {
        fontSize: 13,
        color: colors.textMuted,
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
    },
});

export default SettingsScreen;
