import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Keyboard,
    Text,
    Animated,
    Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

interface MessageInputProps {
    onSend: (text: string) => void;
    onAttachment?: () => void;
    onVoice?: () => void;
    isRecording?: boolean;
    recordingDuration?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
    onSend,
    onAttachment,
    onVoice,
    isRecording = false,
    recordingDuration = '00:00',
}) => {
    const { colors, gradients } = useTheme();
    const [message, setMessage] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    // Animación de pulso para grabación
    const pulseAnim = useRef(new Animated.Value(0.5)).current;

    useEffect(() => {
        if (isRecording) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 800,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 0.5,
                        duration: 800,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(0.5);
        }
    }, [isRecording]);

    const handleSend = () => {
        if (message.trim()) {
            onSend(message.trim());
            setMessage('');
            Keyboard.dismiss();
        }
    };

    const hasMessage = message.trim().length > 0;

    return (
        <View style={[styles.container, { backgroundColor: colors.background, borderTopColor: colors.divider }]}>
            {isRecording ? (
                <View style={[
                    styles.inputWrapper,
                    styles.recordingWrapper,
                    { backgroundColor: colors.surface, borderColor: colors.error }
                ]}>
                    <Animated.View style={[styles.recordingIndicator, { opacity: pulseAnim, backgroundColor: colors.error }]} />
                    <Text style={[styles.recordingText, { color: colors.error }]}>Grabando audio...</Text>
                    <Text style={[styles.recordingTimer, { color: colors.textPrimary }]}>{recordingDuration}</Text>
                </View>
            ) : (
                <View style={[
                    styles.inputWrapper,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    isFocused && { borderColor: colors.primary }
                ]}>
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={onAttachment}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="add-circle" size={28} color={colors.primary} />
                    </TouchableOpacity>

                    <TextInput
                        style={[styles.input, { color: colors.textPrimary }]}
                        value={message}
                        onChangeText={setMessage}
                        placeholder="Escribe un mensaje..."
                        placeholderTextColor={colors.textMuted}
                        multiline={true}
                        maxLength={1000}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                    />

                    <TouchableOpacity
                        style={styles.iconButton}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="happy" size={26} color={colors.textMuted} />
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.sendButtonContainer}>
                <TouchableOpacity
                    onPress={hasMessage ? handleSend : onVoice}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={isRecording ? [colors.error, '#d32f2f'] : (gradients.primary as [string, string, ...string[]])}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.sendButton, { shadowColor: isRecording ? colors.error : colors.primary }]}
                    >
                        {isRecording ? (
                            <Ionicons name="stop" size={20} color="#FFFFFF" />
                        ) : (
                            <Ionicons
                                name={hasMessage ? 'send' : 'mic'}
                                size={22}
                                color={colors.background}
                                style={hasMessage ? styles.sendIcon : undefined}
                            />
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderTopWidth: 1,
        gap: 10,
    },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-end',
        borderRadius: 24,
        paddingHorizontal: 6,
        paddingVertical: 6,
        borderWidth: 1,
        minHeight: 50,
    },
    recordingWrapper: {
        alignItems: 'center',
        paddingHorizontal: 16,
        justifyContent: 'space-between',
    },
    recordingIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 10,
    },
    recordingText: {
        fontSize: 16,
        fontWeight: '500',
        flex: 1,
    },
    recordingTimer: {
        fontSize: 16,
        fontVariant: ['tabular-nums'],
    },
    iconButton: {
        padding: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        fontSize: 16,
        maxHeight: 100,
        paddingHorizontal: 8,
        paddingVertical: 8,
    },
    sendButtonContainer: {
        marginBottom: 2,
    },
    sendButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    sendIcon: {
        marginLeft: 3,
    },
});

export default MessageInput;
