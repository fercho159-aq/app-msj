import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { Alert, Vibration, Platform } from 'react-native';
import { socketService, IncomingCallData } from '../services/socketService';
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
    isWaitingOffline: boolean; // Caller está esperando a que callee offline conteste
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
    offer?: RTCSessionDescriptionInit;
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
    isWaitingOffline: false,
};

const CALL_TIMEOUT_MS = 60000; // 60 seconds
const HEARTBEAT_INTERVAL_MS = 10000; // 10 seconds

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const webrtc = useWebRTC();

    const [isConnected, setIsConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const [callState, setCallState] = useState<CallState>(initialCallState);
    const [pendingCall, setPendingCall] = useState<PendingCall | null>(null);
    const [callTimer, setCallTimer] = useState<NodeJS.Timeout | null>(null);
    const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
    const callStartTimeRef = useRef<number | null>(null);

    // Limpiar timers de timeout y heartbeat
    const cleanupCallTimers = useCallback(() => {
        if (callTimeoutRef.current) {
            clearTimeout(callTimeoutRef.current);
            callTimeoutRef.current = null;
        }
        if (heartbeatRef.current) {
            clearInterval(heartbeatRef.current);
            heartbeatRef.current = null;
        }
    }, []);

    // Conectar al servidor Socket.io
    const connect = useCallback(async () => {
        if (!user) return;

        try {
            console.log('[CallContext] Conectando a Socket.io...');
            await socketService.connect(user.id, user.name || user.rfc);
            setIsConnected(true);
            console.log('[CallContext] Conectado a Socket.io');

            // Verificar llamadas pendientes al conectarse
            socketService.checkPendingCalls();
        } catch (error) {
            console.error('[CallContext] Error conectando a Socket.io:', error);
            setIsConnected(false);
        }
    }, [user]);

    // Desconectar
    const disconnect = useCallback(() => {
        socketService.disconnect();
        webrtc.cleanup();
        setIsConnected(false);
        setOnlineUsers([]);
        setCallState(initialCallState);
        setPendingCall(null);
        cleanupCallTimers();

        if (callTimer) {
            clearInterval(callTimer);
            setCallTimer(null);
        }
    }, [webrtc, callTimer, cleanupCallTimers]);

    // Iniciar llamada
    const startCall = useCallback(async (userId: string, userName: string, callType: 'audio' | 'video') => {
        console.log(`[CallContext] Iniciando llamada ${callType} a ${userName}`);

        // Verificar y reconectar socket si es necesario
        if (!socketService.isConnected()) {
            console.log('[CallContext] Socket no conectado, intentando reconectar...');
            if (user) {
                try {
                    await socketService.connect(user.id, user.name || user.rfc);
                    setIsConnected(true);
                    console.log('[CallContext] Reconectado exitosamente');
                } catch (error) {
                    console.error('[CallContext] Error reconectando:', error);
                    Alert.alert('Error', 'No se pudo conectar al servidor de llamadas. Verifica tu conexión.');
                    return;
                }
            } else {
                Alert.alert('Error', 'No hay sesión activa');
                return;
            }
        }

        // Actualizar estado
        setCallState({
            isInCall: false,
            isRinging: true,
            isConnecting: true,
            callType,
            remoteUser: { id: userId, name: userName },
            callDirection: 'outgoing',
            callDuration: 0,
            roomName: null,
            isWaitingOffline: false,
        });

        try {
            console.log('[CallContext] Paso 1: Inicializando media...');
            // Inicializar media local
            const stream = await webrtc.initializeMedia(callType === 'video');
            if (!stream) {
                console.error('[CallContext] Error: No se obtuvo stream de media');
                throw new Error('No se pudo obtener acceso al micrófono/cámara');
            }

            console.log('[CallContext] Paso 2: Creando oferta SDP...');
            // Crear oferta SDP
            const offer = await webrtc.createOffer(userId);
            if (!offer) {
                console.error('[CallContext] Error: No se pudo crear oferta SDP');
                throw new Error('No se pudo crear la oferta');
            }

            console.log('[CallContext] Paso 3: Enviando llamada via Socket.io a:', userId);
            // Enviar llamada via Socket.io
            const callSent = socketService.callUser(userId, offer, callType);

            if (!callSent) {
                throw new Error('No se pudo enviar la llamada. Verifica tu conexión.');
            }

            // Iniciar timeout de 60 segundos
            callTimeoutRef.current = setTimeout(() => {
                console.log('[CallContext] Timeout de llamada alcanzado');
                setCallState(prev => {
                    if (prev.isRinging && prev.callDirection === 'outgoing') {
                        // Limpiar WebRTC
                        webrtc.cleanup();
                        cleanupCallTimers();

                        Alert.alert('No contestó', `${userName} no contestó la llamada`, [
                            { text: 'OK' },
                            {
                                text: 'Reintentar',
                                onPress: () => startCall(userId, userName, callType),
                            },
                        ]);

                        return initialCallState;
                    }
                    return prev;
                });
            }, CALL_TIMEOUT_MS);

            // Iniciar heartbeat cada 10s
            heartbeatRef.current = setInterval(() => {
                socketService.sendCallStillWaiting(userId);
            }, HEARTBEAT_INTERVAL_MS);

            console.log('[CallContext] Llamada enviada, esperando respuesta...');
        } catch (error: any) {
            console.error('[CallContext] Error iniciando llamada:', error?.message || error);
            Alert.alert('Error', `No se pudo iniciar la llamada: ${error?.message || 'Error desconocido'}`);
            setCallState(initialCallState);
            webrtc.cleanup();
            cleanupCallTimers();
        }
    }, [user, webrtc, cleanupCallTimers]);

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

        const { from, fromName, callType, offer } = pendingCall;

        try {
            // Inicializar media local
            const stream = await webrtc.initializeMedia(callType === 'video');
            if (!stream) {
                throw new Error('No se pudo obtener acceso al micrófono/cámara');
            }

            // Procesar la oferta y crear respuesta
            if (offer) {
                const answer = await webrtc.handleOffer(from, offer);
                if (answer) {
                    // Enviar respuesta via Socket.io
                    socketService.answerCall(from, answer);
                }
            }

            // Actualizar estado
            callStartTimeRef.current = Date.now();
            setCallState(prev => ({
                ...prev,
                isRinging: false,
                isInCall: true,
                isConnecting: false,
                isWaitingOffline: false,
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
            // Enviar rechazo via Socket.io
            socketService.rejectCall(pendingCall.from, 'Llamada rechazada');
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

        // Calcular duración
        const duration = callStartTimeRef.current
            ? Math.floor((Date.now() - callStartTimeRef.current) / 1000)
            : 0;
        callStartTimeRef.current = null;

        // Enviar fin de llamada via Socket.io
        if (callState.remoteUser) {
            socketService.endCall(callState.remoteUser.id, duration);
        }

        // Limpiar WebRTC
        webrtc.endCall();

        // Limpiar timers
        cleanupCallTimers();
        if (callTimer) {
            clearInterval(callTimer);
            setCallTimer(null);
        }

        setCallState(initialCallState);
        setPendingCall(null);
    }, [callState.remoteUser, webrtc, callTimer, cleanupCallTimers]);

    // Configurar listeners de Socket.io
    useEffect(() => {
        // Conexión establecida
        const handleConnected = () => {
            console.log('[CallContext] Socket.io conectado');
            setIsConnected(true);
            // Verificar llamadas pendientes al reconectar
            socketService.checkPendingCalls();
        };

        // Desconexión
        const handleDisconnected = () => {
            console.log('[CallContext] Socket.io desconectado');
            setIsConnected(false);
        };

        // Lista de usuarios en línea
        const handleOnlineUsers = (users: { userId: string; name: string }[]) => {
            const mapped = users
                .filter(u => u.userId !== user?.id)
                .map(u => ({
                    id: u.userId,
                    name: u.name,
                }));
            setOnlineUsers(mapped);
        };

        // Usuario se conectó
        const handleUserOnline = (data: { userId: string; name: string }) => {
            if (data.userId !== user?.id) {
                setOnlineUsers(prev => {
                    const exists = prev.some(u => u.id === data.userId);
                    if (exists) return prev;
                    return [...prev, { id: data.userId, name: data.name }];
                });
            }
        };

        // Usuario se desconectó
        const handleUserOffline = (userId: string) => {
            setOnlineUsers(prev => prev.filter(u => u.id !== userId));

            // Si era nuestro interlocutor y estábamos en llamada activa, terminar
            if (callState.remoteUser?.id === userId && callState.isInCall) {
                endCall();
            }
        };

        // Llamada entrante (usuario online recibe esto directamente)
        const handleIncomingCall = (data: IncomingCallData) => {
            console.log('[CallContext] Llamada entrante de:', data.fromName);

            // Vibrar
            if (Platform.OS !== 'web') {
                Vibration.vibrate([0, 300, 200, 300, 200, 300], true);
            }

            // Guardar llamada pendiente
            setPendingCall({
                from: data.from,
                fromName: data.fromName,
                callType: data.callType,
                offer: data.offer,
            });

            // Actualizar estado
            setCallState({
                isInCall: false,
                isRinging: true,
                isConnecting: false,
                callType: data.callType,
                remoteUser: { id: data.from, name: data.fromName },
                callDirection: 'incoming',
                callDuration: 0,
                roomName: null,
                isWaitingOffline: false,
            });
        };

        // Llamada pendiente (callee recibe esto al reconectarse después de push)
        const handlePendingCall = (data: IncomingCallData) => {
            console.log('[CallContext] Llamada pendiente recibida de:', data.fromName);

            // Vibrar
            if (Platform.OS !== 'web') {
                Vibration.vibrate([0, 300, 200, 300, 200, 300], true);
            }

            // Guardar llamada pendiente
            setPendingCall({
                from: data.from,
                fromName: data.fromName,
                callType: data.callType,
                offer: data.offer,
            });

            // Actualizar estado
            setCallState({
                isInCall: false,
                isRinging: true,
                isConnecting: false,
                callType: data.callType,
                remoteUser: { id: data.from, name: data.fromName },
                callDirection: 'incoming',
                callDuration: 0,
                roomName: null,
                isWaitingOffline: false,
            });
        };

        // Llamada respondida
        const handleCallAnswered = async (data: { from: string; answer: RTCSessionDescriptionInit }) => {
            console.log('[CallContext] Llamada respondida por:', data.from);

            // Limpiar timers de espera
            cleanupCallTimers();

            // Procesar la respuesta
            await webrtc.handleAnswer(data.answer);

            // Actualizar estado
            callStartTimeRef.current = Date.now();
            setCallState(prev => ({
                ...prev,
                isRinging: false,
                isInCall: true,
                isConnecting: false,
                isWaitingOffline: false,
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

        // Llamada rechazada
        const handleCallRejected = (data: { from: string; reason: string }) => {
            console.log('[CallContext] Llamada rechazada:', data.reason);

            // Detener vibración
            if (Platform.OS !== 'web') {
                Vibration.cancel();
            }

            // Limpiar WebRTC y timers
            webrtc.cleanup();
            cleanupCallTimers();

            Alert.alert('Llamada rechazada', data.reason || 'El usuario rechazó la llamada');

            setCallState(initialCallState);
            setPendingCall(null);
        };

        // Llamada terminada
        const handleCallEnded = () => {
            console.log('[CallContext] Llamada terminada por el otro usuario');

            // Detener vibración
            if (Platform.OS !== 'web') {
                Vibration.cancel();
            }

            // Limpiar WebRTC y timers
            webrtc.cleanup();
            cleanupCallTimers();

            // Limpiar timer de duración
            if (callTimer) {
                clearInterval(callTimer);
                setCallTimer(null);
            }

            callStartTimeRef.current = null;
            setCallState(initialCallState);
            setPendingCall(null);
        };

        // Timeout de llamada (caller recibe esto del servidor)
        const handleCallTimeout = (data: { userId: string; message: string }) => {
            console.log('[CallContext] Llamada expiró:', data.message);

            // Limpiar WebRTC y timers
            webrtc.cleanup();
            cleanupCallTimers();

            Alert.alert('No contestó', data.message || 'La llamada no fue contestada');

            setCallState(initialCallState);
            setPendingCall(null);
        };

        // Llamada sonando (pendiente para callee offline)
        const handleCallRinging = (data: { userId: string; message: string }) => {
            console.log('[CallContext] Llamada sonando (offline):', data.message);
            setCallState(prev => ({
                ...prev,
                isWaitingOffline: true,
            }));
        };

        // ICE Candidate
        const handleIceCandidate = async (data: { from: string; candidate: RTCIceCandidateInit }) => {
            if (data.candidate) {
                await webrtc.handleCandidate(data.candidate);
            }
        };

        // Error de llamada
        const handleCallError = (data: { message: string; userId: string }) => {
            console.error('[CallContext] Error de llamada:', data.message);
            Alert.alert('Error', data.message);
            setCallState(initialCallState);
            webrtc.cleanup();
            cleanupCallTimers();
        };

        // Registrar listeners
        socketService.on('connected', handleConnected);
        socketService.on('disconnected', handleDisconnected);
        socketService.on('online-users', handleOnlineUsers);
        socketService.on('user-online', handleUserOnline);
        socketService.on('user-offline', handleUserOffline);
        socketService.on('incoming-call', handleIncomingCall);
        socketService.on('pending-call', handlePendingCall);
        socketService.on('call-answered', handleCallAnswered);
        socketService.on('call-rejected', handleCallRejected);
        socketService.on('call-ended', handleCallEnded);
        socketService.on('call-timeout', handleCallTimeout);
        socketService.on('call-ringing', handleCallRinging);
        socketService.on('ice-candidate', handleIceCandidate);
        socketService.on('call-error', handleCallError);

        return () => {
            socketService.off('connected', handleConnected);
            socketService.off('disconnected', handleDisconnected);
            socketService.off('online-users', handleOnlineUsers);
            socketService.off('user-online', handleUserOnline);
            socketService.off('user-offline', handleUserOffline);
            socketService.off('incoming-call', handleIncomingCall);
            socketService.off('pending-call', handlePendingCall);
            socketService.off('call-answered', handleCallAnswered);
            socketService.off('call-rejected', handleCallRejected);
            socketService.off('call-ended', handleCallEnded);
            socketService.off('call-timeout', handleCallTimeout);
            socketService.off('call-ringing', handleCallRinging);
            socketService.off('ice-candidate', handleIceCandidate);
            socketService.off('call-error', handleCallError);
        };
    }, [user, webrtc, callState.remoteUser, callState.isInCall, callTimer, endCall, cleanupCallTimers]);

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
