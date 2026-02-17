import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '../context/ThemeContext';
import { api, BlockedUserInfo } from '../api';
import { RootStackParamList } from '../types';

type BlockedUsersScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'BlockedUsers'>;

interface BlockedUsersScreenProps {
    navigation: BlockedUsersScreenNavigationProp;
}

export const BlockedUsersScreen: React.FC<BlockedUsersScreenProps> = ({ navigation }) => {
    const { colors } = useTheme();
    const [blockedUsers, setBlockedUsers] = useState<BlockedUserInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadBlockedUsers();
    }, []);

    const loadBlockedUsers = async () => {
        try {
            const result = await api.getBlockedUsers();
            if (result.data?.blockedUsers) {
                setBlockedUsers(result.data.blockedUsers);
            }
        } catch (error) {
            console.error('Error loading blocked users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUnblock = (user: BlockedUserInfo) => {
        Alert.alert(
            'Desbloquear usuario',
            `¿Desbloquear a ${user.name || user.rfc}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Desbloquear',
                    onPress: async () => {
                        try {
                            await api.unblockUser(user.id);
                            setBlockedUsers(prev => prev.filter(u => u.id !== user.id));
                        } catch (error) {
                            Alert.alert('Error', 'No se pudo desbloquear al usuario');
                        }
                    },
                },
            ]
        );
    };

    const renderBlockedUser = ({ item }: { item: BlockedUserInfo }) => (
        <View style={[styles.userItem, { borderBottomColor: colors.divider }]}>
            {item.avatar_url ? (
                <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
            ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                    <Text style={styles.avatarText}>
                        {(item.name || item.rfc || '?').charAt(0).toUpperCase()}
                    </Text>
                </View>
            )}

            <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.textPrimary }]}>
                    {item.name || item.rfc}
                </Text>
                <Text style={[styles.userRfc, { color: colors.textMuted }]}>
                    {item.rfc}
                </Text>
            </View>

            <TouchableOpacity
                style={[styles.unblockButton, { borderColor: colors.primary }]}
                onPress={() => handleUnblock(item)}
                activeOpacity={0.7}
            >
                <Text style={[styles.unblockButtonText, { color: colors.primary }]}>
                    Desbloquear
                </Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <LinearGradient
                colors={[colors.backgroundSecondary, colors.background]}
                style={[styles.header, { borderBottomColor: colors.divider }]}
            >
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                    Usuarios bloqueados
                </Text>
                <View style={styles.headerPlaceholder} />
            </LinearGradient>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : blockedUsers.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="checkmark-circle-outline" size={64} color={colors.textMuted} />
                    <Text style={[styles.emptyText, { color: colors.textPrimary }]}>
                        No hay usuarios bloqueados
                    </Text>
                    <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                        Los usuarios que bloquees aparecerán aquí
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={blockedUsers}
                    keyExtractor={(item) => item.id}
                    renderItem={renderBlockedUser}
                    contentContainerStyle={styles.listContent}
                />
            )}
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
        paddingHorizontal: 8,
        paddingVertical: 12,
        paddingTop: 56,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    headerPlaceholder: {
        width: 44,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
    },
    listContent: {
        padding: 16,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 0.5,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
    },
    avatarPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '500',
    },
    userRfc: {
        fontSize: 13,
        marginTop: 2,
    },
    unblockButton: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
        borderWidth: 1,
    },
    unblockButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
});

export default BlockedUsersScreen;
