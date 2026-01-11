import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Message } from '../types';
import colors from '../theme/colors';

interface MessageBubbleProps {
    message: Message;
    isOwn: boolean;
    showTail?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
    message,
    isOwn,
    showTail = true,
}) => {
    const getStatusIcon = () => {
        switch (message.status) {
            case 'sent':
                return <Ionicons name="checkmark" size={14} color="rgba(255,255,255,0.6)" />;
            case 'delivered':
                return <Ionicons name="checkmark-done" size={14} color="rgba(255,255,255,0.6)" />;
            case 'read':
                return <Ionicons name="checkmark-done" size={14} color="#60A5FA" />;
            default:
                return null;
        }
    };

    return (
        <View
            style={[
                styles.container,
                isOwn ? styles.containerOwn : styles.containerOther,
            ]}
        >
            <View
                style={[
                    styles.bubble,
                    isOwn ? styles.bubbleOwn : styles.bubbleOther,
                    showTail && (isOwn ? styles.bubbleTailOwn : styles.bubbleTailOther),
                ]}
            >
                <Text style={[styles.text, isOwn ? styles.textOwn : styles.textOther]}>
                    {message.text}
                </Text>

                <View style={styles.footer}>
                    <Text style={[styles.time, isOwn ? styles.timeOwn : styles.timeOther]}>
                        {format(message.timestamp, 'HH:mm')}
                    </Text>
                    {isOwn && <View style={styles.statusIcon}>{getStatusIcon()}</View>}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 12,
        marginVertical: 2,
    },
    containerOwn: {
        alignItems: 'flex-end',
    },
    containerOther: {
        alignItems: 'flex-start',
    },
    bubble: {
        maxWidth: '80%',
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: 8,
        borderRadius: 20,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    bubbleOwn: {
        backgroundColor: colors.messageSent,
        borderBottomRightRadius: 4,
    },
    bubbleOther: {
        backgroundColor: colors.messageReceived,
        borderBottomLeftRadius: 4,
    },
    bubbleTailOwn: {
        borderBottomRightRadius: 4,
    },
    bubbleTailOther: {
        borderBottomLeftRadius: 4,
    },
    text: {
        fontSize: 16,
        lineHeight: 22,
    },
    textOwn: {
        color: '#ffffff',
    },
    textOther: {
        color: colors.textPrimary,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 4,
        gap: 4,
    },
    time: {
        fontSize: 11,
    },
    timeOwn: {
        color: 'rgba(255, 255, 255, 0.6)',
    },
    timeOther: {
        color: colors.textMuted,
    },
    statusIcon: {
        marginLeft: 2,
    },
});

export default MessageBubble;
