import { io, Socket } from 'socket.io-client';
import EventEmitter from 'eventemitter3';

// URL del servidor - Ahora usando HTTPS
// URL del servidor
const SERVER_URL = process.env.EXPO_PUBLIC_API_URL 
    ? process.env.EXPO_PUBLIC_API_URL.replace('/api', '') 
    : 'https://appsoluciones.duckdns.org';

export interface OnlineUser {
    userId: string;
    name: string;
}

export interface IncomingCallData {
    from: string;
    fromName: string;
    callType: 'audio' | 'video';
    offer?: RTCSessionDescriptionInit;
    agoraChannel?: string; // Canal de Agora para la llamada
}

export interface CallAnsweredData {
    from: string;
    answer: RTCSessionDescriptionInit;
}

class SocketService extends EventEmitter {
    private socket: Socket | null = null;
    private currentUser: { id: string; name: string } | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    // Conectar al servidor
    connect(userId: string, userName: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.socket?.connected) {
                resolve();
                return;
            }

            this.currentUser = { id: userId, name: userName };

            this.socket = io(SERVER_URL, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: this.maxReconnectAttempts,
                reconnectionDelay: 1000,
            });

            this.socket.on('connect', () => {
                console.log('🔌 Conectado al servidor de señalización');
                this.reconnectAttempts = 0;
                this.socket?.emit('register', { userId, name: userName });
                this.emit('connected');
                resolve();
            });

            this.socket.on('disconnect', (reason) => {
                console.log('📴 Desconectado:', reason);
                this.emit('disconnected', reason);
            });

            this.socket.on('connect_error', (error) => {
                console.error('❌ Error de conexión:', error);
                this.reconnectAttempts++;
                if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    reject(new Error('No se pudo conectar al servidor'));
                }
                this.emit('error', error);
            });

            // Eventos de usuarios
            this.socket.on('online-users', (users: OnlineUser[]) => {
                this.emit('online-users', users);
            });

            this.socket.on('user-online', (user: OnlineUser) => {
                this.emit('user-online', user);
            });

            this.socket.on('user-offline', (data: { userId: string }) => {
                this.emit('user-offline', data.userId);
            });

            // Eventos de llamadas
            this.socket.on('incoming-call', (data: IncomingCallData) => {
                console.log('📞 Llamada entrante de:', data.fromName);
                this.emit('incoming-call', data);
            });

            this.socket.on('call-answered', (data: CallAnsweredData) => {
                console.log('✅ Llamada respondida');
                this.emit('call-answered', data);
            });

            this.socket.on('call-rejected', (data: { from: string; reason: string }) => {
                console.log('❌ Llamada rechazada:', data.reason);
                this.emit('call-rejected', data);
            });

            this.socket.on('call-ended', (data: { from: string }) => {
                console.log('📴 Llamada terminada');
                this.emit('call-ended', data);
            });

            this.socket.on('ice-candidate', (data: { from: string; candidate: RTCIceCandidateInit }) => {
                this.emit('ice-candidate', data);
            });

            this.socket.on('call-error', (data: { message: string; userId: string }) => {
                this.emit('call-error', data);
            });

            // Llamada pendiente (callee recibe esto al reconectarse)
            this.socket.on('pending-call', (data: IncomingCallData) => {
                console.log('📞 Llamada pendiente de:', data.fromName);
                this.emit('pending-call', data);
            });

            // Timeout de llamada (caller recibe esto cuando el callee no contesta)
            this.socket.on('call-timeout', (data: { userId: string; message: string }) => {
                console.log('⏰ Llamada expiró:', data.message);
                this.emit('call-timeout', data);
            });

            // Llamada sonando (caller recibe esto cuando callee está offline pero se creó pending call)
            this.socket.on('call-ringing', (data: { userId: string; message: string }) => {
                console.log('🔔 Llamada sonando (pendiente)');
                this.emit('call-ringing', data);
            });

            // Eventos de mensajería
            this.socket.on('new-message', (data: { chatId: string; message: any }) => {
                this.emit('new-message', data);
            });

            this.socket.on('messages-delivered', (data: { chatId: string; messageIds: string[] }) => {
                this.emit('messages-delivered', data);
            });

            this.socket.on('messages-read', (data: { chatId: string; messageIds: string[] }) => {
                this.emit('messages-read', data);
            });

            // Timeout de conexión
            setTimeout(() => {
                if (!this.socket?.connected) {
                    reject(new Error('Timeout de conexión'));
                }
            }, 10000);
        });
    }

    // Desconectar
    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.currentUser = null;
        this.removeAllListeners();
    }

    // Verificar si está conectado
    isConnected(): boolean {
        return this.socket?.connected ?? false;
    }

    // Obtener usuario actual
    getCurrentUser() {
        return this.currentUser;
    }

    // Iniciar llamada
    callUser(
        targetUserId: string,
        offer: RTCSessionDescriptionInit,
        callType: 'audio' | 'video',
        agoraChannel?: string
    ): boolean {
        console.log('[SocketService] callUser - socket:', !!this.socket, 'connected:', this.socket?.connected, 'currentUser:', !!this.currentUser);

        if (!this.socket) {
            console.error('[SocketService] No hay socket inicializado');
            return false;
        }

        if (!this.socket.connected) {
            console.error('[SocketService] Socket no está conectado');
            return false;
        }

        if (!this.currentUser) {
            console.error('[SocketService] No hay usuario registrado');
            return false;
        }

        console.log('[SocketService] Emitiendo call-user a:', targetUserId);
        this.socket.emit('call-user', {
            to: targetUserId,
            from: this.currentUser.id,
            fromName: this.currentUser.name,
            offer,
            callType,
            agoraChannel,
        });
        return true;
    }

    // Responder llamada
    answerCall(targetUserId: string, answer: RTCSessionDescriptionInit): void {
        console.log('📤 socketService.answerCall llamado');
        console.log('📤 Enviando respuesta a:', targetUserId);
        console.log('📤 Socket conectado:', this.socket?.connected);
        console.log('📤 Usuario actual:', this.currentUser);

        if (!this.socket || !this.currentUser) {
            console.log('❌ No se puede responder: socket o usuario no disponible');
            return;
        }

        const payload = {
            to: targetUserId,
            from: this.currentUser.id,
            answer,
        };
        console.log('📤 Payload:', JSON.stringify(payload));

        this.socket.emit('answer-call', payload);
        console.log('✅ answer-call emitido');
    }

    // Rechazar llamada
    rejectCall(targetUserId: string, reason: string = 'Llamada rechazada'): void {
        if (!this.socket || !this.currentUser) return;

        this.socket.emit('reject-call', {
            to: targetUserId,
            from: this.currentUser.id,
            reason,
        });
    }

    // Terminar llamada
    endCall(targetUserId: string, duration?: number): void {
        if (!this.socket || !this.currentUser) return;

        this.socket.emit('end-call', {
            to: targetUserId,
            from: this.currentUser.id,
            duration,
        });
    }

    // Verificar llamadas pendientes (callee emite esto al conectarse)
    checkPendingCalls(): void {
        if (!this.socket || !this.currentUser) return;
        this.socket.emit('check-pending-calls', { userId: this.currentUser.id });
    }

    // Heartbeat para indicar al servidor que el caller sigue esperando
    sendCallStillWaiting(targetUserId: string): void {
        if (!this.socket || !this.currentUser) return;
        this.socket.emit('call-still-waiting', { to: targetUserId });
    }

    // ===== MENSAJERÍA =====

    // Notificar nuevo mensaje enviado
    emitNewMessage(chatId: string, message: any): void {
        if (!this.socket || !this.currentUser) return;
        this.socket.emit('new-message', {
            chatId,
            message,
            senderId: this.currentUser.id,
        });
    }

    // Notificar que el usuario abrio un chat (marca como entregados)
    emitChatOpened(chatId: string): void {
        if (!this.socket || !this.currentUser) return;
        this.socket.emit('chat-opened', {
            chatId,
            userId: this.currentUser.id,
        });
    }

    // Notificar que el usuario leyo los mensajes del chat
    emitMessagesRead(chatId: string): void {
        if (!this.socket || !this.currentUser) return;
        this.socket.emit('messages-read', {
            chatId,
            userId: this.currentUser.id,
        });
    }

    // Enviar ICE candidate
    sendIceCandidate(targetUserId: string, candidate: RTCIceCandidateInit): void {
        if (!this.socket || !this.currentUser) return;

        this.socket.emit('ice-candidate', {
            to: targetUserId,
            from: this.currentUser.id,
            candidate,
        });
    }
}

// Singleton
export const socketService = new SocketService();
