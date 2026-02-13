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
    PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

interface MessageInputProps {
    onSend: (text: string) => void;
    onAttachment?: () => void;
    onVoice?: () => void;
    onCancelRecording?: () => void;
    isRecording?: boolean;
    recordingDuration?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
    onSend,
    onAttachment,
    onVoice,
    onCancelRecording,
    isRecording = false,
    recordingDuration = '00:00',
}) => {
    const { colors, gradients } = useTheme();
    const [message, setMessage] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    // Animación de pulso para el punto rojo
    const pulseAnim = useRef(new Animated.Value(0.5)).current;
    // Animación del slide-to-cancel
    const slideAnim = useRef(new Animated.Value(0)).current;
    // Animación del chevron
    const arrowAnim = useRef(new Animated.Value(0)).current;

    const cancelThreshold = -120;
    const onCancelRef = useRef(onCancelRecording);
    onCancelRef.current = onCancelRecording;

    useEffect(() => {
        if (isRecording) {
            // Pulso del punto rojo
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

            // Chevron animado
            Animated.loop(
                Animated.sequence([
                    Animated.timing(arrowAnim, {
                        toValue: -8,
                        duration: 600,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(arrowAnim, {
                        toValue: 0,
                        duration: 600,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(0.5);
            arrowAnim.setValue(0);
            slideAnim.setValue(0);
        }
    }, [isRecording]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && gestureState.dx < 0;
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dx < 0) {
                    slideAnim.setValue(Math.max(gestureState.dx, -160));
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dx < cancelThreshold) {
                    onCancelRef.current?.();
                }
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 40,
                    friction: 8,
                }).start();
            },
        })
    ).current;

    const handleSend = () => {
        if (message.trim()) {
            onSend(message.trim());
            setMessage('');
            Keyboard.dismiss();
        }
    };

    const hasMessage = message.trim().length > 0;

    // Opacidad del texto "Desliza" basada en cuánto se ha deslizado
    const slideCancelOpacity = slideAnim.interpolate({
        inputRange: [-160, -60, 0],
        outputRange: [0, 0.5, 1],
        extrapolate: 'clamp',
    });

    return (
        <View style={[styles.container, { backgroundColor: colors.background, borderTopColor: colors.divider }]}>
            {isRecording ? (
                <Animated.View
                    style={[
                        styles.inputWrapper,
                        styles.recordingWrapper,
                        { backgroundColor: colors.surface, borderColor: colors.error },
                        { transform: [{ translateX: slideAnim }] },
                    ]}
                    {...panResponder.panHandlers}
                >
                    {/* Botón cancelar (trash) */}
                    <TouchableOpacity
                        onPress={onCancelRecording}
                        style={styles.cancelButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="trash-outline" size={20} color={colors.error} />
                    </TouchableOpacity>

                    {/* Punto rojo pulsante */}
                    <Animated.View
                        style={[
                            styles.recordingDot,
                            { opacity: pulseAnim, backgroundColor: '#FF3B30' },
                        ]}
                    />

                    {/* Timer */}
                    <Text style={[styles.recordingTimer, { color: colors.textPrimary }]}>
                        {recordingDuration}
                    </Text>

                    {/* Desliza para cancelar */}
                    <Animated.View style={[styles.slideToCancelContainer, { opacity: slideCancelOpacity }]}>
                        <Animated.View style={{ transform: [{ translateX: arrowAnim }] }}>
                            <Ionicons name="chevron-back" size={14} color={colors.textMuted} />
                        </Animated.View>
                        <Text style={[styles.slideToCancelText, { color: colors.textMuted }]}>
                            Desliza para cancelar
                        </Text>
                    </Animated.View>
                </Animated.View>
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
                        colors={isRecording
                            ? ['#FF3B30', '#d32f2f'] as [string, string]
                            : (gradients.primary as [string, string, ...string[]])
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={[styles.sendButton, {
                            shadowColor: isRecording ? '#FF3B30' : colors.primary,
                        }]}
                    >
                        {isRecording ? (
                            <Ionicons name="send" size={20} color="#FFFFFF" style={{ marginLeft: 2 }} />
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
        paddingHorizontal: 10,
        justifyContent: 'flex-start',
    },
    cancelButton: {
        padding: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    recordingDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginHorizontal: 8,
    },
    recordingTimer: {
        fontSize: 16,
        fontWeight: '600',
        fontVariant: ['tabular-nums'],
        marginRight: 10,
    },
    slideToCancelContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
    },
    slideToCancelText: {
        fontSize: 13,
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
