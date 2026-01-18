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

type PrivacyScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Privacy'>;

interface PrivacyScreenProps {
    navigation: PrivacyScreenNavigationProp;
}

interface PrivacyItemProps {
    title: string;
    subtitle?: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
}

const PrivacyItem: React.FC<PrivacyItemProps> = ({ title, subtitle, value, onValueChange }) => (
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

export const PrivacyScreen: React.FC<PrivacyScreenProps> = ({ navigation }) => {
    const [showLastSeen, setShowLastSeen] = useState(true);
    const [showProfilePhoto, setShowProfilePhoto] = useState(true);
    const [showStatus, setShowStatus] = useState(true);
    const [readReceipts, setReadReceipts] = useState(true);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Privacidad</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                <Text style={styles.sectionTitle}>Quién puede ver mi información</Text>
                <View style={styles.section}>
                    <PrivacyItem
                        title="Última vez en línea"
                        subtitle="Mostrar cuándo estuve activo por última vez"
                        value={showLastSeen}
                        onValueChange={setShowLastSeen}
                    />
                    <PrivacyItem
                        title="Foto de perfil"
                        subtitle="Mostrar mi foto de perfil a todos"
                        value={showProfilePhoto}
                        onValueChange={setShowProfilePhoto}
                    />
                    <PrivacyItem
                        title="Estado"
                        subtitle="Mostrar mi estado en línea"
                        value={showStatus}
                        onValueChange={setShowStatus}
                    />
                </View>

                <Text style={styles.sectionTitle}>Mensajes</Text>
                <View style={styles.section}>
                    <PrivacyItem
                        title="Confirmaciones de lectura"
                        subtitle="Mostrar cuando leí los mensajes"
                        value={readReceipts}
                        onValueChange={setReadReceipts}
                    />
                </View>

                <Text style={styles.infoText}>
                    Los cambios de privacidad se aplicarán a todas las conversaciones.
                </Text>
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
    infoText: {
        fontSize: 13,
        color: colors.textMuted,
        textAlign: 'center',
        marginTop: 8,
    },
});

export default PrivacyScreen;
