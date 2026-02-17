import { query, queryOne } from '../../database/config';

// Interfaz para el mensaje de notificación push
interface ExpoPushMessage {
    to: string;
    sound?: 'default' | null;
    title: string;
    body: string;
    data?: Record<string, any>;
    categoryId?: string;
    channelId?: string;
    priority?: 'default' | 'normal' | 'high';
    badge?: number;
}

interface ExpoPushTicket {
    status: 'ok' | 'error';
    id?: string;
    message?: string;
    details?: { error?: string };
}

class PushNotificationService {
    private readonly EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

    // Guardar push token de un usuario
    async savePushToken(userId: string, pushToken: string): Promise<boolean> {
        try {
            await query(
                `UPDATE users SET push_token = $1, updated_at = NOW() WHERE id = $2`,
                [pushToken, userId]
            );
            console.log(`✅ Push token guardado para usuario ${userId}`);
            return true;
        } catch (error) {
            console.error('❌ Error al guardar push token:', error);
            return false;
        }
    }

    // Obtener push token de un usuario
    async getPushToken(userId: string): Promise<string | null> {
        try {
            const result = await queryOne<{ push_token: string | null }>(
                `SELECT push_token FROM users WHERE id = $1`,
                [userId]
            );
            return result?.push_token || null;
        } catch (error) {
            console.error('❌ Error al obtener push token:', error);
            return null;
        }
    }

    // Enviar notificación de nuevo mensaje
    async sendMessageNotification(
        recipientUserId: string,
        senderName: string,
        messageText: string,
        chatId: string,
        senderId: string
    ): Promise<boolean> {
        const pushToken = await this.getPushToken(recipientUserId);

        if (!pushToken) {
            console.log(`⚠️ Usuario ${recipientUserId} no tiene push token registrado`);
            return false;
        }

        // Truncar mensaje si es muy largo
        const truncatedMessage = messageText.length > 100
            ? messageText.substring(0, 100) + '...'
            : messageText;

        const message: ExpoPushMessage = {
            to: pushToken,
            sound: 'default',
            title: senderName,
            body: truncatedMessage,
            data: {
                type: 'message',
                chatId,
                senderId,
                senderName,
            },
            channelId: 'messages',
            priority: 'high',
        };

        return this.sendNotification(message);
    }

    // Enviar notificación de llamada entrante
    async sendCallNotification(
        recipientUserId: string,
        callerName: string,
        callType: 'audio' | 'video',
        callerId: string
    ): Promise<boolean> {
        const pushToken = await this.getPushToken(recipientUserId);

        if (!pushToken) {
            console.log(`⚠️ Usuario ${recipientUserId} no tiene push token registrado`);
            return false;
        }

        const callTypeText = callType === 'video' ? 'videollamada' : 'llamada de voz';

        const message: ExpoPushMessage = {
            to: pushToken,
            sound: 'default',
            title: `Llamada entrante`,
            body: `${callerName} te está haciendo una ${callTypeText}`,
            data: {
                type: 'call',
                callerId,
                callerName,
                callType,
                pendingCall: true,
            },
            categoryId: 'call',
            channelId: 'calls',
            priority: 'high',
        };

        return this.sendNotification(message);
    }

    // Enviar notificación de llamada perdida
    async sendMissedCallNotification(
        recipientUserId: string,
        callerName: string,
        callType: 'audio' | 'video',
        callerId: string
    ): Promise<boolean> {
        const pushToken = await this.getPushToken(recipientUserId);

        if (!pushToken) {
            return false;
        }

        const callTypeText = callType === 'video' ? 'videollamada' : 'llamada';

        const message: ExpoPushMessage = {
            to: pushToken,
            sound: 'default',
            title: `📵 Llamada perdida`,
            body: `Tienes una ${callTypeText} perdida de ${callerName}`,
            data: {
                type: 'missed_call',
                callerId,
                callerName,
                callType,
            },
            channelId: 'messages',
            priority: 'high',
        };

        return this.sendNotification(message);
    }

    // Enviar notificación a múltiples usuarios
    async sendBulkNotification(
        userIds: string[],
        title: string,
        body: string,
        data?: Record<string, any>
    ): Promise<number> {
        let successCount = 0;

        for (const userId of userIds) {
            const pushToken = await this.getPushToken(userId);
            if (pushToken) {
                const success = await this.sendNotification({
                    to: pushToken,
                    sound: 'default',
                    title,
                    body,
                    data,
                    priority: 'high',
                });
                if (success) successCount++;
            }
        }

        return successCount;
    }

    // Método privado para enviar la notificación a Expo
    private async sendNotification(message: ExpoPushMessage): Promise<boolean> {
        try {
            console.log(`📤 Enviando notificación push a token: ${message.to.substring(0, 30)}...`);
            const response = await fetch(this.EXPO_PUSH_URL, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(message),
            });

            const result = await response.json();
            console.log(`📨 Respuesta de Expo Push:`, JSON.stringify(result));

            // Expo returns data as array or single object depending on request
            const tickets: ExpoPushTicket[] = Array.isArray(result.data) ? result.data : result.data ? [result.data] : [];

            if (tickets.length > 0) {
                const ticket = tickets[0];

                if (ticket.status === 'ok') {
                    console.log(`✅ Notificación enviada: ${ticket.id}`);
                    return true;
                } else {
                    console.error(`❌ Error en notificación:`, ticket.message, ticket.details);

                    // Si el token es inválido, lo eliminamos
                    if (ticket.details?.error === 'DeviceNotRegistered') {
                        await this.removePushToken(message.to);
                    }
                    return false;
                }
            }

            return false;
        } catch (error) {
            console.error('❌ Error al enviar notificación push:', error);
            return false;
        }
    }

    // Eliminar push token inválido
    private async removePushToken(pushToken: string): Promise<void> {
        try {
            await query(
                `UPDATE users SET push_token = NULL WHERE push_token = $1`,
                [pushToken]
            );
            console.log('🗑️ Push token inválido eliminado');
        } catch (error) {
            console.error('Error al eliminar push token:', error);
        }
    }
}

// Singleton
export const pushNotificationService = new PushNotificationService();
