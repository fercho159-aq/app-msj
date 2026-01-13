import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import { useAuth } from './AuthContext';
import createAgoraRtcEngine, {
    //    RtcEngine, // Note: Typed as any for now to avoid compilation errors if package missing
    ChannelProfileType,
    ClientRoleType,
    IRtcEngine
} from 'react-native-agora';
import { Permission, PermissionsAndroid } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://appsoluciones.duckdns.org/api';

// Esta variable debe venir de .env
const AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID || '';

interface AgoraCallContextType {
    engine: IRtcEngine | null;
    isConnected: boolean;
    isInCall: boolean; // Si estamos en una llamada activa
    isMuted: boolean;
    isSpeakerOn: boolean;
    callDuration: number;
    remoteUsers: number[]; // UIDs de usuarios remotos
    channelName: string | null;
    startCall: (targetUserId: string, targetUserName: string) => Promise<void>;
    joinCall: (channelName: string) => Promise<void>;
    endCall: () => Promise<void>;
    toggleMute: () => void;
    toggleSpeaker: () => void;
}

const AgoraCallContext = createContext<AgoraCallContextType | undefined>(undefined);

interface AgoraCallProviderProps {
    children: ReactNode;
}

export const AgoraCallProvider: React.FC<AgoraCallProviderProps> = ({ children }) => {
    const { user } = useAuth();
    const engine = useRef<IRtcEngine | null>(null);

    // Call state
    const [isConnected, setIsConnected] = useState(false);
    const [channelName, setChannelName] = useState<string | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(false);
    const [remoteUsers, setRemoteUsers] = useState<number[]>([]);
    const [callDuration, setCallDuration] = useState(0);

    const isInCall = !!channelName;

    // Inicializar Agora Engine
    useEffect(() => {
        const initAgora = async () => {
            if (!AGORA_APP_ID) {
                console.warn('⚠️ AGORA_APP_ID no está configurado');
                return;
            }

            try {
                engine.current = createAgoraRtcEngine();
                engine.current.initialize({ appId: AGORA_APP_ID });

                // Configurar eventos
                engine.current.addListener('onJoinChannelSuccess', (connection, elapsed) => {
                    console.log('✅ Unido al canal:', connection.channelId);
                    setIsConnected(true);
                    setChannelName(connection.channelId || null);
                    // Por defecto activar altavoz en llamadas de voz si es comportamiento deseado
                    // engine.current?.setEnableSpeakerphone(false); 
                });

                engine.current.addListener('onUserJoined', (connection, remoteUid, elapsed) => {
                    console.log('👤 Usuario remoto unido:', remoteUid);
                    setRemoteUsers(prev => [...prev, remoteUid]);
                });

                engine.current.addListener('onUserOffline', (connection, remoteUid, reason) => {
                    console.log('👤 Usuario remoto salió:', remoteUid);
                    setRemoteUsers(prev => prev.filter(uid => uid !== remoteUid));

                    // Si el único usuario remoto se va, ¿colgamos? 
                    // Depende de la lógica de negocio. Por ahora no.
                });

                engine.current.addListener('onLeaveChannel', (connection, stats) => {
                    console.log('👋 Salimos del canal');
                    setIsConnected(false);
                    setChannelName(null);
                    setRemoteUsers([]);
                });

            } catch (e) {
                console.error('❌ Error inicializando Agora:', e);
            }
        };

        if (AGORA_APP_ID) {
            initAgora();
        }

        return () => {
            if (engine.current) {
                engine.current.release();
            }
        };
    }, []);

    // Timer de duración
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isInCall && isConnected) {
            interval = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        } else {
            setCallDuration(0);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isInCall, isConnected]);

    // Permisos (Android)
    const requestAndroidPermissions = async () => {
        if (Platform.OS === 'android') {
            try {
                const granted = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                    PermissionsAndroid.PERMISSIONS.CAMERA,
                ]);
                return (
                    granted['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED &&
                    granted['android.permission.CAMERA'] === PermissionsAndroid.RESULTS.GRANTED
                );
            } catch (err) {
                console.warn(err);
                return false;
            }
        }
        return true;
    };

    const startCall = useCallback(async (targetUserId: string, targetUserName: string) => {
        if (!engine.current) {
            Alert.alert('Error', 'El motor de llamadas no está inicializado');
            return;
        }

        const hasPerms = await requestAndroidPermissions();
        if (!hasPerms) {
            Alert.alert('Permisos requeridos', 'Se necesitan permisos de micrófono y cámara');
            return;
        }

        try {
            // Generar nombre de canal único
            const newChannelName = `call_${user?.id}_${targetUserId}_${Date.now()}`;

            // Obtener token del backend
            const response = await fetch(`${API_URL}/agora/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channelName: newChannelName,
                    uid: user?.id, // Enviamos el ID del usuario actual
                    role: 'publisher'
                }),
            });

            if (!response.ok) throw new Error('Error obteniendo token');

            const { token, uid } = await response.json();
            const uidNum = parseInt(String(uid).replace(/\D/g, '')) || 0; // Agora requiere UID numérico o string userAccount. Usamos numérico si es posible, o 0 para que asigne.
            // Para mantener consistencia con backend que usa tokens con cuenta, usamos joinChannelWithUserAccount

            // Habilitar audio
            engine.current.enableAudio();

            // Unirse usando User Account (string ID)
            engine.current.joinChannelWithUserAccount(token, newChannelName, String(user?.id), {
                channelProfile: ChannelProfileType.ChannelProfileCommunication,
                clientRoleType: ClientRoleType.ClientRoleBroadcaster,
                publishMicrophoneTrack: true,
                autoSubscribeAudio: true,
                autoSubscribeVideo: false,
            });

            console.log('📞 Iniciando llamada en canal:', newChannelName);

            // Notificar al otro usuario vía socket/API (implementar notificación push aquí si no existe)
            // Aquí deberíamos llamar a una API para enviar la notificación push al targetUserId

        } catch (error) {
            console.error('Error iniciando llamada:', error);
            Alert.alert('Error', 'No se pudo iniciar la llamada');
        }
    }, [user, engine.current]);

    const joinCall = useCallback(async (channel: string) => {
        if (!engine.current) return;

        const hasPerms = await requestAndroidPermissions();
        if (!hasPerms) return;

        try {
            // Obtener token para este canal
            const response = await fetch(`${API_URL}/agora/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channelName: channel,
                    uid: user?.id,
                    role: 'publisher'
                }),
            });

            if (!response.ok) throw new Error('Error obteniendo token');
            const { token } = await response.json();

            engine.current.enableAudio();
            engine.current.joinChannelWithUserAccount(token, channel, String(user?.id), {
                channelProfile: ChannelProfileType.ChannelProfileCommunication,
                clientRoleType: ClientRoleType.ClientRoleBroadcaster,
                publishMicrophoneTrack: true,
                autoSubscribeAudio: true,
                autoSubscribeVideo: false,
            });

        } catch (error) {
            console.error('Error uniéndose a llamada:', error);
            Alert.alert('Error', 'No se pudo unir a la llamada');
        }
    }, [user, engine.current]);

    const endCall = useCallback(async () => {
        if (engine.current) {
            engine.current.leaveChannel();
            setChannelName(null);
            setRemoteUsers([]);
            setCallDuration(0);
        }
    }, [engine.current]);

    const toggleMute = useCallback(() => {
        if (engine.current) {
            const newMuted = !isMuted;
            engine.current.muteLocalAudioStream(newMuted);
            setIsMuted(newMuted);
        }
    }, [isMuted, engine.current]);

    const toggleSpeaker = useCallback(() => {
        if (engine.current) {
            const newSpeaker = !isSpeakerOn;
            engine.current.setEnableSpeakerphone(newSpeaker);
            setIsSpeakerOn(newSpeaker);
        }
    }, [isSpeakerOn, engine.current]);

    const value: AgoraCallContextType = {
        engine: engine.current,
        isConnected,
        isInCall,
        isMuted,
        isSpeakerOn,
        callDuration,
        remoteUsers,
        channelName,
        startCall,
        joinCall,
        endCall,
        toggleMute,
        toggleSpeaker,
    };

    return (
        <AgoraCallContext.Provider value={value}>
            {children}
        </AgoraCallContext.Provider>
    );
};

export const useAgoraCall = (): AgoraCallContextType => {
    const context = useContext(AgoraCallContext);
    if (!context) {
        throw new Error('useAgoraCall debe usarse dentro de AgoraCallProvider');
    }
    return context;
};

export default AgoraCallProvider;
