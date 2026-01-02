import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Image,
    Alert,
    TouchableOpacity,
    Linking,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format, parseISO } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';

import { ChatHeader, MessageInput } from '../components';
import { useAuth } from '../context/AuthContext';
import { api, Message } from '../api';
import { RootStackParamList } from '../types';
import colors from '../theme/colors';

type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;
type ChatScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Chat'>;

interface ChatScreenProps {
    route: ChatScreenRouteProp;
    navigation: ChatScreenNavigationProp;
}

interface MessageBubbleProps {
    message: Message;
    isOwn: boolean;
    showTail: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwn, showTail }) => {
    const getStatusIcon = () => {
        switch (message.status) {
            case 'sent': return '✓';
            case 'delivered': return '✓✓';
            case 'read': return '✓✓';
            default: return '🕒';
        }
    };

    const formatTime = (dateString: string) => {
        try {
            return format(parseISO(dateString), 'HH:mm');
        } catch { return ''; }
    };

    const handleMediaPress = () => {
        if (message.mediaUrl) {
            Linking.openURL(message.mediaUrl);
        }
    };

    return (
        <View style={[styles.messageContainer, isOwn ? styles.ownMessage : styles.otherMessage]}>
            <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble]}>

                {/* Renderizado de Media */}
                {message.type === 'image' && message.mediaUrl && (
                    <TouchableOpacity onPress={handleMediaPress} activeOpacity={0.9}>
                        <Image
                            source={{ uri: message.mediaUrl }}
                            style={styles.mediaImage}
                            resizeMode="cover"
                        />
                    </TouchableOpacity>
                )}

                {message.type === 'file' && (
                    <TouchableOpacity style={styles.fileContainer} onPress={handleMediaPress}>
                        <View style={styles.fileIcon}>
                            <Ionicons name="document-text" size={24} color={isOwn ? colors.textPrimary : colors.primary} />
                        </View>
                        <Text style={[styles.fileText, isOwn ? styles.ownText : { color: colors.primary }]} numberOfLines={1}>
                            {message.text || 'Archivo adjunto'}
                        </Text>
                    </TouchableOpacity>
                )}

                {message.text && message.type !== 'file' ? (
                    <Text style={[styles.messageText, isOwn ? styles.ownText : styles.otherText]}>
                        {message.text}
                    </Text>
                ) : null}

                <View style={styles.messageFooter}>
                    <Text style={[styles.messageTime, isOwn && { color: 'rgba(255,255,255,0.7)' }]}>
                        {formatTime(message.timestamp)}
                    </Text>
                    {isOwn && (
                        <Text style={[styles.messageStatus, message.status === 'read' && styles.readStatus]}>
                            {getStatusIcon()}
                        </Text>
                    )}
                </View>
            </View>
        </View>
    );
};

