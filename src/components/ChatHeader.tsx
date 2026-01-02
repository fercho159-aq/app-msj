import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import colors, { gradients } from '../theme/colors';

interface ChatHeaderProps {
    name: string;
    avatar: string;
    status: 'online' | 'offline' | 'typing';
    lastSeen?: string;
    onBack: () => void;
    onCall?: () => void;
    onVideoCall?: () => void;
    onMore?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
    name,
    avatar,
    status,
    lastSeen,
    onBack,
    onCall,
    onVideoCall,
    onMore,
}) => {
    const getStatusText = () => {
        switch (status) {
            case 'online':
                return 'en línea';
            case 'typing':
                return 'escribiendo...';
            case 'offline':
                return lastSeen || 'desconectado';
            default:
                return '';
        }
    };

    return (
        <LinearGradient
            colors={[colors.backgroundSecondary, colors.background]}
            style={styles.container}
        >
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.userInfo} activeOpacity={0.7}>
                <View style={styles.avatarContainer}>
                    <Image source={{ uri: avatar }} style={styles.avatar} />
                    {status === 'online' && <View style={styles.onlineIndicator} />}
                </View>

                <View style={styles.textContainer}>
                    <Text style={styles.name} numberOfLines={1}>
                        {name}
                    </Text>
                    <Text
                        style={[
                            styles.status,
                            status === 'online' && styles.statusOnline,
                            status === 'typing' && styles.statusTyping,
                        ]}
                    >
                        {getStatusText()}
                    </Text>
                </View>
            </TouchableOpacity>

            <View style={styles.actions}>
                <TouchableOpacity style={styles.actionButton} onPress={onVideoCall}>
                    <Ionicons name="videocam" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={onCall}>
                    <Ionicons name="call" size={22} color={colors.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={onMore}>
                    <Ionicons name="ellipsis-vertical" size={22} color={colors.textPrimary} />
                </TouchableOpacity>
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 12,
        paddingTop: 56,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    backButton: {
        padding: 8,
    },
    userInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: colors.border,
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.online,
        borderWidth: 2,
        borderColor: colors.backgroundSecondary,
    },
    textContainer: {
        flex: 1,
    },
    name: {
        fontSize: 17,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 2,
    },
    status: {
        fontSize: 13,
        color: colors.textMuted,
    },
    statusOnline: {
        color: colors.online,
    },
    statusTyping: {
        color: colors.primary,
        fontStyle: 'italic',
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        padding: 10,
    },
});

export default ChatHeader;
