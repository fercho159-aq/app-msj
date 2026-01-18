import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { pushNotificationService } from '../services/pushNotificationService';

interface User {
    id: string;
    odmaUserId: string;
    socketId: string;
    name: string;
}

// Tipos simplificados para WebRTC (el servidor solo los pasa, no los procesa)
interface SDPData {
    type: string;
    sdp?: string;
}

interface ICECandidate {
    candidate?: string;
    sdpMid?: string | null;
    sdpMLineIndex?: number | null;
}

interface CallData {
    to: string;
    from: string;
    fromName: string;
    offer?: SDPData;
    answer?: SDPData;
    candidate?: ICECandidate;
    callType: 'audio' | 'video';
    agoraChannel?: string; // Canal de Agora para la llamada
}

// Almacena usuarios conectados
const connectedUsers = new Map<string, User>();

export function initializeWebSocket(httpServer: HttpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        },
        transports: ['websocket', 'polling']
    });

    io.on('connection', (socket: Socket) => {
        console.log(`🔌 Usuario conectado: ${socket.id}`);

        // Registro de usuario
        socket.on('register', (data: { userId: string; name: string }) => {
            const user: User = {
                id: data.userId,
                odmaUserId: data.userId,
                socketId: socket.id,
                name: data.name
            };
            connectedUsers.set(data.userId, user);
            console.log(`✅ Usuario registrado: ${data.name} (${data.userId})`);

            // Notificar a todos los usuarios conectados
            io.emit('user-online', { userId: data.userId, name: data.name });

            // Enviar lista de usuarios en línea
            socket.emit('online-users', Array.from(connectedUsers.values()).map(u => ({
                userId: u.odmaUserId,
                name: u.name
            })));
        });

        // Iniciar llamada
        socket.on('call-user', async (data: CallData) => {
            console.log(`📞 Llamada de ${data.from} a ${data.to}`);
            const targetUser = connectedUsers.get(data.to);

            if (targetUser) {
                // Usuario está en línea, enviar via socket
                io.to(targetUser.socketId).emit('incoming-call', {
                    from: data.from,
                    fromName: data.fromName,
                    offer: data.offer,
                    callType: data.callType,
                    agoraChannel: data.agoraChannel // Pasar el canal de Agora
                });
            } else {
                // Usuario NO está en línea, enviar notificación push
                console.log(`📲 Usuario ${data.to} no está en línea, enviando notificación push`);
                const pushSent = await pushNotificationService.sendCallNotification(
                    data.to,
                    data.fromName,
                    data.callType,
                    data.from
                );

                if (!pushSent) {
                    socket.emit('call-error', {
                        message: 'Usuario no disponible',
                        userId: data.to
                    });
                }
            }
        });

        // Responder llamada
        socket.on('answer-call', (data: CallData) => {
            console.log(`✅ Llamada respondida por ${data.from}`);
            const targetUser = connectedUsers.get(data.to);

            if (targetUser) {
                io.to(targetUser.socketId).emit('call-answered', {
                    from: data.from,
                    answer: data.answer
                });
            }
        });

        // Rechazar llamada
        socket.on('reject-call', (data: { to: string; from: string; reason?: string }) => {
            console.log(`❌ Llamada rechazada`);
            const targetUser = connectedUsers.get(data.to);

            if (targetUser) {
                io.to(targetUser.socketId).emit('call-rejected', {
                    from: data.from,
                    reason: data.reason || 'Llamada rechazada'
                });
            }
        });

        // Terminar llamada
        socket.on('end-call', (data: { to: string; from: string }) => {
            console.log(`📴 Llamada terminada`);
            const targetUser = connectedUsers.get(data.to);

            if (targetUser) {
                io.to(targetUser.socketId).emit('call-ended', {
                    from: data.from
                });
            }
        });

        // ICE Candidates (para establecer conexión P2P)
        socket.on('ice-candidate', (data: CallData) => {
            const targetUser = connectedUsers.get(data.to);

            if (targetUser) {
                io.to(targetUser.socketId).emit('ice-candidate', {
                    from: data.from,
                    candidate: data.candidate
                });
            }
        });

        // Desconexión
        socket.on('disconnect', () => {
            // Encontrar y eliminar usuario
            for (const [userId, user] of connectedUsers.entries()) {
                if (user.socketId === socket.id) {
                    connectedUsers.delete(userId);
                    io.emit('user-offline', { userId });
                    console.log(`👋 Usuario desconectado: ${user.name}`);
                    break;
                }
            }
        });
    });

    console.log('🌐 WebSocket de señalización inicializado');
    return io;
}

export { connectedUsers };
