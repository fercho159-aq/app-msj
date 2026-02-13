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
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../types';

type SettingsNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SettingItemProps {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showArrow?: boolean;
    danger?: boolean;
    colors: any;
}

const SettingItem: React.FC<SettingItemProps> = ({
    icon,
    title,
    subtitle,
    onPress,
    showArrow = true,
    danger = false,
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
            <Ionicons
                name={icon}
                size={22}
                color={danger ? colors.error : colors.primary}
            />
        </View>
        <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: colors.textPrimary }, danger && { color: colors.error }]}>
                {title}
            </Text>
            {subtitle && <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>}
        </View>
        {showArrow && (
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        )}
    </TouchableOpacity>
);

export const SettingsScreen: React.FC = () => {
    const { user, logout, deleteAccount } = useAuth();
    const { colors, gradients, isDark } = useTheme();
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

    const handleDeleteAccount = () => {
        Alert.alert(
            'Eliminar cuenta',
            '¿Estás seguro de que deseas eliminar tu cuenta? Esta acción es permanente y se borrarán todos tus datos.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar cuenta',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert(
                            'Confirmar eliminación',
                            'Esta acción no se puede deshacer. ¿Deseas continuar?',
                            [
                                { text: 'No, conservar mi cuenta', style: 'cancel' },
                                {
                                    text: 'Sí, eliminar',
                                    style: 'destructive',
                                    onPress: async () => {
                                        const result = await deleteAccount();
                                        if (!result.success) {
                                            Alert.alert('Error', result.error || 'No se pudo eliminar la cuenta. Intenta de nuevo.');
                                        }
                                    },
                                },
                            ]
                        );
                    },
                },
            ]
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            <LinearGradient
                colors={[colors.backgroundSecondary, colors.background]}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <Text style={[styles.title, { color: colors.textPrimary }]}>Ajustes</Text>
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Profile Section */}
                <TouchableOpacity
                    style={[styles.profileSection, { backgroundColor: colors.surface }]}
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
                                <Text style={[styles.avatarText, { color: colors.background }]}>
                                    {(user?.name || 'U').charAt(0).toUpperCase()}
                                </Text>
                            </LinearGradient>
                        )}
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={[styles.profileName, { color: colors.textPrimary }]}>{user?.name || 'Usuario'}</Text>
                        <Text style={[styles.profileRfc, { color: colors.textMuted }]}>RFC: {user?.rfc || 'N/A'}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
                </TouchableOpacity>

                {/* Account Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Cuenta</Text>
                    <View style={[styles.sectionContent, { backgroundColor: colors.surface }]}>
                        <SettingItem
                            icon="person-outline"
                            title="Editar perfil"
                            subtitle="Nombre, foto de perfil"
                            onPress={() => navigation.navigate('EditProfile')}
                            colors={colors}
                        />
                        <SettingItem
                            icon="shield-checkmark-outline"
                            title="Privacidad"
                            subtitle="Última vez, foto de perfil"
                            onPress={() => navigation.navigate('Privacy')}
                            colors={colors}
                        />
                        <SettingItem
                            icon="notifications-outline"
                            title="Notificaciones"
                            subtitle="Sonidos, alertas"
                            onPress={() => navigation.navigate('Notifications')}
                            colors={colors}
                        />
                    </View>
                </View>

                {/* App Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Aplicación</Text>
                    <View style={[styles.sectionContent, { backgroundColor: colors.surface }]}>
                        <SettingItem
                            icon="color-palette-outline"
                            title="Apariencia"
                            subtitle="Tema oscuro"
                            onPress={() => navigation.navigate('Appearance')}
                            colors={colors}
                        />
                        <SettingItem
                            icon="chatbubble-outline"
                            title="Chats"
                            subtitle="Tamaño de fuente"
                            onPress={() => navigation.navigate('ChatSettings')}
                            colors={colors}
                        />
                    </View>
                </View>

                {/* Help Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Ayuda</Text>
                    <View style={[styles.sectionContent, { backgroundColor: colors.surface }]}>
                        <SettingItem
                            icon="help-circle-outline"
                            title="Centro de ayuda"
                            onPress={() => navigation.navigate('HelpCenter')}
                            colors={colors}
                        />
                        <SettingItem
                            icon="document-text-outline"
                            title="Términos y condiciones"
                            onPress={() => navigation.navigate('Terms')}
                            colors={colors}
                        />
                        <SettingItem
                            icon="information-circle-outline"
                            title="Acerca de"
                            subtitle="Versión 1.0.0"
                            colors={colors}
                        />
                    </View>
                </View>

                {/* Logout */}
                <View style={styles.section}>
                    <View style={[styles.sectionContent, { backgroundColor: colors.surface }]}>
                        <SettingItem
                            icon="log-out-outline"
                            title="Cerrar sesión"
                            onPress={handleLogout}
                            showArrow={false}
                            danger
                            colors={colors}
                        />
                    </View>
                </View>

                {/* Delete Account */}
                <View style={styles.section}>
                    <View style={[styles.sectionContent, { backgroundColor: colors.surface }]}>
                        <SettingItem
                            icon="trash-outline"
                            title="Eliminar cuenta"
                            subtitle="Elimina permanentemente tu cuenta y datos"
                            onPress={handleDeleteAccount}
                            showArrow={false}
                            danger
                            colors={colors}
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
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    profileRfc: {
        fontSize: 14,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginLeft: 4,
    },
    sectionContent: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderBottomWidth: 0.5,
    },
    settingIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    settingContent: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        marginBottom: 2,
    },
    settingSubtitle: {
        fontSize: 13,
    },
});

export default SettingsScreen;
