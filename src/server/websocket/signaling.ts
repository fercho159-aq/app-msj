import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { pushNotificationService } from '../services/pushNotificationService';
import { query } from '../../database/config';

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
    agoraChannel?: string;
}

interface PendingCall {
    id: string;
    callerId: string;
    callerName: string;
    calleeId: string;
    callType: 'audio' | 'video';
    offer?: SDPData;
    createdAt: number;
    status: 'ringing' | 'answered' | 'missed' | 'rejected';
    timeoutTimer?: ReturnType<typeof setTimeout>;
}

// Almacena usuarios conectados
const connectedUsers = new Map<string, User>();

// Almacena llamadas pendientes (key: calleeId)
const pendingCalls = new Map<string, PendingCall>();

const CALL_TIMEOUT_MS = 60000; // 60 segundos

// Guardar en historial de llamadas
async function saveCallHistory(
    callerId: string,
    calleeId: string,
    callType: string,
    status: string,
    durationSeconds: number = 0,
    startedAt?: Date
) {
    try {
        await query(
            `INSERT INTO call_history (caller_id, callee_id, call_type, status, duration_seconds, started_at, ended_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
            [callerId, calleeId, callType, status, durationSeconds, startedAt || new Date()]
        );
    } catch (error) {
        console.error('Error guardando historial de llamada:', error);
    }
}

function cleanupPendingCall(calleeId: string) {
    const pending = pendingCalls.get(calleeId);
    if (pending?.timeoutTimer) {
        clearTimeout(pending.timeoutTimer);
    }
    pendingCalls.delete(calleeId);
}

export function initializeWebSocket(httpServer: HttpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        },
        transports: ['websocket', 'polling']
    });

    io.on('connection', (socket: Socket) => {
        console.log(`Usuario conectado: ${socket.id}`);

        // Registro de usuario
        socket.on('register', (data: { userId: string; name: string }) => {
            const user: User = {
                id: data.userId,
                odmaUserId: data.userId,
                socketId: socket.id,
                name: data.name
            };
            connectedUsers.set(data.userId, user);
            console.log(`Usuario registrado: ${data.name} (${data.userId})`);

            // Notificar a todos los usuarios conectados
            io.emit('user-online', { userId: data.userId, name: data.name });

            // Enviar lista de usuarios en línea
            socket.emit('online-users', Array.from(connectedUsers.values()).map(u => ({
                userId: u.odmaUserId,
                name: u.name
            })));
        });

        // Verificar llamadas pendientes (callee emite esto al conectarse)
        socket.on('check-pending-calls', (data: { userId: string }) => {
            const pending = pendingCalls.get(data.userId);
            if (pending && pending.status === 'ringing') {
                // Verificar que el caller sigue conectado
                const caller = connectedUsers.get(pending.callerId);
                if (caller) {
                    console.log(`Enviando llamada pendiente a ${data.userId} de ${pending.callerName}`);
                    socket.emit('pending-call', {
                        from: pending.callerId,
                        fromName: pending.callerName,
                        callType: pending.callType,
                        offer: pending.offer,
                    });
                } else {
                    // Caller ya no está, limpiar
                    pending.status = 'missed';
                    saveCallHistory(pending.callerId, pending.calleeId, pending.callType, 'missed', 0, new Date(pending.createdAt));
                    pushNotificationService.sendMissedCallNotification(
                        pending.calleeId, pending.callerName, pending.callType, pending.callerId
                    );
                    cleanupPendingCall(data.userId);
                }
            }
        });

        // Heartbeat del caller para confirmar que sigue esperando
        socket.on('call-still-waiting', (data: { to: string }) => {
            // No-op, la presencia del caller en connectedUsers es suficiente
            // Este evento sirve para que el servidor sepa que el caller sigue activo
        });

        // Iniciar llamada
        socket.on('call-user', async (data: CallData) => {
            console.log(`Llamada de ${data.from} a ${data.to}`);
            const targetUser = connectedUsers.get(data.to);

            if (targetUser) {
                // Usuario está en línea, enviar via socket
                io.to(targetUser.socketId).emit('incoming-call', {
                    from: data.from,
                    fromName: data.fromName,
                    offer: data.offer,
                    callType: data.callType,
                    agoraChannel: data.agoraChannel
                });
            } else {
                // Usuario NO está en línea - crear llamada pendiente
                console.log(`Usuario ${data.to} no está en línea, creando llamada pendiente`);

                // Limpiar llamada pendiente anterior si existe
                cleanupPendingCall(data.to);

                const pendingCall: PendingCall = {
                    id: `${data.from}-${data.to}-${Date.now()}`,
                    callerId: data.from,
                    callerName: data.fromName,
                    calleeId: data.to,
                    callType: data.callType,
                    offer: data.offer,
                    createdAt: Date.now(),
                    status: 'ringing',
                };

                // Timeout de 60 segundos
                pendingCall.timeoutTimer = setTimeout(async () => {
                    const call = pendingCalls.get(data.to);
                    if (call && call.status === 'ringing') {
                        call.status = 'missed';

                        // Notificar al caller que la llamada expiró
                        const callerUser = connectedUsers.get(data.from);
                        if (callerUser) {
                            io.to(callerUser.socketId).emit('call-timeout', {
                                userId: data.to,
                                message: 'No contestó'
                            });
                        }

                        // Guardar como llamada perdida
                        await saveCallHistory(data.from, data.to, data.callType, 'missed', 0, new Date(call.createdAt));

                        // Enviar notificación de llamada perdida
                        await pushNotificationService.sendMissedCallNotification(
                            data.to, data.fromName, data.callType, data.from
                        );

                        cleanupPendingCall(data.to);
                    }
                }, CALL_TIMEOUT_MS);

                pendingCalls.set(data.to, pendingCall);

                // Enviar push notification
                const pushSent = await pushNotificationService.sendCallNotification(
                    data.to,
                    data.fromName,
                    data.callType,
                    data.from
                );

                if (!pushSent) {
                    // Push falló pero la llamada pendiente sigue activa
                    // El callee podría abrir la app manualmente
                    console.log(`Push notification falló para ${data.to}, llamada pendiente sigue activa`);
                }

                // Notificar al caller que está sonando (no error)
                socket.emit('call-ringing', {
                    userId: data.to,
                    message: 'Llamando...'
                });
            }
        });

        // Responder llamada
        socket.on('answer-call', (data: CallData) => {
            console.log(`Llamada respondida por ${data.from}`);

            // Limpiar llamada pendiente si existe
            const pending = pendingCalls.get(data.from);
            if (pending) {
                pending.status = 'answered';
                cleanupPendingCall(data.from);
            }

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
            console.log(`Llamada rechazada`);

            // Limpiar llamada pendiente si existe
            const pending = pendingCalls.get(data.from);
            if (pending) {
                pending.status = 'rejected';
                saveCallHistory(pending.callerId, pending.calleeId, pending.callType, 'rejected', 0, new Date(pending.createdAt));
                cleanupPendingCall(data.from);
            }

            const targetUser = connectedUsers.get(data.to);
            if (targetUser) {
                io.to(targetUser.socketId).emit('call-rejected', {
                    from: data.from,
                    reason: data.reason || 'Llamada rechazada'
                });
            }
        });

        // Terminar llamada
        socket.on('end-call', (data: { to: string; from: string; duration?: number }) => {
            console.log(`Llamada terminada`);

            // Limpiar llamada pendiente si existe (caller canceló antes de que contesten)
            const pendingForTo = pendingCalls.get(data.to);
            if (pendingForTo && pendingForTo.callerId === data.from) {
                if (pendingForTo.status === 'ringing') {
                    pendingForTo.status = 'missed';
                    saveCallHistory(pendingForTo.callerId, pendingForTo.calleeId, pendingForTo.callType, 'cancelled', 0, new Date(pendingForTo.createdAt));
                }
                cleanupPendingCall(data.to);
            }

            // También verificar si el que termina es el callee
            const pendingForFrom = pendingCalls.get(data.from);
            if (pendingForFrom) {
                cleanupPendingCall(data.from);
            }

            // Si la llamada tenía duración (fue completada), guardar historial
            if (data.duration && data.duration > 0) {
                saveCallHistory(data.from, data.to, 'audio', 'completed', data.duration);
            }

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
                    console.log(`Usuario desconectado: ${user.name}`);

                    // Si este usuario era caller de alguna llamada pendiente, hacer timeout
                    for (const [calleeId, pending] of pendingCalls.entries()) {
                        if (pending.callerId === userId && pending.status === 'ringing') {
                            pending.status = 'missed';
                            saveCallHistory(pending.callerId, pending.calleeId, pending.callType, 'missed', 0, new Date(pending.createdAt));
                            pushNotificationService.sendMissedCallNotification(
                                pending.calleeId, pending.callerName, pending.callType, pending.callerId
                            );
                            cleanupPendingCall(calleeId);
                        }
                    }
                    break;
                }
            }
        });
    });

    console.log('WebSocket de señalización inicializado');
    return io;
}

export { connectedUsers };
