import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './AuthContext';

// URL de la API
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://appsoluciones.duckdns.org/api';

// Intentar importar Stream SDK (puede fallar en Expo Go)
let StreamVideoClient: any = null;
let StreamVideo: any = null;
let streamAvailable = false;

try {
    const streamSdk = require('@stream-io/video-react-native-sdk');
    StreamVideoClient = streamSdk.StreamVideoClient;
    StreamVideo = streamSdk.StreamVideo;
    streamAvailable = true;
    console.log('✅ Stream SDK disponible');
} catch (error) {
    console.log('⚠️ Stream SDK no disponible (Expo Go). Las llamadas requieren un build nativo.');
    streamAvailable = false;
}

// Tipos
interface StreamCallContextType {
    client: any | null;
    currentCall: any | null;
    isConnected: boolean;
    isInCall: boolean;
    isMuted: boolean;
    isSpeakerOn: boolean;
    callDuration: number;
    isStreamAvailable: boolean;
    startAudioCall: (targetUserId: string, targetUserName: string) => Promise<void>;
    joinCall: (callId: string) => Promise<void>;
    endCall: () => Promise<void>;
    toggleMute: () => void;
    toggleSpeaker: () => void;
}

const StreamCallContext = createContext<StreamCallContextType | undefined>(undefined);

// API Key de Stream (solo la key pública, el secret está en el backend)
const STREAM_API_KEY = '5x8d9e6pwqjt';

interface StreamCallProviderProps {
    children: ReactNode;
}

export const StreamCallProvider: React.FC<StreamCallProviderProps> = ({ children }) => {
    const { user, isAuthenticated } = useAuth();
    const [client, setClient] = useState<any | null>(null);
    const [currentCall, setCurrentCall] = useState<any | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(false);
    const [callDuration, setCallDuration] = useState(0);

    const isInCall = !!currentCall;

    // Inicializar cliente de Stream cuando el usuario está autenticado
    useEffect(() => {
        if (!streamAvailable || !isAuthenticated || !user) {
            if (client) {
                try {
                    client.disconnectUser();
                } catch (e) { }
                setClient(null);
                setIsConnected(false);
            }
            return;
        }

        const initializeClient = async () => {
            try {
                // Obtener token del backend
                const response = await fetch(`${API_URL}/stream/token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user.id,
                        userName: user.name,
                    }),
                });

                if (!response.ok) {
                    throw new Error('Error obteniendo token de Stream');
                }

                const { token } = await response.json();

                // Crear usuario para Stream
                const streamUser = {
                    id: user.id,
                    name: user.name || undefined,
                    image: user.avatar_url || undefined,
                };

                // Crear cliente de Stream Video
                const videoClient = new StreamVideoClient({
                    apiKey: STREAM_API_KEY,
                    user: streamUser,
                    token,
                });

                setClient(videoClient);
                setIsConnected(true);
                console.log('✅ Stream Video conectado');
            } catch (error) {
                console.error('❌ Error inicializando Stream:', error);
                setIsConnected(false);
            }
        };

        initializeClient();

        return () => {
            if (client) {
                try {
                    client.disconnectUser();
                } catch (e) { }
            }
        };
    }, [isAuthenticated, user?.id]);

    // Timer para duración de llamada
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isInCall) {
            interval = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        } else {
            setCallDuration(0);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isInCall]);

    // Iniciar llamada de audio
    const startAudioCall = useCallback(async (targetUserId: string, targetUserName: string) => {
        if (!streamAvailable) {
            Alert.alert(
                'Función no disponible',
                'Las llamadas de audio requieren un build nativo de la app. No funcionan en Expo Go.',
                [{ text: 'OK' }]
            );
            return;
        }

        if (!client || !user) {
            Alert.alert('Error', 'No se pudo conectar al servicio de llamadas');
            return;
        }

        try {
            // Generar ID único para la llamada
            const callId = `audio_${user.id}_${targetUserId}_${Date.now()}`;

            // Crear la llamada
            const call = client.call('audio_room', callId);

            await call.getOrCreate({
                data: {
                    members: [
                        { user_id: user.id },
                        { user_id: targetUserId },
                    ],
                    custom: {
                        callerName: user.name,
                        targetName: targetUserName,
                        type: 'audio_only',
                    },
                },
            });

            // Unirse a la llamada (solo audio, sin video)
            await call.join({
                create: true,
            });

            // Deshabilitar cámara, mantener solo audio
            await call.camera.disable();
            await call.microphone.enable();

            setCurrentCall(call);
            console.log('📞 Llamada de audio iniciada:', callId);
        } catch (error) {
            console.error('❌ Error iniciando llamada:', error);
            Alert.alert('Error', 'No se pudo iniciar la llamada');
        }
    }, [client, user]);

    // Unirse a una llamada existente
    const joinCall = useCallback(async (callId: string) => {
        if (!streamAvailable || !client) {
            Alert.alert('Error', 'El servicio de llamadas no está disponible');
            return;
        }

        try {
            const call = client.call('audio_room', callId);

            await call.join();

            // Solo audio
            await call.camera.disable();
            await call.microphone.enable();

            setCurrentCall(call);
            console.log('📞 Unido a llamada:', callId);
        } catch (error) {
            console.error('❌ Error uniéndose a llamada:', error);
        }
    }, [client]);

    // Terminar llamada
    const endCall = useCallback(async () => {
        if (!currentCall) return;

        try {
            await currentCall.leave();
            setCurrentCall(null);
            setIsMuted(false);
            setIsSpeakerOn(false);
            console.log('📞 Llamada terminada');
        } catch (error) {
            console.error('❌ Error terminando llamada:', error);
        }
    }, [currentCall]);

    // Toggle mute
    const toggleMute = useCallback(() => {
        if (!currentCall) return;

        if (isMuted) {
            currentCall.microphone.enable();
        } else {
            currentCall.microphone.disable();
        }
        setIsMuted(!isMuted);
    }, [currentCall, isMuted]);

    // Toggle speaker
    const toggleSpeaker = useCallback(() => {
        setIsSpeakerOn(!isSpeakerOn);
    }, [isSpeakerOn]);

    const value: StreamCallContextType = {
        client,
        currentCall,
        isConnected,
        isInCall,
        isMuted,
        isSpeakerOn,
        callDuration,
        isStreamAvailable: streamAvailable,
        startAudioCall,
        joinCall,
        endCall,
        toggleMute,
        toggleSpeaker,
    };

    // Si hay un cliente de Stream, envolver con el provider de Stream
    if (streamAvailable && client && StreamVideo) {
        return (
            <StreamCallContext.Provider value={value}>
                <StreamVideo client={client}>
                    {children}
                </StreamVideo>
            </StreamCallContext.Provider>
        );
    }

    return (
        <StreamCallContext.Provider value={value}>
            {children}
        </StreamCallContext.Provider>
    );
};

// Hook para usar el contexto
export const useStreamCall = (): StreamCallContextType => {
    const context = useContext(StreamCallContext);
    if (!context) {
        throw new Error('useStreamCall debe usarse dentro de StreamCallProvider');
    }
    return context;
};

export default StreamCallProvider;
