import React, { useState } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

interface MessageInputProps {
    onSend: (text: string) => void;
    onAttachment?: () => void;
    onVoice?: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
    onSend,
    onAttachment,
    onVoice,
}) => {
    const { colors, gradients } = useTheme();
    const [message, setMessage] = useState('');
    const [isFocused, setIsFocused] = useState(false);

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

            <View style={styles.sendButtonContainer}>
                <TouchableOpacity
                    onPress={hasMessage ? handleSend : onVoice}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={gradients.primary as [string, string, ...string[]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.sendButton, { shadowColor: colors.primary }]}
                    >
                        <Ionicons
                            name={hasMessage ? 'send' : 'mic'}
                            size={22}
                            color={colors.background}
                            style={hasMessage ? styles.sendIcon : undefined}
                        />
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
