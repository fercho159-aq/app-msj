import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Platform, View, StyleSheet, Text } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';

interface ScreenCaptureContextType {
    isProtected: boolean;
    isBeingCaptured: boolean;
    enableProtection: () => Promise<void>;
    disableProtection: () => Promise<void>;
}

const ScreenCaptureContext = createContext<ScreenCaptureContextType | undefined>(undefined);

interface ScreenCaptureProviderProps {
    children: ReactNode;
    /** Si es true, bloquea capturas por defecto al montar */
    protectByDefault?: boolean;
}

export const ScreenCaptureProvider: React.FC<ScreenCaptureProviderProps> = ({
    children,
    protectByDefault = true
}) => {
    const [isProtected, setIsProtected] = useState(false);
    const [isBeingCaptured, setIsBeingCaptured] = useState(false);

    // Activar protección contra capturas de pantalla
    const enableProtection = async () => {
        try {
            // En Android, esto previene completamente las capturas
            // En iOS, solo puede detectar cuando se está grabando la pantalla
            await ScreenCapture.preventScreenCaptureAsync();
            setIsProtected(true);
            console.log('🔒 Protección de pantalla activada');
        } catch (error) {
            console.error('Error activando protección de pantalla:', error);
        }
    };

    // Desactivar protección
    const disableProtection = async () => {
        try {
            await ScreenCapture.allowScreenCaptureAsync();
            setIsProtected(false);
            console.log('🔓 Protección de pantalla desactivada');
        } catch (error) {
            console.error('Error desactivando protección de pantalla:', error);
        }
    };

    // Activar protección al montar si está configurado
    useEffect(() => {
        if (protectByDefault && Platform.OS !== 'web') {
            enableProtection();
        }

        return () => {
            // Limpiar al desmontar
            if (Platform.OS !== 'web') {
                ScreenCapture.allowScreenCaptureAsync();
            }
        };
    }, [protectByDefault]);

    // Listener para detectar cuando se está grabando la pantalla (iOS principalmente)
    useEffect(() => {
        if (Platform.OS === 'web') return;

        const subscription = ScreenCapture.addScreenshotListener(() => {
            console.log('📸 ¡Se detectó una captura de pantalla!');
            // Aquí podrías enviar una notificación al servidor, mostrar un aviso, etc.
            setIsBeingCaptured(true);

            // Resetear después de un momento
            setTimeout(() => setIsBeingCaptured(false), 2000);
        });

        return () => {
            subscription.remove();
        };
    }, []);

    const value: ScreenCaptureContextType = {
        isProtected,
        isBeingCaptured,
        enableProtection,
        disableProtection,
    };

    return (
        <ScreenCaptureContext.Provider value={value}>
            {children}
            {/* Overlay cuando se detecta captura en iOS */}
            {isBeingCaptured && Platform.OS === 'ios' && (
                <View style={styles.captureOverlay}>
                    <Text style={styles.captureText}>
                        ⚠️ Captura de pantalla detectada
                    </Text>
                </View>
            )}
        </ScreenCaptureContext.Provider>
    );
};

export const useScreenCapture = (): ScreenCaptureContextType => {
    const context = useContext(ScreenCaptureContext);
    if (!context) {
        throw new Error('useScreenCapture debe usarse dentro de ScreenCaptureProvider');
    }
    return context;
};

const styles = StyleSheet.create({
    captureOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
    captureText: {
        color: '#ff4444',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
});

export default ScreenCaptureProvider;
