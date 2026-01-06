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
import { RootStackParamList } from '../types';
import colors, { gradients } from '../theme/colors';

type SettingsNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SettingItemProps {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showArrow?: boolean;
    danger?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
    icon,
    title,
    subtitle,
    onPress,
    showArrow = true,
    danger = false,
}) => (
    <TouchableOpacity
        style={styles.settingItem}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View style={[styles.settingIcon, danger && styles.settingIconDanger]}>
            <Ionicons
                name={icon}
                size={22}
                color={danger ? colors.error : colors.primary}
            />
        </View>
        <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, danger && styles.settingTitleDanger]}>
                {title}
            </Text>
            {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
        {showArrow && (
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        )}
    </TouchableOpacity>
);

export const SettingsScreen: React.FC = () => {
    const { user, logout } = useAuth();
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
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <LinearGradient
                colors={[colors.backgroundSecondary, colors.background]}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <Text style={styles.title}>Ajustes</Text>
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Profile Section */}
                <TouchableOpacity
                    style={styles.profileSection}
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
                                <Text style={styles.avatarText}>
                                    {(user?.name || 'U').charAt(0).toUpperCase()}
                                </Text>
                            </LinearGradient>
                        )}
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>{user?.name || 'Usuario'}</Text>
                        <Text style={styles.profileRfc}>RFC: {user?.rfc || 'N/A'}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
                </TouchableOpacity>

                {/* Account Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Cuenta</Text>
                    <View style={styles.sectionContent}>
                        <SettingItem
                            icon="person-outline"
                            title="Editar perfil"
                            subtitle="Nombre, foto de perfil"
                            onPress={() => navigation.navigate('EditProfile')}
                        />
                        <SettingItem
                            icon="shield-checkmark-outline"
                            title="Privacidad"
                            subtitle="Última vez, foto de perfil"
                            onPress={() => navigation.navigate('Privacy')}
                        />
                        <SettingItem
                            icon="notifications-outline"
                            title="Notificaciones"
                            subtitle="Sonidos, alertas"
                            onPress={() => navigation.navigate('Notifications')}
                        />
                    </View>
                </View>

                {/* App Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Aplicación</Text>
                    <View style={styles.sectionContent}>
                        <SettingItem
                            icon="color-palette-outline"
                            title="Apariencia"
                            subtitle="Tema oscuro"
                            onPress={() => navigation.navigate('Appearance')}
                        />
                        <SettingItem
                            icon="chatbubble-outline"
                            title="Chats"
                            subtitle="Tamaño de fuente"
                            onPress={() => navigation.navigate('ChatSettings')}
                        />
                    </View>
                </View>

                {/* Help Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Ayuda</Text>
                    <View style={styles.sectionContent}>
                        <SettingItem
                            icon="help-circle-outline"
                            title="Centro de ayuda"
                            onPress={() => navigation.navigate('HelpCenter')}
                        />
                        <SettingItem
                            icon="document-text-outline"
                            title="Términos y condiciones"
                            onPress={() => navigation.navigate('Terms')}
                        />
                        <SettingItem
                            icon="information-circle-outline"
                            title="Acerca de"
                            subtitle="Versión 1.0.0"
                        />
                    </View>
                </View>

                {/* Logout */}
                <View style={styles.section}>
                    <View style={styles.sectionContent}>
                        <SettingItem
                            icon="log-out-outline"
                            title="Cerrar sesión"
                            onPress={handleLogout}
                            showArrow={false}
                            danger
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
        backgroundColor: colors.background,
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
        color: colors.textPrimary,
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
        backgroundColor: colors.surface,
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
        color: colors.textPrimary,
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    profileRfc: {
        fontSize: 14,
        color: colors.textMuted,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textMuted,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginLeft: 4,
    },
    sectionContent: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        overflow: 'hidden',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.divider,
    },
    settingIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: `${colors.primary}20`,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    settingIconDanger: {
        backgroundColor: `${colors.error}20`,
    },
    settingContent: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        color: colors.textPrimary,
        marginBottom: 2,
    },
    settingTitleDanger: {
        color: colors.error,
    },
    settingSubtitle: {
        fontSize: 13,
        color: colors.textMuted,
    },
});

export default SettingsScreen;
