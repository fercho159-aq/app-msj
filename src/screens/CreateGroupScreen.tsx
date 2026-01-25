import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    FlatList,
    Image,
    ActivityIndicator,
    Alert,
    StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api, User } from '../api';
import { RootStackParamList } from '../types';

type CreateGroupScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CreateGroup'>;

interface CreateGroupScreenProps {
    navigation: CreateGroupScreenNavigationProp;
}

export const CreateGroupScreen: React.FC<CreateGroupScreenProps> = ({ navigation }) => {
    const { user } = useAuth();
    const { colors, gradients, isDark } = useTheme();
    const [groupName, setGroupName] = useState('');
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            api.setUserRole('consultor');
            const result = await api.getUsers();
            if (result.data?.users) {
                // Filtrar solo usuarios y asesores (excluir consultores)
                const filteredUsers = result.data.users.filter(
                    u => u.id !== user?.id && u.role !== 'consultor'
                );
                setAllUsers(filteredUsers);
            }
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleUserSelection = (userId: string) => {
        const newSelected = new Set(selectedUsers);
        if (newSelected.has(userId)) {
            newSelected.delete(userId);
        } else {
            newSelected.add(userId);
        }
        setSelectedUsers(newSelected);
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim()) {
            Alert.alert('Error', 'Por favor ingresa un nombre para el grupo');
            return;
        }

        if (selectedUsers.size === 0) {
            Alert.alert('Error', 'Selecciona al menos un participante');
            return;
        }

        setIsCreating(true);
        try {
            const participantIds = Array.from(selectedUsers);
            const result = await api.createGroupChat(groupName.trim(), participantIds);

            if (result.data?.chat) {
                navigation.replace('Chat', {
                    chatId: result.data.chat.id,
                    userName: groupName.trim(),
                    userAvatar: '',
                    userRfc: null,
                });
            } else if (result.error) {
                Alert.alert('Error', result.error);
            }
        } catch (error) {
            console.error('Error creating group:', error);
            Alert.alert('Error', 'No se pudo crear el grupo');
        } finally {
            setIsCreating(false);
        }
    };

    const filteredUsers = allUsers.filter(u =>
        u.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderUserItem = ({ item }: { item: User }) => {
        const isSelected = selectedUsers.has(item.id);
        const displayName = item.name || 'Usuario';
        const roleLabel = item.role === 'asesor' ? 'Asesor' : 'Usuario';

        return (
            <TouchableOpacity
                style={[
                    styles.userItem,
                    { backgroundColor: isSelected ? colors.surfaceLight : colors.background }
                ]}
                onPress={() => toggleUserSelection(item.id)}
                activeOpacity={0.7}
            >
                <View style={styles.userInfo}>
                    {item.avatar_url ? (
                        <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                            <Text style={[styles.avatarText, { color: colors.background }]}>
                                {displayName.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}
                    <View style={styles.userDetails}>
                        <Text style={[styles.userName, { color: colors.textPrimary }]}>{displayName}</Text>
                        <Text style={[styles.userRole, { color: colors.textMuted }]}>{roleLabel}</Text>
                    </View>
                </View>
                <View style={[
                    styles.checkbox,
                    { borderColor: isSelected ? colors.primary : colors.border },
                    isSelected && { backgroundColor: colors.primary }
                ]}>
                    {isSelected && <Ionicons name="checkmark" size={18} color="#fff" />}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* Header */}
            <LinearGradient
                colors={[colors.backgroundSecondary, colors.background]}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        style={[styles.backButton, { backgroundColor: colors.surface }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Crear grupo</Text>
                    <View style={styles.placeholder} />
                </View>

                {/* Group name input */}
                <View style={[styles.groupNameContainer, { backgroundColor: colors.surface }]}>
                    <Ionicons name="people" size={24} color={colors.primary} />
                    <TextInput
                        style={[styles.groupNameInput, { color: colors.textPrimary }]}
                        placeholder="Nombre del grupo"
                        placeholderTextColor={colors.textMuted}
                        value={groupName}
                        onChangeText={setGroupName}
                    />
                </View>

                {/* Search */}
                <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
                    <Ionicons name="search" size={20} color={colors.textMuted} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.textPrimary }]}
                        placeholder="Buscar participantes..."
                        placeholderTextColor={colors.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {selectedUsers.size > 0 && (
                    <Text style={[styles.selectedCount, { color: colors.textMuted }]}>
                        {selectedUsers.size} participante{selectedUsers.size > 1 ? 's' : ''} seleccionado{selectedUsers.size > 1 ? 's' : ''}
                    </Text>
                )}
            </LinearGradient>

            {/* User list */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredUsers}
                    keyExtractor={(item) => item.id}
                    renderItem={renderUserItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="people-outline" size={64} color={colors.textMuted} />
                            <Text style={[styles.emptyText, { color: colors.textPrimary }]}>
                                No hay usuarios disponibles
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Create button */}
            <View style={[styles.bottomContainer, { backgroundColor: colors.background }]}>
                <TouchableOpacity
                    style={[
                        styles.createButton,
                        (selectedUsers.size === 0 || !groupName.trim() || isCreating) && styles.createButtonDisabled
                    ]}
                    onPress={handleCreateGroup}
                    disabled={selectedUsers.size === 0 || !groupName.trim() || isCreating}
                >
                    <LinearGradient
                        colors={
                            selectedUsers.size === 0 || !groupName.trim()
                                ? ['#ccc', '#aaa']
                                : gradients.primary as [string, string, ...string[]]
                        }
                        style={styles.createButtonGradient}
                    >
                        {isCreating ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                                <Text style={styles.createButtonText}>Crear grupo</Text>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 60,
        paddingBottom: 16,
        paddingHorizontal: 16,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    backButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    placeholder: {
        width: 42,
    },
    groupNameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 50,
        gap: 12,
        marginBottom: 12,
    },
    groupNameInput: {
        flex: 1,
        fontSize: 16,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 44,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
    },
    selectedCount: {
        marginTop: 12,
        fontSize: 14,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        flexGrow: 1,
        paddingBottom: 100,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    avatarPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    userDetails: {
        marginLeft: 12,
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
    },
    userRole: {
        fontSize: 13,
        marginTop: 2,
    },
    checkbox: {
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: {
        fontSize: 18,
        marginTop: 16,
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingVertical: 16,
        paddingBottom: 34,
    },
    createButton: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    createButtonDisabled: {
        opacity: 0.7,
    },
    createButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
});

export default CreateGroupScreen;
