import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configurar cómo se muestran las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

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
    private notificationListener: Notifications.EventSubscription | null = null;
    private responseListener: Notifications.EventSubscription | null = null;

    async initialize(): Promise<string | null> {
        if (!Device.isDevice) {
            console.log('⚠️ Las notificaciones push requieren un dispositivo físico');
            return null;
        }

        // Pedir permisos
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('⚠️ Permisos de notificación no otorgados');
            return null;
        }

        // Obtener el push token
        try {
            const projectId = Constants.expoConfig?.extra?.eas?.projectId;
            const tokenData = await Notifications.getExpoPushTokenAsync({
                projectId,
            });
            this.pushToken = tokenData.data;
            console.log('✅ Push token obtenido:', this.pushToken);
        } catch (error) {
            console.error('❌ Error al obtener push token:', error);
            return null;
        }

        // Configurar canal de Android
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('messages', {
                name: 'Mensajes',
                importance: Notifications.AndroidImportance.HIGH,
                sound: 'default',
                vibrationPattern: [0, 250, 250, 250],
            });

            await Notifications.setNotificationChannelAsync('calls', {
                name: 'Llamadas',
                importance: Notifications.AndroidImportance.MAX,
                sound: 'default',
                vibrationPattern: [0, 500, 500, 500],
            });
        }

        // Escuchar notificaciones recibidas (app en primer plano)
        this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
            console.log('📩 Notificación recibida:', notification);
        });

        // Escuchar cuando el usuario toca una notificación
        this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data as NotificationData;
            if (this.onNotificationTap) {
                this.onNotificationTap(data);
            }
        });

        return this.pushToken;
    }

    setOnNotificationTap(callback: (data: NotificationData) => void): void {
        this.onNotificationTap = callback;
    }

    async registerPushToken(userId: string): Promise<boolean> {
        if (!this.pushToken) {
            console.log('⚠️ No hay push token disponible');
            return false;
        }

        try {
            const apiUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL;
            const response = await fetch(`${apiUrl}/users/${userId}/push-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pushToken: this.pushToken }),
            });
            return response.ok;
        } catch (error) {
            console.error('❌ Error al registrar push token:', error);
            return false;
        }
    }

    getPushToken(): string | null {
        return this.pushToken;
    }

    async showLocalNotification(
        title: string,
        body: string,
        data?: NotificationData
    ): Promise<void> {
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data: data as any,
                sound: 'default',
            },
            trigger: null,
        });
    }

    async clearBadge(): Promise<void> {
        await Notifications.setBadgeCountAsync(0);
    }

    async incrementBadge(): Promise<void> {
        const current = await Notifications.getBadgeCountAsync();
        await Notifications.setBadgeCountAsync(current + 1);
    }

    cleanup(): void {
        if (this.notificationListener) {
            Notifications.removeNotificationSubscription(this.notificationListener);
        }
        if (this.responseListener) {
            Notifications.removeNotificationSubscription(this.responseListener);
        }
    }
}

// Singleton
export const notificationService = new NotificationService();
