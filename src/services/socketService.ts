import { io, Socket } from 'socket.io-client';
import { EventEmitter } from 'events';

// URL del servidor - cambiar para producción
const SERVER_URL = 'http://31.220.109.7:3000';

export interface OnlineUser {
    userId: string;
    name: string;
}

export interface IncomingCallData {
    from: string;
    fromName: string;
    callType: 'audio' | 'video';
    offer?: RTCSessionDescriptionInit;
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
        callType: 'audio' | 'video'
    ): void {
        if (!this.socket || !this.currentUser) {
            console.error('No conectado al servidor');
            return;
        }

        this.socket.emit('call-user', {
            to: targetUserId,
            from: this.currentUser.id,
            fromName: this.currentUser.name,
            offer,
            callType,
        });
    }

    // Responder llamada
    answerCall(targetUserId: string, answer: RTCSessionDescriptionInit): void {
        if (!this.socket || !this.currentUser) return;

        this.socket.emit('answer-call', {
            to: targetUserId,
            from: this.currentUser.id,
            answer,
        });
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
    endCall(targetUserId: string): void {
        if (!this.socket || !this.currentUser) return;

        this.socket.emit('end-call', {
            to: targetUserId,
            from: this.currentUser.id,
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
