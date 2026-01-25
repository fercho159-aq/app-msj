import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

interface ChatHeaderProps {
    name: string;
    avatar: string;
    rfc?: string | null;
    status?: 'online' | 'offline' | 'typing';
    lastSeen?: string;
    isAdmin?: boolean;
    onBack: () => void;
    onCall?: () => void;
    onMore?: () => void;
    onUserPress?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
    name,
    avatar,
    rfc,
    status = 'offline',
    lastSeen,
    isAdmin = false,
    onBack,
    onCall,
    onMore,
    onUserPress,
}) => {
    const { colors } = useTheme();

    const getStatusText = () => {
        switch (status) {
            case 'online':
                return 'en línea';
            case 'typing':
                return 'escribiendo...';
            default:
                return ''; // No mostrar nada cuando está offline
        }
    };

    return (
        <LinearGradient
            colors={[colors.backgroundSecondary, colors.background]}
            style={[styles.container, { borderBottomColor: colors.divider }]}
        >
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.userInfo} activeOpacity={0.7} onPress={onUserPress}>
                <View style={styles.avatarContainer}>
                    <Image source={{ uri: avatar }} style={[styles.avatar, { borderColor: colors.border }]} />
                    {status === 'online' && <View style={[styles.onlineIndicator, { backgroundColor: colors.online, borderColor: colors.backgroundSecondary }]} />}
                </View>

                <View style={styles.textContainer}>
                    <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                        {name}
                    </Text>
                    {status === 'online' || status === 'typing' ? (
                        <Text
                            style={[
                                styles.status,
                                { color: colors.textMuted },
                                status === 'online' && { color: colors.online },
                                status === 'typing' && { color: colors.primary, fontStyle: 'italic' },
                            ]}
                        >
                            {getStatusText()}
                        </Text>
                    ) : rfc ? (
                        <Text style={[styles.status, { color: colors.textMuted }]} numberOfLines={1}>
                            RFC: {rfc}
                        </Text>
                    ) : null}
                </View>
            </TouchableOpacity>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.actionButton, !isAdmin && styles.emergencyButton]}
                    onPress={onCall}
                >
                    <Ionicons
                        name="call"
                        size={22}
                        color={isAdmin ? colors.textPrimary : '#FFFFFF'}
                    />
                </TouchableOpacity>
                {isAdmin && (
                    <TouchableOpacity style={styles.actionButton} onPress={onMore}>
                        <Ionicons name="ellipsis-vertical" size={22} color={colors.textPrimary} />
                    </TouchableOpacity>
                )}
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
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
    },
    textContainer: {
        flex: 1,
    },
    name: {
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 2,
    },
    status: {
        fontSize: 13,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        padding: 10,
    },
    emergencyButton: {
        backgroundColor: '#E53935',
        borderRadius: 20,
        marginRight: 4,
    },
});

export default ChatHeader;
