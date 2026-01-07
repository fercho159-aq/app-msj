import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, User } from '../api/client';
import { notificationService } from '../services/notificationService';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (rfc: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = '@messaging_app_user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Cargar usuario guardado al iniciar
    useEffect(() => {
        loadStoredUser();
    }, []);

    // Inicializar notificaciones cuando cambia el usuario
    useEffect(() => {
        if (user) {
            initializeNotifications(user.id);
        }
    }, [user]);

    // Limpiar listeners al desmontar
    useEffect(() => {
        return () => {
            notificationService.cleanup();
        };
    }, []);

    const initializeNotifications = async (userId: string) => {
        try {
            // Inicializar el servicio de notificaciones
            const pushToken = await notificationService.initialize();

            if (pushToken) {
                // Registrar el token en el servidor
                await notificationService.registerPushToken(userId);
                console.log('🔔 Notificaciones push configuradas correctamente');
            }
        } catch (error) {
            console.error('Error al configurar notificaciones:', error);
        }
    };

    const loadStoredUser = async () => {
        try {
            const storedUser = await AsyncStorage.getItem(STORAGE_KEY);
            if (storedUser) {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
                api.setUserId(parsedUser.id);
                // Actualizar estado a online
                await api.updateStatus('online');
            }
        } catch (error) {
            console.error('Error loading stored user:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (rfc: string): Promise<{ success: boolean; error?: string }> => {
        try {
            setIsLoading(true);
            const result = await api.login(rfc);

            if (result.error) {
                return { success: false, error: result.error };
            }

            if (result.data?.user) {
                const userData = result.data.user;
                setUser(userData);
                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
                return { success: true };
            }

            return { success: false, error: 'Error desconocido' };
        } catch (error: any) {
            return { success: false, error: error.message };
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        try {
            await api.logout();
            await AsyncStorage.removeItem(STORAGE_KEY);
            await AsyncStorage.removeItem('pushToken');
            notificationService.cleanup();
            setUser(null);
        } catch (error) {
            console.error('Error during logout:', error);
        }
    };

    const updateUser = (data: Partial<User>) => {
        if (user) {
            const updatedUser = { ...user, ...data };
            setUser(updatedUser);
            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
                logout,
                updateUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;

