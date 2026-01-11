import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { useTheme, ThemeMode } from '../../context/ThemeContext';

type AppearanceScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Appearance'>;

interface AppearanceScreenProps {
    navigation: AppearanceScreenNavigationProp;
}

export const AppearanceScreen: React.FC<AppearanceScreenProps> = ({ navigation }) => {
    const { theme, setTheme, colors, isDark } = useTheme();

    const themeOptions: { value: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
        { value: 'light', label: 'Claro', icon: 'sunny' },
        { value: 'dark', label: 'Oscuro', icon: 'moon' },
        { value: 'system', label: 'Automático del sistema', icon: 'phone-portrait-outline' },
    ];

    const getThemeLabel = () => {
        switch (theme) {
            case 'light': return 'claro';
            case 'dark': return 'oscuro';
            case 'system': return isDark ? 'oscuro (sistema)' : 'claro (sistema)';
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.backgroundSecondary }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.textPrimary }]}>Apariencia</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Tema</Text>
                <View style={[styles.section, { backgroundColor: colors.surface }]}>
                    {themeOptions.map((option) => (
                        <TouchableOpacity
                            key={option.value}
                            style={[styles.themeItem, { borderBottomColor: colors.divider }]}
                            onPress={() => setTheme(option.value)}
                        >
                            <View style={[styles.themeIconContainer, { backgroundColor: `${colors.primary}20` }]}>
                                <Ionicons name={option.icon} size={22} color={colors.primary} />
                            </View>
                            <Text style={[styles.themeLabel, { color: colors.textPrimary }]}>{option.label}</Text>
                            <View style={styles.radioContainer}>
                                <View style={[
                                    styles.radioOuter,
                                    { borderColor: colors.border },
                                    theme === option.value && { borderColor: colors.primary }
                                ]}>
                                    {theme === option.value && (
                                        <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.previewContainer}>
                    <Text style={[styles.previewTitle, { color: colors.textMuted }]}>Vista previa</Text>
                    <View style={[styles.previewBox, { backgroundColor: colors.surface }]}>
                        <View style={styles.previewHeader}>
                            <View style={[styles.previewAvatar, { backgroundColor: colors.primary }]} />
                            <View style={styles.previewHeaderText}>
                                <View style={[styles.previewName, { backgroundColor: colors.textSecondary }]} />
                                <View style={[styles.previewStatus, { backgroundColor: colors.textMuted }]} />
                            </View>
                        </View>
                        <View style={styles.previewMessages}>
                            <View style={[styles.previewMessageLeft, { backgroundColor: colors.surface, borderColor: colors.border }]} />
                            <View style={[styles.previewMessageRight, { backgroundColor: colors.primary }]} />
                            <View style={[styles.previewMessageLeft, { backgroundColor: colors.surface, borderColor: colors.border }]} />
                        </View>
                    </View>
                </View>

                <Text style={[styles.infoText, { color: colors.textMuted }]}>
                    El tema actual es <Text style={[styles.infoHighlight, { color: colors.primary }]}>{getThemeLabel()}</Text>.
                    Los cambios se aplican inmediatamente.
                </Text>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingBottom: 16,
        paddingHorizontal: 16,
    },
    backButton: {
        padding: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
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
        marginBottom: 12,
        marginTop: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    section: {
        borderRadius: 16,
        marginBottom: 24,
        overflow: 'hidden',
    },
    themeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 0.5,
    },
    themeIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    themeLabel: {
        flex: 1,
        fontSize: 16,
    },
    radioContainer: {
        padding: 4,
    },
    radioOuter: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    previewContainer: {
        marginBottom: 24,
    },
    previewTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    previewBox: {
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
        marginRight: 12,
    },
    previewHeaderText: {
        flex: 1,
    },
    previewName: {
        height: 14,
        width: 100,
        borderRadius: 4,
        marginBottom: 6,
        opacity: 0.3,
    },
    previewStatus: {
        height: 10,
        width: 60,
        borderRadius: 4,
        opacity: 0.3,
    },
    previewMessages: {
        gap: 8,
    },
    previewMessageLeft: {
        height: 36,
        width: '60%',
        borderRadius: 12,
        borderWidth: 1,
    },
    previewMessageRight: {
        height: 36,
        width: '50%',
        borderRadius: 12,
        alignSelf: 'flex-end',
        opacity: 0.7,
    },
    infoText: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
    },
    infoHighlight: {
        fontWeight: '600',
    },
});

export default AppearanceScreen;
