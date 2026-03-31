import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    lightColors,
    darkColors,
    lightGradients,
    darkGradients,
    ThemeColors,
    ThemeGradients
} from '../theme/colors';

// Tipos
export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: ThemeMode;
    isDark: boolean;
    colors: ThemeColors;
    gradients: ThemeGradients;
    setTheme: (theme: ThemeMode) => void;
}

// Contexto
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Key para AsyncStorage
const THEME_STORAGE_KEY = '@app_theme';

// Provider
interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [theme, setThemeState] = useState<ThemeMode>('system');
    const [isLoaded, setIsLoaded] = useState(false);

    // Cargar tema guardado
    useEffect(() => {
        const loadTheme = async () => {
            try {
                const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
                if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
                    setThemeState(savedTheme as ThemeMode);
                }
            } catch (error) {
                console.error('Error loading theme:', error);
            } finally {
                setIsLoaded(true);
            }
        };
        loadTheme();
    }, []);

    // Guardar tema cuando cambie
    const setTheme = async (newTheme: ThemeMode) => {
        try {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
            setThemeState(newTheme);
        } catch (error) {
            console.error('Error saving theme:', error);
        }
    };

    // Determinar si es oscuro
    const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');

    // Seleccionar colores y gradientes
    const colors = isDark ? darkColors : lightColors;
    const gradients = isDark ? darkGradients : lightGradients;

    const value: ThemeContextType = {
        theme,
        isDark,
        colors,
        gradients,
        setTheme,
    };

    // No renderizar hasta que se cargue el tema
    if (!isLoaded) {
        return null;
    }

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

// Hook para usar el tema
export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export default ThemeContext;
