import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// URL de la API
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://appsoluciones.duckdns.org/api';

// Configurar cómo se muestran las notificaciones en primer plano
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

// Tipos de notificación
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
    private notificationListener: Notifications.EventSubscription | null = null;
    private responseListener: Notifications.EventSubscription | null = null;
    private onNotificationTap: ((data: NotificationData) => void) | null = null;

    // Inicializar el servicio de notificaciones
    async initialize(): Promise<string | null> {
        try {
            // Verificar si es un dispositivo físico
            if (!Device.isDevice) {
                console.log('⚠️ Las notificaciones push solo funcionan en dispositivos físicos');
                return null;
            }

            // Solicitar permisos
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.log('❌ Permisos de notificación denegados');
                return null;
            }

            // Obtener el Expo Push Token
            const projectId = Constants.expoConfig?.extra?.eas?.projectId;
            if (!projectId) {
                console.error('❌ No se encontró el projectId de EAS');
                return null;
            }

            const tokenResponse = await Notifications.getExpoPushTokenAsync({
                projectId,
            });

            this.pushToken = tokenResponse.data;
            console.log('🔔 Push Token:', this.pushToken);

            // Configurar canal de notificaciones para Android
            if (Platform.OS === 'android') {
                await this.setupAndroidChannels();
            }

            // Configurar listeners
            this.setupListeners();

            return this.pushToken;
        } catch (error) {
            console.error('❌ Error al inicializar notificaciones:', error);
            return null;
        }
    }

    // Configurar canales de notificación en Android
    private async setupAndroidChannels(): Promise<void> {
        // Canal para mensajes
        await Notifications.setNotificationChannelAsync('messages', {
            name: 'Mensajes',
            description: 'Notificaciones de nuevos mensajes',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#6366F1',
            sound: 'default',
            enableVibrate: true,
            showBadge: true,
        });

        // Canal para llamadas
        await Notifications.setNotificationChannelAsync('calls', {
            name: 'Llamadas',
            description: 'Notificaciones de llamadas entrantes',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 500, 200, 500],
            lightColor: '#22C55E',
            sound: 'default',
            enableVibrate: true,
            showBadge: true,
        });
    }

    // Configurar listeners para notificaciones
    private setupListeners(): void {
        // Listener para notificaciones recibidas mientras la app está en primer plano
        this.notificationListener = Notifications.addNotificationReceivedListener(
            (notification) => {
                console.log('📬 Notificación recibida:', notification);
            }
        );

        // Listener para cuando el usuario toca una notificación
        this.responseListener = Notifications.addNotificationResponseReceivedListener(
            (response) => {
                console.log('👆 Notificación tocada:', response);
                const rawData = response.notification.request.content.data;

                // Verificar que tiene la estructura esperada
                if (rawData && typeof rawData === 'object' && 'type' in rawData) {
                    const data = rawData as unknown as NotificationData;
                    if (this.onNotificationTap) {
                        this.onNotificationTap(data);
                    }
                }
            }
        );
    }

    // Registrar callback para cuando se toque una notificación
    setOnNotificationTap(callback: (data: NotificationData) => void): void {
        this.onNotificationTap = callback;
    }

    // Registrar el push token en el servidor
    async registerPushToken(userId: string): Promise<boolean> {
        if (!this.pushToken) {
            console.log('⚠️ No hay push token para registrar');
            return false;
        }

        try {
            const response = await fetch(`${API_URL}/users/push-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    pushToken: this.pushToken,
                }),
            });

            if (!response.ok) {
                throw new Error('Error al registrar push token');
            }

            // Guardar localmente
            await AsyncStorage.setItem('pushToken', this.pushToken);
            console.log('✅ Push token registrado en el servidor');
            return true;
        } catch (error) {
            console.error('❌ Error al registrar push token:', error);
            return false;
        }
    }

    // Obtener el push token actual
    getPushToken(): string | null {
        return this.pushToken;
    }

    // Mostrar una notificación local (útil para testing)
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
                sound: true,
            },
            trigger: null, // Mostrar inmediatamente
        });
    }

    // Limpiar el badge de notificaciones
    async clearBadge(): Promise<void> {
        await Notifications.setBadgeCountAsync(0);
    }

    // Incrementar el badge
    async incrementBadge(): Promise<void> {
        const currentBadge = await Notifications.getBadgeCountAsync();
        await Notifications.setBadgeCountAsync(currentBadge + 1);
    }

    // Limpiar listeners al desmontar
    cleanup(): void {
        if (this.notificationListener) {
            this.notificationListener.remove();
            this.notificationListener = null;
        }
        if (this.responseListener) {
            this.responseListener.remove();
            this.responseListener = null;
        }
    }
}

// Singleton
export const notificationService = new NotificationService();
