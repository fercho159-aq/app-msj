import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Switch,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import colors from '../../theme/colors';

type NotificationsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Notifications'>;

interface NotificationsScreenProps {
    navigation: NotificationsScreenNavigationProp;
}

interface NotificationItemProps {
    title: string;
    subtitle?: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ title, subtitle, value, onValueChange }) => (
    <View style={styles.settingItem}>
        <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>{title}</Text>
            {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
        <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFFFFF"
        />
    </View>
);

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ navigation }) => {
    const [messageNotifications, setMessageNotifications] = useState(true);
    const [showPreview, setShowPreview] = useState(true);
    const [sound, setSound] = useState(true);
    const [vibration, setVibration] = useState(true);
    const [callNotifications, setCallNotifications] = useState(true);
    const [groupNotifications, setGroupNotifications] = useState(true);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Notificaciones</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                <Text style={styles.sectionTitle}>Mensajes</Text>
                <View style={styles.section}>
                    <NotificationItem
                        title="Notificaciones de mensajes"
                        subtitle="Recibir alertas de nuevos mensajes"
                        value={messageNotifications}
                        onValueChange={setMessageNotifications}
                    />
                    <NotificationItem
                        title="Mostrar vista previa"
                        subtitle="Ver el contenido del mensaje en las notificaciones"
                        value={showPreview}
                        onValueChange={setShowPreview}
                    />
                    <NotificationItem
                        title="Sonido"
                        subtitle="Reproducir sonido al recibir mensajes"
                        value={sound}
                        onValueChange={setSound}
                    />
                    <NotificationItem
                        title="Vibración"
                        subtitle="Vibrar al recibir mensajes"
                        value={vibration}
                        onValueChange={setVibration}
                    />
                </View>

                <Text style={styles.sectionTitle}>Llamadas</Text>
                <View style={styles.section}>
                    <NotificationItem
                        title="Notificaciones de llamadas"
                        subtitle="Recibir alertas de solicitudes de llamada"
                        value={callNotifications}
                        onValueChange={setCallNotifications}
                    />
                </View>

                <Text style={styles.sectionTitle}>Grupos</Text>
                <View style={styles.section}>
                    <NotificationItem
                        title="Notificaciones de grupos"
                        subtitle="Recibir alertas de chats grupales"
                        value={groupNotifications}
                        onValueChange={setGroupNotifications}
                    />
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingBottom: 16,
        paddingHorizontal: 16,
        backgroundColor: colors.backgroundSecondary,
    },
    backButton: {
        padding: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    placeholder: {
        width: 36,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textMuted,
        marginBottom: 12,
        marginTop: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    section: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        marginBottom: 24,
        overflow: 'hidden',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.divider,
    },
    settingContent: {
        flex: 1,
        marginRight: 12,
    },
    settingTitle: {
        fontSize: 16,
        color: colors.textPrimary,
        marginBottom: 4,
    },
    settingSubtitle: {
        fontSize: 13,
        color: colors.textMuted,
    },
});

export default NotificationsScreen;
