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
import { usePreventScreenCapture } from 'expo-screen-capture';

import { ChatHeader, MessageInput, MediaPreview } from '../components';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCall } from '../context/CallContext';
import { api, Message, Chat, User } from '../api';
import { RootStackParamList } from '../types';
import { getAbsoluteMediaUrl } from '../utils/urlHelper';
import { socketService } from '../services/socketService';

/**
 * Genera barras de waveform pseudo-aleatorias determinísticas a partir de un ID.
 * Siempre retorna el mismo patrón para el mismo ID.
 */
const generateWaveformBars = (messageId: string, barCount: number = 35): number[] => {
    const bars: number[] = [];
    let hash = 0;
    for (let i = 0; i < messageId.length; i++) {
        const char = messageId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    for (let i = 0; i < barCount; i++) {
        hash = ((hash << 5) - hash) + i;
        hash |= 0;
        const normalized = (Math.abs(hash % 75) + 25) / 100; // Rango: 0.25 a 1.0
        bars.push(normalized);
    }
    return bars;
};

const formatAudioDuration = (millis: number): string => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

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
    showSenderName: boolean;
    senderDisplayName?: string | null;
    onMediaPress?: (url: string, type: string, fileName?: string) => void;
    colors: any;
}

const SENDER_NAME_COLORS = ['#E57373', '#F06292', '#BA68C8', '#9575CD', '#7986CB', '#64B5F6', '#4FC3F7', '#4DD0E1', '#4DB6AC', '#81C784', '#AED581', '#FFB74D', '#FF8A65', '#A1887F'];

