import { Platform, Vibration } from 'react-native';
import Constants from 'expo-constants';

let Notifications: any = null;
let Device: any = null;

try {
    Notifications = require('expo-notifications');
    Device = require('expo-device');

    Notifications.setNotificationHandler({
        handleNotification: async (notification: any) => {
            const data = notification.request.content.data as NotificationData;
            const isCall = data?.type === 'call' || data?.pendingCall === true;

            if (isCall) {
                Vibration.vibrate([0, 500, 300, 500, 300, 500, 300, 500, 300, 500], true);
            }

            return {
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: !isCall,
            };
        },
    });
} catch (e) {
    console.warn('⚠️ expo-notifications no disponible:', e);
}

export interface NotificationData {
    type: 'message' | 'call' | 'missed_call';
    chatId?: string;
    senderId?: string;
    senderName?: string;
    message?: string;
    callType?: 'audio' | 'video';
    callerId?: string;
    callerName?: string;
    pendingCall?: boolean;
}

class NotificationService {
    private pushToken: string | null = null;
    private onNotificationTap: ((data: NotificationData) => void) | null = null;
    private notificationListener: any = null;
    private responseListener: any = null;

    async initialize(): Promise<string | null> {
        if (!Notifications || !Device) {
            console.warn('⚠️ expo-notifications no disponible, saltando inicializacion');
            return null;
        }

        if (!Device.isDevice) {
            console.log('⚠️ Las notificaciones push requieren un dispositivo físico');
            return null;
        }

        try {
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

        if (Platform.OS === 'android') {
            try {
                await Notifications.setNotificationChannelAsync('messages', {
                    name: 'Mensajes',
                    importance: Notifications.AndroidImportance.HIGH,
                    sound: 'default',
                    vibrationPattern: [0, 250, 250, 250],
                });

                await Notifications.setNotificationChannelAsync('calls', {
                    name: 'Llamadas',
                    importance: Notifications.AndroidImportance.MAX,
                    sound: 'ringtone.wav',
                    vibrationPattern: [0, 500, 300, 500, 300, 500, 300, 500, 300, 500, 300, 500, 300, 500, 300, 500],
                    enableVibrate: true,
                    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
                });
            } catch (e) {
                console.warn('⚠️ Error configurando canales de Android:', e);
            }
        }

        this.notificationListener = Notifications.addNotificationReceivedListener((notification: any) => {
            console.log('📩 Notificación recibida:', notification);
        });

        this.responseListener = Notifications.addNotificationResponseReceivedListener((response: any) => {
            const data = response.notification.request.content.data as NotificationData;
            if (data?.type === 'call' || data?.pendingCall) {
                Vibration.cancel();
            }
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
        if (!Notifications) return;
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
        if (!Notifications) return;
        await Notifications.setBadgeCountAsync(0);
    }

    async incrementBadge(): Promise<void> {
        if (!Notifications) return;
        const current = await Notifications.getBadgeCountAsync();
        await Notifications.setBadgeCountAsync(current + 1);
    }

    cancelCallVibration(): void {
        Vibration.cancel();
    }

    cleanup(): void {
        if (Notifications) {
            if (this.notificationListener) {
                Notifications.removeNotificationSubscription(this.notificationListener);
            }
            if (this.responseListener) {
                Notifications.removeNotificationSubscription(this.responseListener);
            }
        }
    }
}

// Singleton
export const notificationService = new NotificationService();
