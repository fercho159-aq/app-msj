import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import colors from '../../theme/colors';

type ChatSettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ChatSettings'>;

interface ChatSettingsScreenProps {
    navigation: ChatSettingsScreenNavigationProp;
}

export const ChatSettingsScreen: React.FC<ChatSettingsScreenProps> = ({ navigation }) => {
    const [fontSize, setFontSize] = useState(16);

    const fontSizeLabels = [
        { size: 12, label: 'Pequeño' },
        { size: 14, label: 'Normal' },
        { size: 16, label: 'Mediano' },
        { size: 18, label: 'Grande' },
        { size: 20, label: 'Muy grande' },
    ];

    const getCurrentLabel = () => {
        const match = fontSizeLabels.find(f => f.size === fontSize);
        return match?.label || 'Mediano';
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Chats</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                <Text style={styles.sectionTitle}>Tamaño de fuente</Text>
                <View style={styles.section}>
                    <View style={styles.fontSizeContainer}>
                        <Text style={styles.fontSizeLabel}>
                            Tamaño actual: <Text style={styles.fontSizeValue}>{getCurrentLabel()}</Text>
                        </Text>

                        <View style={styles.sliderContainer}>
                            <Text style={styles.sliderLabel}>A</Text>
                            <Slider
                                style={styles.slider}
                                minimumValue={12}
                                maximumValue={20}
                                step={2}
                                value={fontSize}
                                onValueChange={setFontSize}
                                minimumTrackTintColor={colors.primary}
                                maximumTrackTintColor={colors.border}
                                thumbTintColor={colors.primary}
                            />
                            <Text style={[styles.sliderLabel, { fontSize: 20 }]}>A</Text>
                        </View>
                    </View>
                </View>

                {/* Preview */}
                <Text style={styles.sectionTitle}>Vista previa</Text>
                <View style={styles.previewSection}>
                    <View style={styles.previewMessage}>
                        <View style={styles.previewBubbleLeft}>
                            <Text style={[styles.previewText, { fontSize }]}>
                                Hola, ¿cómo estás?
                            </Text>
                            <Text style={styles.previewTime}>10:30</Text>
                        </View>
                    </View>
                    <View style={styles.previewMessage}>
                        <View style={styles.previewBubbleRight}>
                            <Text style={[styles.previewTextOwn, { fontSize }]}>
                                ¡Muy bien, gracias! 😊
                            </Text>
                            <Text style={styles.previewTimeOwn}>10:31 ✓✓</Text>
                        </View>
                    </View>
                    <View style={styles.previewMessage}>
                        <View style={styles.previewBubbleLeft}>
                            <Text style={[styles.previewText, { fontSize }]}>
                                Me alegra escuchar eso. ¿Tienes tiempo para hablar hoy?
                            </Text>
                            <Text style={styles.previewTime}>10:32</Text>
                        </View>
                    </View>
                </View>

                <Text style={styles.infoText}>
                    El tamaño de fuente se aplicará a todos los mensajes en los chats.
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
    fontSizeContainer: {
        padding: 20,
    },
    fontSizeLabel: {
        fontSize: 15,
        color: colors.textSecondary,
        marginBottom: 20,
        textAlign: 'center',
    },
    fontSizeValue: {
        color: colors.primary,
        fontWeight: '600',
    },
    sliderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    slider: {
        flex: 1,
        height: 40,
    },
    sliderLabel: {
        fontSize: 14,
        color: colors.textMuted,
        fontWeight: '600',
    },
    previewSection: {
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
    },
    previewMessage: {
        marginBottom: 12,
    },
    previewBubbleLeft: {
        backgroundColor: colors.surface,
        borderRadius: 18,
        borderTopLeftRadius: 4,
        padding: 12,
        paddingBottom: 6,
        maxWidth: '80%',
        alignSelf: 'flex-start',
    },
    previewBubbleRight: {
        backgroundColor: colors.primary,
        borderRadius: 18,
        borderTopRightRadius: 4,
        padding: 12,
        paddingBottom: 6,
        maxWidth: '80%',
        alignSelf: 'flex-end',
    },
    previewText: {
        color: colors.textPrimary,
        lineHeight: 22,
    },
    previewTextOwn: {
        color: '#FFFFFF',
        lineHeight: 22,
    },
    previewTime: {
        fontSize: 11,
        color: colors.textMuted,
        textAlign: 'right',
        marginTop: 4,
    },
    previewTimeOwn: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'right',
        marginTop: 4,
    },
    infoText: {
        fontSize: 13,
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 20,
    },
});

export default ChatSettingsScreen;