const getSenderColor = (senderId: string): string => {
    let hash = 0;
    for (let i = 0; i < senderId.length; i++) {
        hash = ((hash << 5) - hash) + senderId.charCodeAt(i);
        hash |= 0;
    }
    return SENDER_NAME_COLORS[Math.abs(hash) % SENDER_NAME_COLORS.length];
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwn, showTail, showSenderName, senderDisplayName, onMediaPress, colors }) => {
    const getStatusIcon = (): { icon: string; color: string } => {
        switch (message.status) {
            case 'sent': return { icon: '✓', color: 'rgba(255,255,255,0.5)' };
            case 'delivered': return { icon: '✓✓', color: 'rgba(255,255,255,0.5)' };
            case 'read': return { icon: '✓✓', color: '#60A5FA' };
            default: return { icon: '🕒', color: 'rgba(255,255,255,0.5)' };
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

    // ===== Audio state =====
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const soundRef = useRef<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackPosition, setPlaybackPosition] = useState(0);
    const [playbackDuration, setPlaybackDuration] = useState(0);
    const [waveformWidth, setWaveformWidth] = useState(200);
    const waveformBars = useRef(
        message.type === 'audio' ? generateWaveformBars(message.id) : []
    ).current;

    useEffect(() => {
        return () => {
            soundRef.current?.unloadAsync();
        };
    }, []);

    const setupPlaybackStatusUpdate = (soundInstance: Audio.Sound) => {
        soundInstance.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded) {
                setPlaybackPosition(status.positionMillis || 0);
                if (status.durationMillis) {
                    setPlaybackDuration(status.durationMillis);
                }
                if (status.didJustFinish) {
                    setIsPlaying(false);
                    setPlaybackPosition(0);
                    soundInstance.setPositionAsync(0);
                }
            }
        });
    };

    const ensurePlaybackMode = async () => {
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
        });
    };

    const playSound = async () => {
        try {
            if (sound) {
                if (isPlaying) {
                    await sound.pauseAsync();
                    setIsPlaying(false);
                } else {
                    await ensurePlaybackMode();
                    await sound.playAsync();
                    setIsPlaying(true);
                }
            } else {
                if (!mediaUrl) return;
                await ensurePlaybackMode();
                const { sound: newSound } = await Audio.Sound.createAsync(
                    { uri: mediaUrl },
                    { shouldPlay: true }
                );
                soundRef.current = newSound;
                setSound(newSound);
                setIsPlaying(true);

                const status = await newSound.getStatusAsync();
                if (status.isLoaded && status.durationMillis) {
                    setPlaybackDuration(status.durationMillis);
                }

                setupPlaybackStatusUpdate(newSound);
            }
        } catch (error) {
            console.error('Error playing sound', error);
            Alert.alert('Error', 'No se pudo reproducir el audio');
        }
    };

    const handleSeek = async (ratio: number) => {
        if (!sound || playbackDuration <= 0) {
            // Si no hay sound todavía, cargarlo primero
            if (!mediaUrl) return;
            try {
                await ensurePlaybackMode();
                const { sound: newSound } = await Audio.Sound.createAsync(
                    { uri: mediaUrl },
                    { shouldPlay: false }
                );
                soundRef.current = newSound;
                setSound(newSound);

                const status = await newSound.getStatusAsync();
                if (status.isLoaded && status.durationMillis) {
                    setPlaybackDuration(status.durationMillis);
                    const seekPosition = ratio * status.durationMillis;
                    await newSound.setPositionAsync(seekPosition);
                    setPlaybackPosition(seekPosition);
                }
                setupPlaybackStatusUpdate(newSound);
            } catch (error) {
                console.error('Error seeking audio', error);
            }
            return;
        }
        const seekPosition = ratio * playbackDuration;
        await sound.setPositionAsync(seekPosition);
        setPlaybackPosition(seekPosition);
    };

    const progress = playbackDuration > 0 ? playbackPosition / playbackDuration : 0;

    return (
        <View style={[styles.messageContainer, isOwn ? styles.ownMessage : styles.otherMessage]}>
            <View style={[
                styles.bubble,
                isOwn
                    ? [styles.ownBubble, { backgroundColor: colors.messageSent }]
                    : [styles.otherBubble, { backgroundColor: colors.messageReceived }]
            ]}>

                {showSenderName && !isOwn && (senderDisplayName || message.sender?.name) && (
                    <Text style={[styles.senderName, { color: getSenderColor(message.senderId) }]}>
                        {senderDisplayName || message.sender?.name}
                    </Text>
                )}

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
                        <TouchableOpacity
                            onPress={playSound}
                            style={[
                                styles.playButton,
                                {
                                    backgroundColor: isOwn
                                        ? 'rgba(255,255,255,0.2)'
                                        : `${colors.primary}15`,
                                },
                            ]}
                        >
                            <Ionicons
                                name={isPlaying ? 'pause' : 'play'}
                                size={22}
                                color={isOwn ? '#ffffff' : colors.primary}
                                style={!isPlaying ? { marginLeft: 3 } : undefined}
                            />
                        </TouchableOpacity>

                        <View style={styles.audioWaveformArea}>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={(event) => {
                                    const seekRatio = Math.max(0, Math.min(1, event.nativeEvent.locationX / waveformWidth));
                                    handleSeek(seekRatio);
                                }}
                                onLayout={(e) => setWaveformWidth(e.nativeEvent.layout.width)}
                                style={styles.waveformContainer}
                            >
                                {waveformBars.map((height, index) => {
                                    const barProgress = index / waveformBars.length;
                                    const isFilled = barProgress <= progress;
                                    return (
                                        <View
                                            key={index}
                                            style={{
                                                width: 3,
                                                height: height * 28,
                                                minHeight: 3,
                                                borderRadius: 1.5,
                                                backgroundColor: isFilled
                                                    ? (isOwn ? '#ffffff' : colors.primary)
                                                    : (isOwn ? 'rgba(255,255,255,0.3)' : `${colors.primary}30`),
                                            }}
                                        />
                                    );
                                })}
                            </TouchableOpacity>

                            <Text style={[
                                styles.audioDuration,
                                { color: isOwn ? 'rgba(255,255,255,0.7)' : colors.textMuted },
                            ]}>
                                {isPlaying || playbackPosition > 0
                                    ? formatAudioDuration(playbackPosition)
                                    : (playbackDuration > 0 ? formatAudioDuration(playbackDuration) : '0:00')
                                }
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
                    {isOwn && (() => {
                        const status = getStatusIcon();
                        return (
                            <Text style={[styles.messageStatus, { color: status.color }]}>
                                {status.icon}
                            </Text>
                        );
                    })()}
                </View>
            </View>
        </View>
    );
};

