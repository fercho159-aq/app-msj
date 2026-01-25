import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { Alert, Platform, PermissionsAndroid } from 'react-native';
import Constants from 'expo-constants';
import { useAuth } from './AuthContext';

// Solo importar Agora e InCallManager en plataformas nativas (iOS/Android)
// Web no soporta react-native-agora
let createAgoraRtcEngine: any = null;
let ChannelProfileType: any = {};
let ClientRoleType: any = {};
let InCallManager: any = null;
type IRtcEngine = any;

if (Platform.OS !== 'web') {
    const agoraModule = require('react-native-agora');
    createAgoraRtcEngine = agoraModule.default;
    ChannelProfileType = agoraModule.ChannelProfileType;
    ClientRoleType = agoraModule.ClientRoleType;

    // InCallManager para manejar el audio routing
    InCallManager = require('react-native-incall-manager').default;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL || 'https://appsoluciones.duckdns.org/api';

// Esta variable debe venir de app.json extra o .env
const AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID || Constants.expoConfig?.extra?.EXPO_PUBLIC_AGORA_APP_ID || '';

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
                console.log('🎙️ Inicializando Agora con App ID:', AGORA_APP_ID.substring(0, 8) + '...');
                engine.current = createAgoraRtcEngine();
                engine.current.initialize({ appId: AGORA_APP_ID });

                // Habilitar audio desde la inicialización
                engine.current.enableAudio();
                console.log('🔊 Audio habilitado en inicialización');

                // Configurar eventos
                engine.current.addListener('onJoinChannelSuccess', (connection: any, elapsed: number) => {
                    console.log('✅ Unido al canal:', connection.channelId);
                    console.log('✅ Local UID:', connection.localUid);
                    console.log('✅ Tiempo de conexión:', elapsed, 'ms');
                    setIsConnected(true);
                    setChannelName(connection.channelId || null);
                });

                engine.current.addListener('onUserJoined', (connection: any, remoteUid: number, elapsed: number) => {
                    console.log('👤 Usuario remoto unido - UID:', remoteUid);
                    setRemoteUsers(prev => [...prev, remoteUid]);
                });

                engine.current.addListener('onUserOffline', (connection: any, remoteUid: number, reason: number) => {
                    console.log('👤 Usuario remoto salió - UID:', remoteUid, 'Razón:', reason);
                    setRemoteUsers(prev => prev.filter(uid => uid !== remoteUid));
                });

                engine.current.addListener('onLeaveChannel', (connection: any, stats: any) => {
                    console.log('👋 Salimos del canal');
                    setIsConnected(false);
                    setChannelName(null);
                    setRemoteUsers([]);
                });

                // Listener para errores
                engine.current.addListener('onError', (err: number, msg: string) => {
                    console.error('❌ Agora Error:', err, msg);
                });

                // Listener para estado de conexión
                engine.current.addListener('onConnectionStateChanged', (connection: any, state: number, reason: number) => {
                    console.log('🔗 Estado de conexión:', state, 'Razón:', reason);
                });

                // Listener para audio
                engine.current.addListener('onAudioVolumeIndication', (connection: any, speakers: any[], totalVolume: number) => {
                    if (totalVolume > 0) {
                        console.log('🎤 Volumen detectado:', totalVolume);
                    }
                });

                // Habilitar indicador de volumen para debug
                engine.current.enableAudioVolumeIndication(2000, 3, true);

                console.log('✅ Agora inicializado correctamente');
            } catch (e) {
                console.error('❌ Error inicializando Agora:', e);
            }
        };

        // Solo inicializar en plataformas nativas
        if (AGORA_APP_ID && Platform.OS !== 'web' && createAgoraRtcEngine) {
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
        if (Platform.OS === 'web') {
            Alert.alert('No disponible', 'Las llamadas no están disponibles en web');
            return;
        }
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

            // ✅ Iniciar InCallManager para manejar la sesión de audio
            if (InCallManager) {
                InCallManager.start({ media: 'audio' });
                InCallManager.setForceSpeakerphoneOn(false); // Usar auricular por defecto
                console.log('🔊 InCallManager iniciado');
            }

            // Configurar el audio de Agora
            engine.current.enableAudio();
            engine.current.setDefaultAudioRouteToSpeakerphone(false); // Usar auricular
            engine.current.muteLocalAudioStream(false); // Asegurar que no está muteado

            // Ajustar volumen
            engine.current.adjustRecordingSignalVolume(400); // Aumentar volumen de grabación
            engine.current.adjustPlaybackSignalVolume(400); // Aumentar volumen de reproducción

            console.log('📞 Uniéndose al canal:', newChannelName);
            console.log('📞 Con token:', token.substring(0, 20) + '...');
            console.log('📞 UID:', uid);

            // Unirse al canal con UID numérico (0 = auto-asignado por Agora)
            engine.current.joinChannel(token, newChannelName, uid || 0, {
                channelProfile: ChannelProfileType.ChannelProfileCommunication,
                clientRoleType: ClientRoleType.ClientRoleBroadcaster,
                publishMicrophoneTrack: true,
                autoSubscribeAudio: true,
                autoSubscribeVideo: false,
            });

            console.log('📞 Llamada iniciada en canal:', newChannelName);

        } catch (error) {
            console.error('Error iniciando llamada:', error);
            if (InCallManager) InCallManager.stop();
            Alert.alert('Error', 'No se pudo iniciar la llamada');
        }
    }, [user, engine.current]);

    const joinCall = useCallback(async (channel: string) => {
        if (Platform.OS === 'web') return;
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

            // ✅ Iniciar InCallManager para manejar la sesión de audio
            if (InCallManager) {
                InCallManager.start({ media: 'audio' });
                InCallManager.setForceSpeakerphoneOn(false);
                console.log('🔊 InCallManager iniciado (join)');
            }

            // Configurar el audio de Agora
            engine.current.enableAudio();
            engine.current.setDefaultAudioRouteToSpeakerphone(false);
            engine.current.muteLocalAudioStream(false);

            // Ajustar volumen
            engine.current.adjustRecordingSignalVolume(400);
            engine.current.adjustPlaybackSignalVolume(400);

            console.log('📞 Uniéndose al canal (join):', channel);
            console.log('📞 Con token:', token.substring(0, 20) + '...');

            // Unirse al canal con UID 0 (auto-asignado)
            engine.current.joinChannel(token, channel, 0, {
                channelProfile: ChannelProfileType.ChannelProfileCommunication,
                clientRoleType: ClientRoleType.ClientRoleBroadcaster,
                publishMicrophoneTrack: true,
                autoSubscribeAudio: true,
                autoSubscribeVideo: false,
            });

        } catch (error) {
            console.error('Error uniéndose a llamada:', error);
            if (InCallManager) InCallManager.stop();
            Alert.alert('Error', 'No se pudo unir a la llamada');
        }
    }, [user, engine.current]);

    const endCall = useCallback(async () => {
        if (engine.current) {
            engine.current.leaveChannel();
            setChannelName(null);
            setRemoteUsers([]);
            setCallDuration(0);

            // ✅ Detener InCallManager al terminar la llamada
            if (InCallManager) {
                InCallManager.stop();
                console.log('🔇 InCallManager detenido');
            }
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
