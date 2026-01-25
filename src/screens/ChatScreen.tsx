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
    Modal,
    TextInput,
    ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format, parseISO } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

import { ChatHeader, MessageInput, MediaPreview } from '../components';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCall } from '../context/CallContext';
import { api, Message, Chat, User } from '../api';
import { RootStackParamList } from '../types';
import { getAbsoluteMediaUrl } from '../utils/urlHelper';

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
    onMediaPress?: (url: string, type: string, fileName?: string) => void;
    colors: any;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwn, showTail, onMediaPress, colors }) => {
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
        const mediaUrl = getAbsoluteMediaUrl(message.mediaUrl);
        if (mediaUrl && onMediaPress) {
            onMediaPress(mediaUrl, message.type, message.text || undefined);
        }
    };

    const mediaUrl = getAbsoluteMediaUrl(message.mediaUrl);

    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, [sound]);

    const playSound = async () => {
        try {
            if (sound) {
                if (isPlaying) {
                    await sound.pauseAsync();
                    setIsPlaying(false);
                } else {
                    await sound.playAsync();
                    setIsPlaying(true);
                }
            } else {
                if (!mediaUrl) return;
                const { sound: newSound } = await Audio.Sound.createAsync(
                    { uri: mediaUrl },
                    { shouldPlay: true }
                );
                setSound(newSound);
                setIsPlaying(true);

                newSound.setOnPlaybackStatusUpdate((status) => {
                    if (status.isLoaded) {
                        if (status.didJustFinish) {
                            setIsPlaying(false);
                            newSound.setPositionAsync(0);
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Error playing sound', error);
            Alert.alert('Error', 'No se pudo reproducir el audio');
        }
    };

    return (
        <View style={[styles.messageContainer, isOwn ? styles.ownMessage : styles.otherMessage]}>
            <View style={[
                styles.bubble,
                isOwn
                    ? [styles.ownBubble, { backgroundColor: colors.messageSent }]
                    : [styles.otherBubble, { backgroundColor: colors.messageReceived }]
            ]}>

                {/* Renderizado de Media */}

                {message.type === 'image' && mediaUrl && (
                    <TouchableOpacity onPress={handleMediaPress} activeOpacity={0.9}>
                        <Image
                            source={{ uri: mediaUrl }}
                            style={styles.mediaImage}
                            resizeMode="cover"
                        />
                    </TouchableOpacity>
                )}

                {message.type === 'audio' && (
                    <View style={styles.audioContainer}>
                        <TouchableOpacity onPress={playSound} style={styles.playButton}>
                            <Ionicons
                                name={isPlaying ? "pause" : "play"}
                                size={24}
                                color={isOwn ? '#ffffff' : colors.primary}
                            />
                        </TouchableOpacity>
                        <View style={styles.audioWaveform}>
                            <View style={[styles.audioLine, { backgroundColor: isOwn ? 'rgba(255,255,255,0.5)' : colors.border }]} />
                            <Text style={[styles.audioText, { color: isOwn ? '#ffffff' : colors.textPrimary }]}>
                                Mensaje de voz
                            </Text>
                        </View>
                    </View>
                )}

                {message.type === 'file' && (
                    <TouchableOpacity style={styles.fileContainer} onPress={handleMediaPress}>
                        <View style={[styles.fileIcon, { backgroundColor: isOwn ? 'rgba(255,255,255,0.2)' : `${colors.primary}20` }]}>
                            <Ionicons name="document-text" size={24} color={isOwn ? '#ffffff' : colors.primary} />
                        </View>
                        <Text style={[styles.fileText, { color: isOwn ? '#ffffff' : colors.primary }]} numberOfLines={1}>
                            {message.text || 'Archivo adjunto'}
                        </Text>
                    </TouchableOpacity>
                )}

                {message.text && message.type !== 'file' && message.type !== 'audio' ? (
                    <Text style={[styles.messageText, { color: isOwn ? '#ffffff' : colors.textPrimary }]}>
                        {message.text}
                    </Text>
                ) : null}

                <View style={styles.messageFooter}>
                    <Text style={[styles.messageTime, { color: isOwn ? 'rgba(255,255,255,0.7)' : colors.textMuted }]}>
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
    const { chatId, userName, userAvatar, userRfc, participantId: routeParticipantId } = route.params as any;
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const { startCall } = useCall();
    const insets = useSafeAreaInsets();
    const [messages, setMessages] = useState<Message[]>([]);
    const [chatInfo, setChatInfo] = useState<Chat | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const isPollingRef = useRef(false);

    // Call request modal state
    const [showCallModal, setShowCallModal] = useState(false);
    const [callName, setCallName] = useState(user?.name || '');
    const [callPhone, setCallPhone] = useState('');
    const [callEmergency, setCallEmergency] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Media preview state
    const [previewMedia, setPreviewMedia] = useState<{
        visible: boolean;
        url: string | null;
        type: 'image' | 'file' | 'video' | 'audio' | 'text';
        fileName?: string;
    }>({ visible: false, url: null, type: 'image' });

    const handleMediaPreview = (url: string, type: string, fileName?: string) => {
        setPreviewMedia({
            visible: true,
            url,
            type: type as 'image' | 'file' | 'video' | 'audio' | 'text',
            fileName,
        });
    };

    const closeMediaPreview = () => {
        setPreviewMedia({ visible: false, url: null, type: 'image' });
    };

    const isAdmin = user?.rfc === 'ADMIN000CONS';

    // Función para cargar mensajes (usada tanto para carga inicial como polling)
    const loadMessages = async (isInitialLoad = false) => {
        // Evitar múltiples peticiones simultáneas
        if (isPollingRef.current && !isInitialLoad) return;

        isPollingRef.current = true;
        try {
            const result = await api.getChatMessages(chatId);
            if (result.data?.messages) {
                setMessages(prev => {
                    // Solo actualizar si hay cambios para evitar re-renders innecesarios
                    const newMessages = result.data!.messages;
                    if (JSON.stringify(prev) !== JSON.stringify(newMessages)) {
                        return newMessages;
                    }
                    return prev;
                });
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            if (isInitialLoad) {
                setIsLoading(false);
            }
            isPollingRef.current = false;
        }
    };

    // Cargar info del chat
    const loadChatInfo = async () => {
        try {
            const result = await api.getChat(chatId);
            if (result.data?.chat) {
                setChatInfo(result.data.chat);
            }
        } catch (error) {
            console.error('Error loading chat info:', error);
        }
    };

    // Efecto para carga inicial y configurar polling
    useEffect(() => {
        loadMessages(true);
        loadChatInfo();
        markAsRead();

        // Configurar polling cada 5 segundos
        pollingRef.current = setInterval(() => {
            loadMessages(false);
        }, 5000);

        // Limpiar intervalo al desmontar
        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
        };
    }, [chatId]);

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

    const handleCall = () => {
        if (isAdmin) {
            // Validar que tenemos el ID del participante
            if (!routeParticipantId) {
                Alert.alert('Error', 'No se puede iniciar la llamada: ID de participante no disponible');
                console.error('❌ participantId no disponible para llamada. chatId:', chatId);
                return;
            }
            // Admin inicia llamada de audio
            console.log('📞 Iniciando llamada al participante:', routeParticipantId);
            startCall(routeParticipantId, userName || 'Usuario', 'audio');
        } else {
            // Usuario normal ve el formulario de solicitud
            setShowCallModal(true);
        }
    };

    const handleSubmitCallRequest = async () => {
        if (!callName.trim() || !callPhone.trim() || !callEmergency.trim()) {
            Alert.alert('Error', 'Por favor llena todos los campos');
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await api.createCallRequest(callName, callPhone, callEmergency);
            if (result.error) {
                Alert.alert('Error', result.error);
            } else {
                Alert.alert(
                    'Solicitud enviada',
                    'Tu solicitud de llamada ha sido enviada. El consultor te contactará pronto.',
                    [{ text: 'OK', onPress: () => setShowCallModal(false) }]
                );
                setCallPhone('');
                setCallEmergency('');
            }
        } catch (error) {
            Alert.alert('Error', 'No se pudo enviar la solicitud');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUserPress = () => {
        navigation.navigate('UserProfile', {
            userId: routeParticipantId || '',
            userName: chatInfo?.isGroup ? chatInfo.groupName || 'Grupo' : userName,
            userAvatar: chatInfo?.isGroup ? '' : userAvatar,
            userRfc: chatInfo?.isGroup ? null : userRfc,
            chatId: chatId,
            isGroup: chatInfo?.isGroup || false,
            participants: chatInfo?.participants || [],
        });
    };

    const handleMore = () => {
        Alert.alert(
            'Opciones',
            'Selecciona una acción',
            [
                {
                    text: 'Borrar conversación',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert(
                            'Confirmar eliminación',
                            '¿Estás seguro de que quieres eliminar toda esta conversación? Esta acción no se puede deshacer.',
                            [
                                {
                                    text: 'Cancelar',
                                    style: 'cancel',
                                },
                                {
                                    text: 'Eliminar',
                                    style: 'destructive',
                                    onPress: async () => {
                                        try {
                                            const result = await api.deleteChat(chatId);
                                            if (result.error) {
                                                Alert.alert('Error', result.error);
                                            } else {
                                                Alert.alert(
                                                    'Conversación eliminada',
                                                    'La conversación ha sido eliminada correctamente.',
                                                    [
                                                        {
                                                            text: 'OK',
                                                            onPress: () => navigation.goBack(),
                                                        },
                                                    ]
                                                );
                                            }
                                        } catch (error) {
                                            Alert.alert('Error', 'No se pudo eliminar la conversación');
                                        }
                                    },
                                },
                            ]
                        );
                    },
                },
                {
                    text: 'Ver perfil',
                    onPress: handleUserPress,
                },
                {
                    text: 'Cancelar',
                    style: 'cancel',
                },
            ]
        );
    };

    // Audio recording logic
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState('00:00');

    const handleVoice = async () => {
        if (recording) {
            await stopRecording();
        } else {
            await startRecording();
        }
    };

    const startRecording = async () => {
        try {
            const permission = await Audio.requestPermissionsAsync();
            if (permission.status !== 'granted') {
                Alert.alert('Permiso denegado', 'Se necesita acceso al micrófono para grabar audios');
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY,
                (status) => {
                    if (status.canRecord) {
                        const durationMillis = status.durationMillis;
                        const seconds = Math.floor(durationMillis / 1000);
                        const minutes = Math.floor(seconds / 60);
                        const remainingSeconds = seconds % 60;
                        setRecordingDuration(
                            `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
                        );
                    }
                },
                200 // Update every 200ms
            );

            setRecording(recording);
            setIsRecording(true);
        } catch (err) {
            console.error('Failed to start recording', err);
            Alert.alert('Error', 'No se pudo iniciar la grabación');
        }
    };

    const stopRecording = async () => {
        if (!recording) return;

        setIsRecording(false);
        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setRecording(null);
            setRecordingDuration('00:00');

            if (uri) {
                // Upload audio
                uploadAndSend(uri, 'audio');
            }
        } catch (error) {
            console.error('Failed to stop recording', error);
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
        >
            <ChatHeader
                name={userName}
                avatar={userAvatar}
                rfc={userRfc}
                isAdmin={isAdmin}
                onBack={() => navigation.goBack()}
                onCall={handleCall}
                onUserPress={handleUserPress}
                onMore={handleMore}
            />

            <View style={[styles.chatContainer, { backgroundColor: colors.backgroundSecondary, paddingBottom: insets.bottom }]}>
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
                            return <MessageBubble message={item} isOwn={isOwn} showTail={showTail} onMediaPress={handleMediaPreview} colors={colors} />;
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
                    onVoice={handleVoice}
                    isRecording={isRecording}
                    recordingDuration={recordingDuration}
                />
            </View>

            {/* Modal de solicitud de llamada */}
            <Modal
                visible={showCallModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowCallModal(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <TouchableOpacity
                        style={styles.modalDismiss}
                        activeOpacity={1}
                        onPress={() => setShowCallModal(false)}
                    />
                    <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Solicitar Llamada</Text>
                            <TouchableOpacity onPress={() => setShowCallModal(false)}>
                                <Ionicons name="close" size={24} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                                Completa el formulario y el consultor te llamará lo antes posible.
                            </Text>

                            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Nombre</Text>
                            <TextInput
                                style={[styles.modalInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                                placeholder="Tu nombre completo"
                                placeholderTextColor={colors.textMuted}
                                value={callName}
                                onChangeText={setCallName}
                            />

                            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Teléfono</Text>
                            <TextInput
                                style={[styles.modalInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                                placeholder="Tu número de teléfono"
                                placeholderTextColor={colors.textMuted}
                                value={callPhone}
                                onChangeText={setCallPhone}
                                keyboardType="phone-pad"
                            />

                            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Motivo de la llamada</Text>
                            <TextInput
                                style={[styles.modalInput, styles.textArea, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                                placeholder="Describe brevemente tu emergencia o consulta..."
                                placeholderTextColor={colors.textMuted}
                                value={callEmergency}
                                onChangeText={setCallEmergency}
                                multiline
                                numberOfLines={3}
                            />

                            <TouchableOpacity
                                style={[styles.submitButton, { backgroundColor: colors.primary }, isSubmitting && styles.submitButtonDisabled]}
                                onPress={handleSubmitCallRequest}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.submitButtonText}>Enviar Solicitud</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Media Preview Modal */}
            <MediaPreview
                visible={previewMedia.visible}
                mediaUrl={previewMedia.url}
                mediaType={previewMedia.type}
                fileName={previewMedia.fileName}
                onClose={closeMediaPreview}
            />
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    chatContainer: {
        flex: 1,
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
        borderBottomRightRadius: 4,
    },
    otherBubble: {
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
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
        justifyContent: 'center',
        alignItems: 'center',
    },
    fileText: {
        fontSize: 14,
        textDecorationLine: 'underline',
        maxWidth: 150,
    },
    audioContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        width: 200,
    },
    playButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    audioWaveform: {
        flex: 1,
        justifyContent: 'center',
    },
    audioLine: {
        height: 2,
        width: '100%',
        backgroundColor: 'rgba(0,0,0,0.1)',
        marginBottom: 4,
        borderRadius: 1,
    },
    audioText: {
        fontSize: 12,
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
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalDismiss: {
        flex: 1,
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    modalSubtitle: {
        fontSize: 14,
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 6,
        marginTop: 12,
    },
    modalInput: {
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        borderWidth: 1,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    submitButton: {
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 24,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default ChatScreen;