export const ChatScreen: React.FC<ChatScreenProps> = ({ route, navigation }) => {
    usePreventScreenCapture();
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

    // Message action state
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [showMessageActions, setShowMessageActions] = useState(false);
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [editText, setEditText] = useState('');

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

    const isAdmin = user?.rfc === 'ADMIN000CONS' || user?.role === 'consultor';

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

    // Efecto para carga inicial y configurar socket + polling de respaldo
    useEffect(() => {
        loadMessages(true);
        loadChatInfo();
        markAsRead();

        // Escuchar nuevos mensajes en tiempo real
        const onNewMessage = (data: { chatId: string; message: any }) => {
            if (data.chatId === chatId) {
                setMessages(prev => {
                    if (prev.some(m => m.id === data.message.id)) return prev;
                    return [...prev, data.message];
                });
                // Marcar como leido INMEDIATAMENTE via REST (esto notifica al sender por socket)
                api.markMessagesAsRead(chatId);
                api.markChatAsRead(chatId);
            }
        };

        // Escuchar cuando nuestros mensajes son entregados
        const onDelivered = (data: { chatId: string; messageIds: string[] }) => {
            if (data.chatId === chatId) {
                setMessages(prev => prev.map(msg =>
                    data.messageIds.includes(msg.id) && msg.status === 'sent'
                        ? { ...msg, status: 'delivered' as const }
                        : msg
                ));
            }
        };

        // Escuchar cuando nuestros mensajes son leidos
        const onRead = (data: { chatId: string; messageIds: string[] }) => {
            if (data.chatId === chatId) {
                setMessages(prev => prev.map(msg =>
                    data.messageIds.includes(msg.id) && msg.status !== 'read'
                        ? { ...msg, status: 'read' as const }
                        : msg
                ));
            }
        };

        // Escuchar cuando un mensaje es eliminado
        const onDeleted = (data: { chatId: string; messageId: string }) => {
            if (data.chatId === chatId) {
                setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
            }
        };

        // Escuchar cuando un mensaje es editado
        const onEdited = (data: { chatId: string; messageId: string; newText: string }) => {
            if (data.chatId === chatId) {
                setMessages(prev => prev.map(msg =>
                    msg.id === data.messageId ? { ...msg, text: data.newText } : msg
                ));
            }
        };

        socketService.on('new-message', onNewMessage);
        socketService.on('messages-delivered', onDelivered);
        socketService.on('messages-read', onRead);
        socketService.on('message-deleted', onDeleted);
        socketService.on('message-edited', onEdited);

        // Polling de respaldo cada 10 segundos
        pollingRef.current = setInterval(() => {
            loadMessages(false);
            // Cada vez que cargamos mensajes, marcamos como leidos
            api.markMessagesAsRead(chatId);
        }, 10000);

        return () => {
            socketService.off('new-message', onNewMessage);
            socketService.off('messages-delivered', onDelivered);
            socketService.off('messages-read', onRead);
            socketService.off('message-deleted', onDeleted);
            socketService.off('message-edited', onEdited);
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

    const isConsultor = user?.rfc === 'ADMIN000CONS' || user?.role === 'consultor';

    const handleMessageLongPress = (message: Message) => {
        const isOwnMessage = message.senderId === user?.id;
        if (!isConsultor && !isOwnMessage) return;
        setSelectedMessage(message);
        setShowMessageActions(true);
    };

    const handleDeleteMessage = () => {
        if (!selectedMessage) return;
        const msgToDelete = selectedMessage;
        setShowMessageActions(false);
        setSelectedMessage(null);

        setTimeout(() => {
            Alert.alert(
                'Eliminar mensaje',
                'Se eliminara para todos los participantes de este chat.',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Eliminar',
                        style: 'destructive',
                        onPress: async () => {
                            const result = await api.deleteMessage(msgToDelete.id);
                            if (!result.error) {
                                setMessages(prev => prev.filter(m => m.id !== msgToDelete.id));
                            }
                        },
                    },
                ]
            );
        }, 350);
    };

    const handleEditMessage = () => {
        if (!selectedMessage) return;
        const msgToEdit = selectedMessage;
        setShowMessageActions(false);
        setSelectedMessage(null);
        setTimeout(() => {
            setEditingMessage(msgToEdit);
            setEditText(msgToEdit.text);
        }, 350);
    };

    const handleCopyMessage = () => {
        if (!selectedMessage) return;
        import('react-native').then(({ Clipboard }) => {
            // @ts-ignore
            if (Clipboard?.setString) Clipboard.setString(selectedMessage.text);
        }).catch(() => {});
        setShowMessageActions(false);
        setSelectedMessage(null);
    };

    const handleSaveEdit = async () => {
        if (!editingMessage || !editText.trim()) return;
        const result = await api.editMessage(editingMessage.id, editText.trim());
        if (!result.error) {
            setMessages(prev => prev.map(m =>
                m.id === editingMessage.id ? { ...m, text: editText.trim() } : m
            ));
        }
        setEditingMessage(null);
        setEditText('');
    };

    const handleSendMessage = async (text: string, type: 'text' | 'image' | 'file' | 'audio' = 'text', mediaUrl?: string) => {
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
            const sentMessage = result.data.message;
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === tempMessage.id ? sentMessage : msg
                )
            );
            // Notificar a otros usuarios via socket
            socketService.emitNewMessage(chatId, sentMessage);
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

    const uploadAndSend = async (uri: string, type: 'image' | 'file' | 'audio') => {
        setIsUploading(true);
        try {
            const uploadResult = await api.uploadFile(uri, type);

            if (uploadResult.error || !uploadResult.data) {
                Alert.alert('Error', 'No se pudo subir el archivo');
                return;
            }

            const { url, filename } = uploadResult.data as any;

            // Enviar mensaje con el adjunto
            // Para imagen y audio usamos texto vacío, para archivo usamos el nombre del archivo
            const messageText = type === 'file' ? filename : '';
            await handleSendMessage(
                messageText,
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

    const handleBlockFromChat = () => {
        Alert.alert(
            'Bloquear usuario',
            `¿Bloquear a ${userName}? No recibirás mensajes de este usuario y no podrá contactarte.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Bloquear',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.blockUser(routeParticipantId);
                            Alert.alert('Usuario bloqueado', `${userName} ha sido bloqueado.`, [
                                { text: 'OK', onPress: () => navigation.goBack() }
                            ]);
                        } catch (error) {
                            Alert.alert('Error', 'No se pudo bloquear al usuario');
                        }
                    },
                },
            ]
        );
    };

    const handleReportFromChat = () => {
        Alert.alert(
            'Reportar usuario',
            'Selecciona el motivo del reporte',
            [
                {
                    text: 'Spam',
                    onPress: () => submitQuickReport('spam'),
                },
                {
                    text: 'Acoso',
                    onPress: () => submitQuickReport('harassment'),
                },
                {
                    text: 'Contenido inapropiado',
                    onPress: () => submitQuickReport('inappropriate'),
                },
                {
                    text: 'Cancelar',
                    style: 'cancel',
                },
            ]
        );
    };

    const submitQuickReport = async (reason: string) => {
        try {
            const result = await api.reportUser(routeParticipantId, reason, undefined, undefined, chatId);
            if (result.error) {
                Alert.alert('Error', result.error);
            } else {
                Alert.alert('Reporte enviado', 'Nuestro equipo revisará el caso en las próximas 24 horas.');
            }
        } catch (error) {
            Alert.alert('Error', 'No se pudo enviar el reporte');
        }
    };

    const handleMore = () => {
        const options: any[] = [
            {
                text: 'Ver perfil',
                onPress: handleUserPress,
            },
        ];

        // Solo mostrar opciones de moderación en chats individuales
        if (routeParticipantId && routeParticipantId !== user?.id) {
            options.push(
                {
                    text: 'Reportar usuario',
                    onPress: handleReportFromChat,
                },
                {
                    text: 'Bloquear usuario',
                    style: 'destructive',
                    onPress: handleBlockFromChat,
                }
            );
        }

        options.push(
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
                text: 'Cancelar',
                style: 'cancel',
            }
        );

        Alert.alert('Opciones', 'Selecciona una acción', options);
    };

    // Audio recording logic
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState('00:00');

    const handleVoice = async () => {
        try {
            if (recording) {
                await stopRecording();
            } else {
                await startRecording();
            }
        } catch (err) {
            console.error('Error en handleVoice:', err);
            setRecording(null);
            setIsRecording(false);
            setRecordingDuration('00:00');
        }
    };

    const startRecording = async () => {
        try {
            const permission = await Audio.requestPermissionsAsync();
            if (permission.status !== 'granted') {
                Alert.alert('Permiso denegado', 'Se necesita acceso al micrófono para grabar audios');
                return;
            }

            // Limpiar cualquier grabación previa antes de iniciar
            if (recording) {
                try {
                    await recording.stopAndUnloadAsync();
                } catch (e) {
                    // Ignorar - la grabación ya pudo haber sido detenida
                }
                setRecording(null);
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });

            // Opciones de grabación compatibles con iPhone y iPad (.m4a AAC)
            const recordingOptions: Audio.RecordingOptions = {
                isMeteringEnabled: true,
                android: {
                    extension: '.m4a',
                    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
                    audioEncoder: Audio.AndroidAudioEncoder.AAC,
                    sampleRate: 44100,
                    numberOfChannels: 2,
                    bitRate: 128000,
                },
                ios: {
                    extension: '.m4a',
                    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
                    audioQuality: Audio.IOSAudioQuality.HIGH,
                    sampleRate: 44100,
                    numberOfChannels: 2,
                    bitRate: 128000,
                    linearPCMBitDepth: 16,
                    linearPCMIsBigEndian: false,
                    linearPCMIsFloat: false,
                },
                web: {
                    mimeType: 'audio/webm',
                    bitsPerSecond: 128000,
                },
            };

            const statusCallback = (status: Audio.RecordingStatus) => {
                if (status.isRecording && status.durationMillis !== undefined) {
                    const durationMillis = status.durationMillis;
                    const seconds = Math.floor(durationMillis / 1000);
                    const minutes = Math.floor(seconds / 60);
                    const remainingSeconds = seconds % 60;
                    setRecordingDuration(
                        `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
                    );
                }
            };

            let newRecording: Audio.Recording;
            try {
                const result = await Audio.Recording.createAsync(
                    recordingOptions,
                    statusCallback,
                    200
                );
                newRecording = result.recording;
            } catch (primaryError) {
                console.warn('Primary recording options failed, trying LOW_QUALITY fallback:', primaryError);
                const result = await Audio.Recording.createAsync(
                    Audio.RecordingOptionsPresets.LOW_QUALITY,
                    statusCallback,
                    200
                );
                newRecording = result.recording;
            }

            setRecording(newRecording);
            setIsRecording(true);
        } catch (err) {
            console.error('Failed to start recording', err);
            setRecording(null);
            setIsRecording(false);
            setRecordingDuration('00:00');
            Alert.alert('Error', 'No se pudo iniciar la grabación. Verifica que el micrófono no esté en uso por otra aplicación.');
        }
    };

    const stopRecording = async () => {
        if (!recording) return;

        setIsRecording(false);
        try {
            await recording.stopAndUnloadAsync();
        } catch (err) {
            console.warn('Error stopping recording:', err);
        }

        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
            });
        } catch (err) {
            console.warn('Error resetting audio mode:', err);
        }

        const uri = recording.getURI();
        setRecording(null);
        setRecordingDuration('00:00');

        if (uri) {
            uploadAndSend(uri, 'audio');
        }
    };

    const cancelRecording = async () => {
        if (!recording) return;

        setIsRecording(false);
        try {
            await recording.stopAndUnloadAsync();
        } catch (err) {
            console.warn('Error cancelling recording:', err);
        }

        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
            });
        } catch (error) {
            console.error('Failed to cancel recording', error);
        }
        setRecording(null);
        setRecordingDuration('00:00');
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            <ChatHeader
                name={userName}
                avatar={userAvatar}
                rfc={userRfc}
                isAdmin={isAdmin}
                isGroup={chatInfo?.isGroup || false}
                participants={chatInfo?.participants || []}
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
                            const showSenderName = !!chatInfo?.isGroup && showTail;
                            const participant = chatInfo?.participants?.find(p => p.id === item.senderId);
                            const senderDisplayName = item.sender?.name || participant?.name || participant?.rfc || null;
                            const canAct = isConsultor || isOwn;
                            return (
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onLongPress={() => canAct && handleMessageLongPress(item)}
                                    delayLongPress={400}
                                >
                                    <MessageBubble message={item} isOwn={isOwn} showTail={showTail} showSenderName={showSenderName} senderDisplayName={senderDisplayName} onMediaPress={handleMediaPreview} colors={colors} />
                                </TouchableOpacity>
                            );
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
                    onCancelRecording={cancelRecording}
                    isRecording={isRecording}
                    recordingDuration={recordingDuration}
                />
            </View>

            {/* WhatsApp-style context menu */}
            <Modal
                visible={showMessageActions}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={() => { setShowMessageActions(false); setSelectedMessage(null); }}
            >
                <TouchableOpacity
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}
                    activeOpacity={1}
                    onPress={() => { setShowMessageActions(false); setSelectedMessage(null); }}
                >
                    {selectedMessage && (
                        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
                            {/* Mensaje flotante */}
                            <View style={{
                                alignSelf: selectedMessage.senderId === user?.id ? 'flex-end' : 'flex-start',
                                maxWidth: '80%', marginBottom: 8,
                            }}>
                                <View style={{
                                    backgroundColor: selectedMessage.senderId === user?.id
                                        ? (colors.messageSent || '#005C4B') : (isDark ? '#1F2C34' : '#FFFFFF'),
                                    borderRadius: 12, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 6,
                                    ...(Platform.OS === 'web' ? { boxShadow: '0 4px 20px rgba(0,0,0,0.3)' } as any : {
                                        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
                                        shadowOpacity: 0.25, shadowRadius: 12, elevation: 8,
                                    }),
                                }}>
                                    <Text style={{
                                        color: selectedMessage.senderId === user?.id ? '#FFFFFF' : colors.textPrimary,
                                        fontSize: 15,
                                    }}>
                                        {selectedMessage.type === 'image' ? '📷 Imagen' :
                                         selectedMessage.type === 'audio' ? '🎵 Audio' :
                                         selectedMessage.type === 'file' ? '📎 Archivo' :
                                         selectedMessage.text}
                                    </Text>
                                    <Text style={{
                                        color: selectedMessage.senderId === user?.id
                                            ? 'rgba(255,255,255,0.55)' : colors.textMuted,
                                        fontSize: 11, textAlign: 'right', marginTop: 2,
                                    }}>
                                        {(() => { try { return format(parseISO(selectedMessage.timestamp), 'HH:mm'); } catch { return ''; } })()}
                                    </Text>
                                </View>
                            </View>

                            {/* Menu contextual */}
                            <View style={{
                                alignSelf: selectedMessage.senderId === user?.id ? 'flex-end' : 'flex-start',
                                backgroundColor: isDark ? '#233138' : '#FFFFFF',
                                borderRadius: 14, overflow: 'hidden', width: 220,
                                ...(Platform.OS === 'web' ? { boxShadow: '0 8px 30px rgba(0,0,0,0.35)' } as any : {
                                    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
                                    shadowOpacity: 0.3, shadowRadius: 16, elevation: 12,
                                }),
                            }}>
                                {/* Copiar */}
                                {selectedMessage.type === 'text' && (
                                    <TouchableOpacity
                                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 18 }}
                                        activeOpacity={0.6}
                                        onPress={handleCopyMessage}
                                    >
                                        <Text style={{ color: colors.textPrimary, fontSize: 16 }}>Copiar</Text>
                                        <Ionicons name="copy-outline" size={19} color={colors.textMuted} />
                                    </TouchableOpacity>
                                )}

                                {/* Editar */}
                                {selectedMessage.type === 'text' && (
                                    <>
                                        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
                                        <TouchableOpacity
                                            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 18 }}
                                            activeOpacity={0.6}
                                            onPress={handleEditMessage}
                                        >
                                            <Text style={{ color: colors.textPrimary, fontSize: 16 }}>Editar</Text>
                                            <Ionicons name="pencil-outline" size={19} color={colors.textMuted} />
                                        </TouchableOpacity>
                                    </>
                                )}

                                {/* Eliminar */}
                                <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
                                <TouchableOpacity
                                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 18 }}
                                    activeOpacity={0.6}
                                    onPress={handleDeleteMessage}
                                >
                                    <Text style={{ color: '#E74C3C', fontSize: 16 }}>Eliminar</Text>
                                    <Ionicons name="trash-outline" size={19} color="#E74C3C" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </TouchableOpacity>
            </Modal>

            {/* Editar mensaje - inline bar */}
            <Modal
                visible={!!editingMessage}
                transparent
                animationType="slide"
                statusBarTranslucent
                onRequestClose={() => setEditingMessage(null)}
            >
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <TouchableOpacity
                        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
                        activeOpacity={1}
                        onPress={() => setEditingMessage(null)}
                    />
                    <View style={{
                        backgroundColor: isDark ? '#1A2027' : '#FFFFFF',
                        paddingBottom: Platform.OS === 'ios' ? 34 : 12,
                    }}>
                        {/* Edit indicator bar */}
                        <View style={{
                            flexDirection: 'row', alignItems: 'center',
                            paddingHorizontal: 16, paddingVertical: 10,
                            borderBottomWidth: StyleSheet.hairlineWidth,
                            borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                        }}>
                            <View style={{ width: 3, height: 32, borderRadius: 2, backgroundColor: '#00A884', marginRight: 12 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: '#00A884', fontSize: 13, fontWeight: '600', marginBottom: 2 }}>Editando</Text>
                                <Text style={{ color: colors.textMuted, fontSize: 14 }} numberOfLines={1}>
                                    {editingMessage?.text}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setEditingMessage(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Ionicons name="close" size={22} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {/* Input row */}
                        <View style={{
                            flexDirection: 'row', alignItems: 'flex-end',
                            paddingHorizontal: 8, paddingTop: 8, gap: 8,
                        }}>
                            <View style={{
                                flex: 1, borderRadius: 22,
                                backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F0F2F5',
                                paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 10 : 6,
                                minHeight: 44, maxHeight: 120, justifyContent: 'center',
                            }}>
                                <TextInput
                                    style={{
                                        color: colors.textPrimary, fontSize: 16,
                                        maxHeight: 100, textAlignVertical: 'center',
                                    }}
                                    value={editText}
                                    onChangeText={setEditText}
                                    multiline
                                    autoFocus
                                />
                            </View>
                            <TouchableOpacity
                                onPress={handleSaveEdit}
                                disabled={!editText.trim() || editText.trim() === editingMessage?.text}
                                style={{
                                    width: 44, height: 44, borderRadius: 22,
                                    backgroundColor: (editText.trim() && editText.trim() !== editingMessage?.text)
                                        ? '#00A884' : (isDark ? 'rgba(0,168,132,0.3)' : 'rgba(0,168,132,0.2)'),
                                    alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                <Ionicons name="checkmark" size={22} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

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
    senderName: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 2,
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
        width: 260,
    },
    playButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    audioWaveformArea: {
        flex: 1,
        justifyContent: 'center',
    },
    waveformContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 32,
        gap: 1.5,
    },
    audioDuration: {
        fontSize: 12,
        marginTop: 2,
        fontVariant: ['tabular-nums'] as any,
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
