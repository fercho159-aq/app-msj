import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Dimensions,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import { api, Message } from '../api';
import { RootStackParamList } from '../types';
import { getAbsoluteMediaUrl } from '../utils/urlHelper';

type UserProfileScreenRouteProp = RouteProp<RootStackParamList, 'UserProfile'>;
type UserProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'UserProfile'>;

interface UserProfileScreenProps {
    route: UserProfileScreenRouteProp;
    navigation: UserProfileScreenNavigationProp;
}

interface SharedFile {
    id: string;
    url: string;
    type: 'image' | 'file' | 'video' | 'audio';
    fileName?: string;
    timestamp: string;
}

const { width } = Dimensions.get('window');
const THUMBNAIL_SIZE = (width - 48) / 3;

export const UserProfileScreen: React.FC<UserProfileScreenProps> = ({ route, navigation }) => {
    const { userId, userName, userAvatar, chatId } = route.params as any;
    const { colors } = useTheme();
    const { user } = useAuth();
    const { startCall } = useCall();

    const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'images' | 'files'>('images');

    const isAdmin = user?.rfc === 'ADMIN000CONS';

    // Cargar archivos compartidos del chat
    useEffect(() => {
        loadSharedFiles();
    }, [chatId]);

    const loadSharedFiles = async () => {
        try {
            setIsLoading(true);
            // Obtener mensajes del chat y filtrar solo los que tienen media
            const result = await api.getChatMessages(chatId, 500, 0); // Obtener más mensajes para ver archivos
            if (result.data?.messages) {
                const files: SharedFile[] = result.data.messages
                    .filter((msg: Message) => msg.type === 'image' || msg.type === 'file')
                    .map((msg: Message) => ({
                        id: msg.id,
                        url: getAbsoluteMediaUrl(msg.mediaUrl) || '',
                        type: msg.type as 'image' | 'file',
                        fileName: msg.text || undefined,
                        timestamp: msg.timestamp,
                    }))
                    .filter((file: SharedFile) => file.url); // Solo archivos con URL válida

                setSharedFiles(files);
            }
        } catch (error) {
            console.error('Error loading shared files:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCall = () => {
        if (isAdmin && userId) {
            startCall(userId, userName || 'Usuario', 'audio');
        }
    };

    const handleFilePress = (file: SharedFile) => {
        // Navegar de vuelta al chat para ver el archivo
        // O abrir un preview modal
        navigation.goBack();
    };

    const imageFiles = sharedFiles.filter(f => f.type === 'image');
    const documentFiles = sharedFiles.filter(f => f.type === 'file');

    const renderImageThumbnail = ({ item }: { item: SharedFile }) => (
        <TouchableOpacity
            style={[styles.thumbnailContainer, { backgroundColor: colors.surface }]}
            onPress={() => handleFilePress(item)}
            activeOpacity={0.8}
        >
            <Image
                source={{ uri: item.url }}
                style={styles.thumbnail}
                resizeMode="cover"
            />
        </TouchableOpacity>
    );

    const renderFileItem = ({ item }: { item: SharedFile }) => (
        <TouchableOpacity
            style={[styles.fileItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => handleFilePress(item)}
            activeOpacity={0.7}
        >
            <View style={[styles.fileIconContainer, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name="document-text" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.fileName, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.fileName || 'Archivo'}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header con botón de volver */}
            <LinearGradient
                colors={[colors.backgroundSecondary, colors.background]}
                style={[styles.header, { borderBottomColor: colors.divider }]}
            >
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Perfil</Text>
                <View style={styles.headerPlaceholder} />
            </LinearGradient>

            <ScrollView
                style={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Perfil del usuario */}
                <View style={styles.profileSection}>
                    {/* Avatar grande */}
                    <View style={[styles.avatarContainer, { borderColor: colors.primary }]}>
                        <Image
                            source={{ uri: userAvatar || 'https://via.placeholder.com/120' }}
                            style={styles.avatar}
                        />
                    </View>

                    {/* Nombre */}
                    <Text style={[styles.userName, { color: colors.textPrimary }]}>
                        {userName || 'Usuario'}
                    </Text>

                    {/* Botón de llamada */}
                    {isAdmin && (
                        <TouchableOpacity
                            style={[styles.callButton, { backgroundColor: colors.primary }]}
                            onPress={handleCall}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="call" size={22} color="#FFFFFF" />
                            <Text style={styles.callButtonText}>Llamar</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Sección de archivos compartidos */}
                <View style={styles.filesSection}>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                        Archivos Compartidos
                    </Text>

                    {/* Tabs */}
                    <View style={[styles.tabsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <TouchableOpacity
                            style={[
                                styles.tab,
                                activeTab === 'images' && { backgroundColor: colors.primary }
                            ]}
                            onPress={() => setActiveTab('images')}
                        >
                            <Ionicons
                                name="images"
                                size={20}
                                color={activeTab === 'images' ? '#FFFFFF' : colors.textMuted}
                            />
                            <Text style={[
                                styles.tabText,
                                { color: activeTab === 'images' ? '#FFFFFF' : colors.textMuted }
                            ]}>
                                Fotos ({imageFiles.length})
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.tab,
                                activeTab === 'files' && { backgroundColor: colors.primary }
                            ]}
                            onPress={() => setActiveTab('files')}
                        >
                            <Ionicons
                                name="document"
                                size={20}
                                color={activeTab === 'files' ? '#FFFFFF' : colors.textMuted}
                            />
                            <Text style={[
                                styles.tabText,
                                { color: activeTab === 'files' ? '#FFFFFF' : colors.textMuted }
                            ]}>
                                Documentos ({documentFiles.length})
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Contenido */}
                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : (
                        <>
                            {activeTab === 'images' ? (
                                imageFiles.length > 0 ? (
                                    <FlatList
                                        key="images-grid"
                                        data={imageFiles}
                                        renderItem={renderImageThumbnail}
                                        keyExtractor={(item) => item.id}
                                        numColumns={3}
                                        scrollEnabled={false}
                                        contentContainerStyle={styles.gridContainer}
                                    />
                                ) : (
                                    <View style={styles.emptyState}>
                                        <Ionicons name="images-outline" size={48} color={colors.textMuted} />
                                        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                                            No hay fotos compartidas
                                        </Text>
                                    </View>
                                )
                            ) : (
                                documentFiles.length > 0 ? (
                                    <FlatList
                                        key="files-list"
                                        data={documentFiles}
                                        renderItem={renderFileItem}
                                        keyExtractor={(item) => item.id}
                                        scrollEnabled={false}
                                        contentContainerStyle={styles.filesListContainer}
                                    />
                                ) : (
                                    <View style={styles.emptyState}>
                                        <Ionicons name="document-outline" size={48} color={colors.textMuted} />
                                        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                                            No hay documentos compartidos
                                        </Text>
                                    </View>
                                )
                            )}
                        </>
                    )}
                </View>
            </ScrollView>
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
    scrollContainer: {
        flex: 1,
    },
    profileSection: {
        alignItems: 'center',
        paddingVertical: 32,
        paddingHorizontal: 20,
    },
    avatarContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        padding: 3,
        marginBottom: 16,
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 57,
    },
    userName: {
        fontSize: 26,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    callButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 30,
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    callButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '600',
    },
    filesSection: {
        paddingHorizontal: 16,
        paddingBottom: 32,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    tabsContainer: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
        borderWidth: 1,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        gap: 6,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
    },
    gridContainer: {
        gap: 4,
    },
    thumbnailContainer: {
        width: THUMBNAIL_SIZE,
        height: THUMBNAIL_SIZE,
        margin: 2,
        borderRadius: 8,
        overflow: 'hidden',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
    filesListContainer: {
        gap: 8,
    },
    fileItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
    },
    fileIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    fileName: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
    },
    loadingContainer: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 15,
        marginTop: 12,
    },
});

export default UserProfileScreen;
