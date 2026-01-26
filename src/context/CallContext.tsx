import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Alert, Vibration, Platform } from 'react-native';
import { spreedService } from '../services/spreedService';
import { useWebRTC } from './WebRTCContext';
import { useAuth } from './AuthContext';

interface CallState {
    isInCall: boolean;
    isRinging: boolean;
    isConnecting: boolean;
    callType: 'audio' | 'video' | null;
    remoteUser: { id: string; name: string } | null;
    callDirection: 'incoming' | 'outgoing' | null;
    callDuration: number;
    roomName: string | null;
}

export interface OnlineUser {
    id: string;
    name: string;
    status?: {
        displayName?: string;
    };
}

interface PendingCall {
    from: string;
    fromName: string;
    callType: 'audio' | 'video';
    sdp?: RTCSessionDescriptionInit;
    roomName?: string;
}

interface CallContextType {
    // Estado
    isConnected: boolean;
    onlineUsers: OnlineUser[];
    callState: CallState;

    // Acciones
    connect: () => Promise<void>;
    disconnect: () => void;
    startCall: (userId: string, userName: string, callType: 'audio' | 'video') => Promise<void>;
    acceptCall: () => Promise<void>;
    rejectCall: () => void;
    endCall: () => void;
}

const initialCallState: CallState = {
    isInCall: false,
    isRinging: false,
    isConnecting: false,
    callType: null,
    remoteUser: null,
    callDirection: null,
    callDuration: 0,
    roomName: null,
};

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const webrtc = useWebRTC();

    const [isConnected, setIsConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const [callState, setCallState] = useState<CallState>(initialCallState);
    const [pendingCall, setPendingCall] = useState<PendingCall | null>(null);
    const [callTimer, setCallTimer] = useState<NodeJS.Timeout | null>(null);

    // Conectar al servidor Spreed
    const connect = useCallback(async () => {
        if (!user) return;

        try {
            console.log('[CallContext] Conectando a Spreed...');
            await spreedService.connect(user.name || user.rfc);

            // Actualizar estado del usuario en Spreed
            spreedService.updateStatus(user.name || user.rfc);

            setIsConnected(true);
            console.log('[CallContext] Conectado a Spreed');
        } catch (error) {
            console.error('[CallContext] Error conectando a Spreed:', error);
            setIsConnected(false);
        }
    }, [user]);

    // Desconectar
    const disconnect = useCallback(() => {
        spreedService.disconnect();
        webrtc.cleanup();
        setIsConnected(false);
        setOnlineUsers([]);
        setCallState(initialCallState);
        setPendingCall(null);

        if (callTimer) {
            clearInterval(callTimer);
            setCallTimer(null);
        }
    }, [webrtc, callTimer]);

    // Iniciar llamada
    const startCall = useCallback(async (userId: string, userName: string, callType: 'audio' | 'video') => {
        console.log(`[CallContext] Iniciando llamada ${callType} a ${userName}`);

        // Generar nombre de sala único
        const [id1, id2] = [user?.id || '', userId].sort();
        const roomName = `call_${id1}_${id2}_${Date.now()}`;

        // Actualizar estado
        setCallState({
            isInCall: false,
            isRinging: true,
            isConnecting: true,
            callType,
            remoteUser: { id: userId, name: userName },
            callDirection: 'outgoing',
            callDuration: 0,
            roomName,
        });

        try {
            // Inicializar media local
            const stream = await webrtc.initializeMedia(callType === 'video');
            if (!stream) {
                throw new Error('No se pudo obtener acceso al micrófono/cámara');
            }

            // Unirse a la sala de Spreed
            spreedService.joinRoom(roomName);

            // Crear oferta SDP
            const offer = await webrtc.createOffer(userId);
            if (!offer) {
                throw new Error('No se pudo crear la oferta');
            }

            // Enviar oferta al usuario destino
            spreedService.sendOffer(userId, offer);

            console.log('[CallContext] Oferta enviada, esperando respuesta...');
        } catch (error) {
            console.error('[CallContext] Error iniciando llamada:', error);
            Alert.alert('Error', 'No se pudo iniciar la llamada');
            setCallState(initialCallState);
            webrtc.cleanup();
        }
    }, [user, webrtc]);

    // Aceptar llamada entrante
    const acceptCall = useCallback(async () => {
        console.log('[CallContext] Aceptando llamada');

        if (!pendingCall) {
            console.error('[CallContext] No hay llamada pendiente');
            return;
        }

        // Detener vibración
        if (Platform.OS !== 'web') {
            Vibration.cancel();
        }

        const { from, fromName, callType, sdp, roomName } = pendingCall;

        try {
            // Inicializar media local
            const stream = await webrtc.initializeMedia(callType === 'video');
            if (!stream) {
                throw new Error('No se pudo obtener acceso al micrófono/cámara');
            }

            // Unirse a la sala si hay nombre de sala
            if (roomName) {
                spreedService.joinRoom(roomName);
            }

            // Procesar la oferta y crear respuesta
            if (sdp) {
                const answer = await webrtc.handleOffer(from, sdp);
                if (answer) {
                    // Enviar respuesta
                    spreedService.sendAnswer(from, answer);
                }
            }

            // Actualizar estado
            setCallState(prev => ({
                ...prev,
                isRinging: false,
                isInCall: true,
                isConnecting: false,
            }));

            // Iniciar contador de duración
            const timer = setInterval(() => {
                setCallState(prev => ({
                    ...prev,
                    callDuration: prev.callDuration + 1,
                }));
            }, 1000);
            setCallTimer(timer);

            setPendingCall(null);
            console.log('[CallContext] Llamada aceptada');
        } catch (error) {
            console.error('[CallContext] Error aceptando llamada:', error);
            Alert.alert('Error', 'No se pudo aceptar la llamada');
            webrtc.cleanup();
            setCallState(initialCallState);
            setPendingCall(null);
        }
    }, [pendingCall, webrtc]);

    // Rechazar llamada
    const rejectCall = useCallback(() => {
        console.log('[CallContext] Rechazando llamada');

        // Detener vibración
        if (Platform.OS !== 'web') {
            Vibration.cancel();
        }

        if (pendingCall) {
            // Enviar Bye con razón "reject"
            spreedService.sendBye(pendingCall.from, 'reject');
        }

        setPendingCall(null);
        setCallState(initialCallState);
    }, [pendingCall]);

    // Terminar llamada
    const endCall = useCallback(() => {
        console.log('[CallContext] Terminando llamada');

        // Detener vibración
        if (Platform.OS !== 'web') {
            Vibration.cancel();
        }

        // Enviar Bye al usuario remoto
        if (callState.remoteUser) {
            spreedService.sendBye(callState.remoteUser.id);
        }

        // Limpiar WebRTC
        webrtc.endCall();

        // Salir de la sala
        spreedService.leaveRoom();

        // Limpiar timer
        if (callTimer) {
            clearInterval(callTimer);
            setCallTimer(null);
        }

        setCallState(initialCallState);
        setPendingCall(null);
    }, [callState.remoteUser, webrtc, callTimer]);

    // Configurar listeners de Spreed
    useEffect(() => {
        // Conexión establecida
        const handleConnected = () => {
            console.log('[CallContext] Spreed conectado');
            setIsConnected(true);
        };

        // Desconexión
        const handleDisconnected = () => {
            console.log('[CallContext] Spreed desconectado');
            setIsConnected(false);
        };

        // Lista de usuarios en la sala
        const handleUsers = (users: any[]) => {
            const mapped = users
                .filter(u => u.Id !== spreedService.userId)
                .map(u => ({
                    id: u.Id,
                    name: u.Status?.displayName || u.Id,
                    status: u.Status,
                }));
            setOnlineUsers(mapped);
        };

        // Usuario se unió
        const handleJoined = (data: { id: string; status?: { displayName?: string } }) => {
            if (data.id !== spreedService.userId) {
                setOnlineUsers(prev => {
                    const exists = prev.some(u => u.id === data.id);
                    if (exists) return prev;
                    return [...prev, {
                        id: data.id,
                        name: data.status?.displayName || data.id,
                        status: data.status,
                    }];
                });
            }
        };

        // Usuario se fue
        const handleLeft = (data: { id: string }) => {
            setOnlineUsers(prev => prev.filter(u => u.id !== data.id));

            // Si era nuestro interlocutor, terminar llamada
            if (callState.remoteUser?.id === data.id) {
                endCall();
            }
        };

        // Oferta recibida (llamada entrante)
        const handleOffer = (data: { from: string; sdp: string; type: string }) => {
            console.log('[CallContext] Oferta recibida de:', data.from);

            // Buscar nombre del usuario
            const caller = onlineUsers.find(u => u.id === data.from);
            const callerName = caller?.name || data.from;

            // Vibrar
            if (Platform.OS !== 'web') {
                Vibration.vibrate([0, 300, 200, 300, 200, 300], true);
            }

            // Guardar llamada pendiente
            setPendingCall({
                from: data.from,
                fromName: callerName,
                callType: 'audio', // Por defecto audio, podría detectarse del SDP
                sdp: { type: data.type as RTCSdpType, sdp: data.sdp },
                roomName: spreedService.roomName || undefined,
            });

            // Actualizar estado
            setCallState({
                isInCall: false,
                isRinging: true,
                isConnecting: false,
                callType: 'audio',
                remoteUser: { id: data.from, name: callerName },
                callDirection: 'incoming',
                callDuration: 0,
                roomName: spreedService.roomName,
            });
        };

        // Respuesta recibida (nuestro interlocutor aceptó)
        const handleAnswer = async (data: { from: string; sdp: string; type: string }) => {
            console.log('[CallContext] Respuesta recibida de:', data.from);

            // Procesar la respuesta
            await webrtc.handleAnswer({ type: data.type as RTCSdpType, sdp: data.sdp });

            // Actualizar estado
            setCallState(prev => ({
                ...prev,
                isRinging: false,
                isInCall: true,
                isConnecting: false,
            }));

            // Iniciar contador
            const timer = setInterval(() => {
                setCallState(prev => ({
                    ...prev,
                    callDuration: prev.callDuration + 1,
                }));
            }, 1000);
            setCallTimer(timer);
        };

        // Candidato ICE recibido
        const handleCandidate = async (data: {
            from: string;
            candidate: string;
            sdpMLineIndex: number;
            sdpMid: string;
        }) => {
            if (data.candidate) {
                await webrtc.handleCandidate({
                    candidate: data.candidate,
                    sdpMLineIndex: data.sdpMLineIndex,
                    sdpMid: data.sdpMid,
                });
            }
        };

        // Bye recibido (el otro terminó o rechazó)
        const handleBye = (data: { from: string; reason?: string }) => {
            console.log('[CallContext] Bye recibido de:', data.from, 'razón:', data.reason);

            // Detener vibración
            if (Platform.OS !== 'web') {
                Vibration.cancel();
            }

            // Limpiar WebRTC
            webrtc.cleanup();

            // Limpiar timer
            if (callTimer) {
                clearInterval(callTimer);
                setCallTimer(null);
            }

            // Mostrar mensaje según razón
            if (data.reason === 'reject') {
                Alert.alert('Llamada rechazada', 'El usuario rechazó la llamada');
            } else if (data.reason === 'busy') {
                Alert.alert('Usuario ocupado', 'El usuario está en otra llamada');
            }

            setCallState(initialCallState);
            setPendingCall(null);
        };

        // Error
        const handleError = (error: any) => {
            console.error('[CallContext] Error de Spreed:', error);
        };

        // Registrar listeners
        spreedService.on('connected', handleConnected);
        spreedService.on('disconnected', handleDisconnected);
        spreedService.on('users', handleUsers);
        spreedService.on('joined', handleJoined);
        spreedService.on('left', handleLeft);
        spreedService.on('offer', handleOffer);
        spreedService.on('answer', handleAnswer);
        spreedService.on('candidate', handleCandidate);
        spreedService.on('bye', handleBye);
        spreedService.on('error', handleError);

        return () => {
            spreedService.off('connected', handleConnected);
            spreedService.off('disconnected', handleDisconnected);
            spreedService.off('users', handleUsers);
            spreedService.off('joined', handleJoined);
            spreedService.off('left', handleLeft);
            spreedService.off('offer', handleOffer);
            spreedService.off('answer', handleAnswer);
            spreedService.off('candidate', handleCandidate);
            spreedService.off('bye', handleBye);
            spreedService.off('error', handleError);
        };
    }, [webrtc, callState.remoteUser, callTimer, onlineUsers, endCall]);

    // Conectar automáticamente cuando hay usuario
    useEffect(() => {
        if (user && !isConnected) {
            connect();
        }

        return () => {
            if (isConnected) {
                disconnect();
            }
        };
    }, [user]);

    // Sincronizar duración con WebRTC
    useEffect(() => {
        if (webrtc.callDuration !== callState.callDuration && webrtc.isInCall) {
            setCallState(prev => ({
                ...prev,
                callDuration: webrtc.callDuration,
            }));
        }
    }, [webrtc.callDuration, webrtc.isInCall]);

    return (
        <CallContext.Provider
            value={{
                isConnected,
                onlineUsers,
                callState,
                connect,
                disconnect,
                startCall,
                acceptCall,
                rejectCall,
                endCall,
            }}
        >
            {children}
        </CallContext.Provider>
    );
};

export const useCall = (): CallContextType => {
    const context = useContext(CallContext);
    if (!context) {
        throw new Error('useCall debe usarse dentro de CallProvider');
    }
    return context;
};
