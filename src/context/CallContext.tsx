import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Alert, Vibration, Platform } from 'react-native';
import { socketService, OnlineUser, IncomingCallData } from '../services/socketService';
import { useAuth } from './AuthContext';

interface CallState {
    isInCall: boolean;
    isRinging: boolean;
    isConnecting: boolean;
    callType: 'audio' | 'video' | null;
    remoteUser: { id: string; name: string } | null;
    callDirection: 'incoming' | 'outgoing' | null;
    callDuration: number;
    agoraChannel: string | null; // Canal de Agora para la llamada
}

interface CallContextType {
    // Estado
    isConnected: boolean;
    onlineUsers: OnlineUser[];
    callState: CallState;

    // Acciones
    connect: () => Promise<void>;
    disconnect: () => void;
    startCall: (userId: string, userName: string, callType: 'audio' | 'video') => void;
    acceptCall: () => void;
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
    agoraChannel: null,
};

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const [callState, setCallState] = useState<CallState>(initialCallState);
    const [pendingCall, setPendingCall] = useState<IncomingCallData | null>(null);
    const [callTimer, setCallTimer] = useState<NodeJS.Timeout | null>(null);

    // Conectar al servidor cuando el usuario inicia sesión
    const connect = useCallback(async () => {
        if (!user) return;

        try {
            await socketService.connect(user.id, user.name || user.rfc);
            setIsConnected(true);
        } catch (error) {
            console.error('Error conectando al servidor:', error);
            setIsConnected(false);
        }
    }, [user]);

    // Desconectar
    const disconnect = useCallback(() => {
        socketService.disconnect();
        setIsConnected(false);
        setOnlineUsers([]);
        setCallState(initialCallState);
    }, []);

    // Iniciar llamada (simplificado - sin WebRTC real por ahora)
    const startCall = useCallback((userId: string, userName: string, callType: 'audio' | 'video') => {
        console.log(`📞 Iniciando llamada ${callType} a ${userName}`);

        // Generar nombre de canal de Agora - IDs ordenados para consistencia
        const [id1, id2] = [user?.id || '', userId].sort();
        const agoraChannel = `call_${id1}_${id2}`;

        console.log('📞 Canal de Agora generado:', agoraChannel);

        setCallState({
            isInCall: false,
            isRinging: true,
            isConnecting: true,
            callType,
            remoteUser: { id: userId, name: userName },
            callDirection: 'outgoing',
            callDuration: 0,
            agoraChannel,
        });

        // Simular oferta WebRTC (en producción usarías WebRTC real)
        const mockOffer: RTCSessionDescriptionInit = {
            type: 'offer',
            sdp: 'mock-sdp-offer'
        };

        // Enviar llamada con el canal de Agora
        socketService.callUser(userId, mockOffer, callType, agoraChannel);
    }, [user]);

    // Aceptar llamada
    const acceptCall = useCallback(() => {
        console.log('🔊 acceptCall llamado');
        console.log('📋 pendingCall:', pendingCall);
        console.log('📋 callState:', JSON.stringify(callState));

        if (!pendingCall) {
            console.log('❌ No hay pendingCall, saliendo');
            return;
        }

        console.log('✅ Aceptando llamada de:', pendingCall.from);

        // ¡IMPORTANTE! Detener la vibración al aceptar
        if (Platform.OS !== 'web') {
            console.log('🔕 Cancelando vibración...');
            Vibration.cancel();
        }

        // Guardar referencia antes de limpiar pendingCall
        const callerData = {
            from: pendingCall.from,
            fromName: pendingCall.fromName,
            callType: pendingCall.callType,
        };

        // Actualizar estado primero
        setCallState(prev => ({
            ...prev,
            isRinging: false,
            isInCall: true,
            isConnecting: false,
        }));

        // Simular respuesta WebRTC
        const mockAnswer: RTCSessionDescriptionInit = {
            type: 'answer',
            sdp: 'mock-sdp-answer'
        };

        console.log('📤 Enviando answer-call a:', callerData.from);
        socketService.answerCall(callerData.from, mockAnswer);

        // Limpiar pendingCall después de enviar respuesta
        setPendingCall(null);

        // Iniciar contador
        const timer = setInterval(() => {
            setCallState(prev => ({
                ...prev,
                callDuration: prev.callDuration + 1,
            }));
        }, 1000);
        setCallTimer(timer);

        console.log('✅ Llamada aceptada exitosamente');
    }, [pendingCall, callState]);

    // Rechazar llamada
    const rejectCall = useCallback(() => {
        // Detener vibración
        if (Platform.OS !== 'web') {
            Vibration.cancel();
        }

        if (pendingCall) {
            socketService.rejectCall(pendingCall.from);
        }

        setPendingCall(null);
        setCallState(initialCallState);
    }, [pendingCall]);

    // Terminar llamada
    const endCall = useCallback(() => {
        // Detener vibración por si acaso
        if (Platform.OS !== 'web') {
            Vibration.cancel();
        }

        if (callState.remoteUser) {
            socketService.endCall(callState.remoteUser.id);
        }

        if (callTimer) {
            clearInterval(callTimer);
            setCallTimer(null);
        }

        setCallState(initialCallState);
        setPendingCall(null);
    }, [callState.remoteUser, callTimer]);

    // Configurar listeners del socket
    useEffect(() => {
        if (!isConnected) return;

        const handleOnlineUsers = (users: OnlineUser[]) => {
            // Filtrar el usuario actual
            const filtered = users.filter(u => u.userId !== user?.id);
            setOnlineUsers(filtered);
        };

        const handleUserOnline = (newUser: OnlineUser) => {
            if (newUser.userId !== user?.id) {
                setOnlineUsers(prev => {
                    const exists = prev.some(u => u.userId === newUser.userId);
                    if (exists) return prev;
                    return [...prev, newUser];
                });
            }
        };

        const handleUserOffline = (userId: string) => {
            setOnlineUsers(prev => prev.filter(u => u.userId !== userId));
        };

        const handleIncomingCall = (data: IncomingCallData) => {
            console.log('📞 Llamada entrante:', data);
            console.log('📞 De:', data.fromName, '(', data.from, ')');
            console.log('📞 Tipo:', data.callType);
            console.log('📞 Canal de Agora:', data.agoraChannel);

            // Patrón de vibración menos agresivo: vibrar 300ms, pausa 200ms, repetir
            if (Platform.OS !== 'web') {
                console.log('📳 Iniciando vibración...');
                Vibration.vibrate([0, 300, 200, 300, 200, 300], true);
            }

            setPendingCall(data);
            setCallState({
                isInCall: false,
                isRinging: true,
                isConnecting: false,
                callType: data.callType,
                remoteUser: { id: data.from, name: data.fromName },
                callDirection: 'incoming',
                callDuration: 0,
                agoraChannel: data.agoraChannel || null, // Guardar el canal de Agora
            });
            console.log('📋 Estado actualizado para llamada entrante');
        };

        const handleCallAnswered = () => {
            console.log('✅ Llamada respondida');

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

        const handleCallRejected = (data: { reason: string }) => {
            if (Platform.OS !== 'web') {
                Vibration.cancel();
            }

            Alert.alert('Llamada rechazada', data.reason);
            setCallState(initialCallState);
        };

        const handleCallEnded = () => {
            if (Platform.OS !== 'web') {
                Vibration.cancel();
            }

            if (callTimer) {
                clearInterval(callTimer);
                setCallTimer(null);
            }

            setCallState(initialCallState);
            setPendingCall(null);
        };

        const handleCallError = (data: { message: string }) => {
            Alert.alert('Error', data.message);
            setCallState(initialCallState);
        };

        socketService.on('online-users', handleOnlineUsers);
        socketService.on('user-online', handleUserOnline);
        socketService.on('user-offline', handleUserOffline);
        socketService.on('incoming-call', handleIncomingCall);
        socketService.on('call-answered', handleCallAnswered);
        socketService.on('call-rejected', handleCallRejected);
        socketService.on('call-ended', handleCallEnded);
        socketService.on('call-error', handleCallError);

        return () => {
            socketService.off('online-users', handleOnlineUsers);
            socketService.off('user-online', handleUserOnline);
            socketService.off('user-offline', handleUserOffline);
            socketService.off('incoming-call', handleIncomingCall);
            socketService.off('call-answered', handleCallAnswered);
            socketService.off('call-rejected', handleCallRejected);
            socketService.off('call-ended', handleCallEnded);
            socketService.off('call-error', handleCallError);
        };
    }, [isConnected, user, callTimer]);

    // Conectar automáticamente cuando hay usuario
    useEffect(() => {
        if (user && !isConnected) {
            connect();
        }

        return () => {
            disconnect();
        };
    }, [user]);

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
