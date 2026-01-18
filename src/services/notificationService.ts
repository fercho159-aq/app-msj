// NOTIFICACIONES DESHABILITADAS TEMPORALMENTE
// Para reactivar, instala: npm install expo-notifications
// y restaura el código original de este archivo

// Tipos de notificación (mantenidos para compatibilidad)
export interface NotificationData {
    type: 'message' | 'call' | 'missed_call';
    chatId?: string;
    senderId?: string;
    senderName?: string;
    message?: string;
    callType?: 'audio' | 'video';
}

class NotificationService {
    private pushToken: string | null = null;
    private onNotificationTap: ((data: NotificationData) => void) | null = null;

    // Inicializar el servicio (no-op por ahora)
    async initialize(): Promise<string | null> {
        console.log('⚠️ Notificaciones deshabilitadas temporalmente');
        return null;
    }

    setOnNotificationTap(callback: (data: NotificationData) => void): void {
        this.onNotificationTap = callback;
    }

    async registerPushToken(userId: string): Promise<boolean> {
        console.log('⚠️ Registro de push token deshabilitado');
        return false;
    }

    getPushToken(): string | null {
        return this.pushToken;
    }

    async showLocalNotification(
        title: string,
        body: string,
        data?: NotificationData
    ): Promise<void> {
        console.log('⚠️ Notificación local deshabilitada:', title, body);
    }

    async clearBadge(): Promise<void> {
        // no-op
    }

    async incrementBadge(): Promise<void> {
        // no-op
    }

    cleanup(): void {
        // no-op
    }
}

// Singleton
export const notificationService = new NotificationService();