export const ChatScreen: React.FC<ChatScreenProps> = ({ route, navigation }) => {
    const { chatId, userName, userAvatar } = route.params;
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        loadMessages();
        markAsRead();
    }, [chatId]);

    const loadMessages = async () => {
        try {
            const result = await api.getChatMessages(chatId);
            if (result.data?.messages) {
                setMessages(result.data.messages);
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const markAsRead = async () => {
        await api.markMessagesAsRead(chatId);
        await api.markChatAsRead(chatId);
    };

    const handleSendMessage = async (text: string, type: 'text' | 'image' | 'file' = 'text', mediaUrl?: string) => {
        const tempMessage: Message = {
            id: `temp-${Date.now()}`,
            chatId,
            senderId: user?.id || '',
            text,
            type,
            mediaUrl: mediaUrl || null,
            status: 'sent',
            timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, tempMessage]);

        const result = await api.sendMessage(chatId, text, type, mediaUrl);

        if (result.data?.message) {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === tempMessage.id ? result.data!.message : msg
                )
            );
        }
    };

    const handleAttachment = () => {
        Alert.alert(
            'Enviar adjunto',
            'Selecciona una opción',
            [
                {
                    text: 'Cámara',
                    onPress: pickImageFromCamera,
                },
                {
                    text: 'Galería',
                    onPress: pickImage,
                },
                {
                    text: 'Documento',
                    onPress: pickDocument,
                },
                {
                    text: 'Cancelar',
                    style: 'cancel',
                },
            ]
        );
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
        });

        if (!result.canceled) {
            uploadAndSend(result.assets[0].uri, 'image');
        }
    };

    const pickImageFromCamera = async () => {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permiso denegado', 'Se necesita acceso a la cámara');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            quality: 0.7,
        });

        if (!result.canceled) {
            uploadAndSend(result.assets[0].uri, 'image');
        }
    };

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({});
            if (!result.canceled) {
                uploadAndSend(result.assets[0].uri, 'file');
            }
        } catch (err) {
            console.error('Error picking document:', err);
        }
    };

    const uploadAndSend = async (uri: string, type: 'image' | 'file') => {
        setIsUploading(true);
        try {
            const uploadResult = await api.uploadFile(uri, type);

            if (uploadResult.error || !uploadResult.data) {
                Alert.alert('Error', 'No se pudo subir el archivo');
                return;
            }

            const { url, filename } = uploadResult.data as any;

            // Enviar mensaje con el adjunto
            await handleSendMessage(
                type === 'image' ? '' : filename, // Si es imagen, texto vacío. Si es archivo, nombre.
                type,
                url
            );

        } catch (error) {
            Alert.alert('Error', 'Error al procesar archivo');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <View style={styles.container}>
            <ChatHeader
                name={userName}
                avatar={userAvatar}
                onBack={() => navigation.goBack()}
            // Ocultar opciones para no admin o lógica de bloqueo si se requiere
            />

            <View style={styles.chatContainer}>
                <KeyboardAvoidingView
                    style={styles.keyboardView}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={0}
                >
                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : (
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item, index }) => {
                                const isOwn = item.senderId === user?.id;
                                const previousMessage = messages[index - 1];
                                const showTail = !previousMessage || previousMessage.senderId !== item.senderId;
                                return <MessageBubble message={item} isOwn={isOwn} showTail={showTail} />;
                            }}
                            contentContainerStyle={styles.messagesContent}
                            showsVerticalScrollIndicator={false}
                            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
                        />
                    )}

                    {isUploading && (
                        <View style={styles.uploadingOverlay}>
                            <ActivityIndicator color="#fff" />
                            <Text style={{ color: '#fff', marginTop: 8 }}>Subiendo...</Text>
                        </View>
                    )}

                    <MessageInput
                        onSend={(text) => handleSendMessage(text)}
                        onAttachment={handleAttachment}
                    />
                </KeyboardAvoidingView>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    chatContainer: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
    },
    keyboardView: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    messagesContent: {
        paddingVertical: 16,
        paddingHorizontal: 12,
        flexGrow: 1,
    },
    messageContainer: {
        marginBottom: 8,
        maxWidth: '80%',
    },
    ownMessage: {
        alignSelf: 'flex-end',
    },
    otherMessage: {
        alignSelf: 'flex-start',
    },
    bubble: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 18,
        minWidth: 80,
    },
    ownBubble: {
        backgroundColor: colors.primary,
        borderBottomRightRadius: 4,
    },
    otherBubble: {
        backgroundColor: colors.surface,
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
    },
    ownText: {
        color: colors.textPrimary,
    },
    otherText: {
        color: colors.textPrimary,
    },
    messageFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 4,
        gap: 4,
    },
    messageTime: {
        fontSize: 11,
        color: colors.textMuted,
    },
    messageStatus: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.7)',
    },
    readStatus: {
        color: '#4FC3F7',
    },
    mediaImage: {
        width: 200,
        height: 200,
        borderRadius: 12,
        marginBottom: 4,
    },
    fileContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 8,
    },
    fileIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fileText: {
        fontSize: 14,
        textDecorationLine: 'underline',
        maxWidth: 150,
    },
    uploadingOverlay: {
        position: 'absolute',
        bottom: 70,
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        zIndex: 10,
    }
});

export default ChatScreen;
