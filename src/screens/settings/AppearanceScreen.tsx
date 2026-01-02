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

type AppearanceScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Appearance'>;

interface AppearanceScreenProps {
    navigation: AppearanceScreenNavigationProp;
}

type ThemeOption = 'light' | 'dark' | 'system';

export const AppearanceScreen: React.FC<AppearanceScreenProps> = ({ navigation }) => {
    const [selectedTheme, setSelectedTheme] = useState<ThemeOption>('dark');

    const themeOptions: { value: ThemeOption; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
        { value: 'light', label: 'Claro', icon: 'sunny' },
        { value: 'dark', label: 'Oscuro', icon: 'moon' },
        { value: 'system', label: 'Automático del sistema', icon: 'phone-portrait-outline' },
    ];

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Apariencia</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                <Text style={styles.sectionTitle}>Tema</Text>
                <View style={styles.section}>
                    {themeOptions.map((option) => (
                        <TouchableOpacity
                            key={option.value}
                            style={styles.themeItem}
                            onPress={() => setSelectedTheme(option.value)}
                        >
                            <View style={styles.themeIconContainer}>
                                <Ionicons name={option.icon} size={22} color={colors.primary} />
                            </View>
                            <Text style={styles.themeLabel}>{option.label}</Text>
                            <View style={styles.radioContainer}>
                                <View style={[
                                    styles.radioOuter,
                                    selectedTheme === option.value && styles.radioOuterSelected
                                ]}>
                                    {selectedTheme === option.value && (
                                        <View style={styles.radioInner} />
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.previewContainer}>
                    <Text style={styles.previewTitle}>Vista previa</Text>
                    <View style={styles.previewBox}>
                        <View style={styles.previewHeader}>
                            <View style={styles.previewAvatar} />
                            <View style={styles.previewHeaderText}>
                                <View style={styles.previewName} />
                                <View style={styles.previewStatus} />
                            </View>
                        </View>
                        <View style={styles.previewMessages}>
                            <View style={styles.previewMessageLeft} />
                            <View style={styles.previewMessageRight} />
                            <View style={styles.previewMessageLeft} />
                        </View>
                    </View>
                </View>

                <Text style={styles.infoText}>
                    El tema actual es <Text style={styles.infoHighlight}>oscuro</Text>.
                    Los cambios se aplicarán inmediatamente.
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
    themeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.divider,
    },
    themeIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: `${colors.primary}20`,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    themeLabel: {
        flex: 1,
        fontSize: 16,
        color: colors.textPrimary,
    },
    radioContainer: {
        padding: 4,
    },
    radioOuter: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioOuterSelected: {
        borderColor: colors.primary,
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.primary,
    },
    previewContainer: {
        marginBottom: 24,
    },
    previewTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textMuted,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    previewBox: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        overflow: 'hidden',
    },
    previewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    previewAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary,
        marginRight: 12,
    },
    previewHeaderText: {
        flex: 1,
    },
    previewName: {
        height: 14,
        width: 100,
        backgroundColor: colors.textSecondary,
        borderRadius: 4,
        marginBottom: 6,
        opacity: 0.3,
    },
    previewStatus: {
        height: 10,
        width: 60,
        backgroundColor: colors.textMuted,
        borderRadius: 4,
        opacity: 0.3,
    },
    previewMessages: {
        gap: 8,
    },
    previewMessageLeft: {
        height: 36,
        width: '60%',
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    previewMessageRight: {
        height: 36,
        width: '50%',
        backgroundColor: colors.primary,
        borderRadius: 12,
        alignSelf: 'flex-end',
        opacity: 0.7,
    },
    infoText: {
        fontSize: 13,
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 20,
    },
    infoHighlight: {
        color: colors.primary,
        fontWeight: '600',
    },
});

export default AppearanceScreen;
