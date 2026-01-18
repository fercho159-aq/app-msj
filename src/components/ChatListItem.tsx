import React from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Chat } from '../types';
import colors from '../theme/colors';

interface ChatListItemProps {
    chat: Chat;
    currentUserId: string;
    onPress: () => void;
}

const formatMessageTime = (date: Date): string => {
    if (isToday(date)) {
        return format(date, 'HH:mm');
    }
    if (isYesterday(date)) {
        return 'Ayer';
    }
    return format(date, 'dd/MM/yy', { locale: es });
};

export const ChatListItem: React.FC<ChatListItemProps> = ({
    chat,
    currentUserId,
    onPress,
}) => {
    const otherUser = chat.participants.find((p) => p.id !== currentUserId);

    if (!otherUser) return null;

    const displayName = chat.isGroup ? chat.groupName : otherUser.name;
    const displayAvatar = chat.isGroup ? chat.groupAvatar : otherUser.avatar;
    const getLastMessageText = () => {
        if (!chat.lastMessage) return '';

        switch (chat.lastMessage.type) {
            case 'audio':
                return '🎤 Nota de voz';
            case 'image':
                return '📷 Imagen';
            case 'file':
                return '📄 Archivo';
            default:
                return chat.lastMessage.text || '';
        }
    };

    const lastMessageText = getLastMessageText();
    const isOwnMessage = chat.lastMessage?.senderId === currentUserId;
    const hasUnread = chat.unreadCount > 0;

    const getStatusIcon = () => {
        if (!chat.lastMessage || !isOwnMessage) return null;

        switch (chat.lastMessage.status) {
            case 'sent':
                return <Ionicons name="checkmark" size={16} color={colors.textMuted} />;
            case 'delivered':
                return <Ionicons name="checkmark-done" size={16} color={colors.textMuted} />;
            case 'read':
                return <Ionicons name="checkmark-done" size={16} color={colors.primary} />;
            default:
                return null;
        }
    };

    return (
        <TouchableOpacity
            style={[styles.container, hasUnread && styles.containerUnread]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.avatarContainer}>
                <Image source={{ uri: displayAvatar }} style={styles.avatar} />
                {otherUser.status === 'online' && (
                    <View style={styles.onlineIndicator} />
                )}
            </View>

            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.name} numberOfLines={1}>
                        {displayName}
                    </Text>
                    <Text style={[styles.time, hasUnread && styles.timeUnread]}>
                        {chat.lastMessage ? formatMessageTime(chat.lastMessage.timestamp) : ''}
                    </Text>
                </View>

                <View style={styles.messageRow}>
                    <View style={styles.messageContent}>
                        {getStatusIcon()}
                        <Text
                            style={[styles.message, hasUnread && styles.messageUnread]}
                            numberOfLines={1}
                        >
                            {otherUser.status === 'typing' ? (
                                <Text style={styles.typingText}>escribiendo...</Text>
                            ) : (
                                lastMessageText
                            )}
                        </Text>
                    </View>

                    {hasUnread && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadCount}>
                                {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: colors.background,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.divider,
    },
    containerUnread: {
        backgroundColor: colors.surfaceLight,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 14,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: colors.border,
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: colors.online,
        borderWidth: 2,
        borderColor: colors.background,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
        flex: 1,
        marginRight: 8,
    },
    time: {
        fontSize: 12,
        color: colors.textMuted,
    },
    timeUnread: {
        color: colors.primary,
        fontWeight: '600',
    },
    messageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    messageContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    message: {
        fontSize: 14,
        color: colors.textSecondary,
        flex: 1,
    },
    messageUnread: {
        color: colors.textPrimary,
        fontWeight: '500',
    },
    typingText: {
        color: colors.primary,
        fontStyle: 'italic',
    },
    unreadBadge: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
        marginLeft: 8,
    },
    unreadCount: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
});

export default ChatListItem;
