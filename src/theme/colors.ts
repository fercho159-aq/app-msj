// Paleta de colores Monocromática - Blanco y Negro
const mono = {
    50: '#ffffff',   // Blanco puro
    100: '#fafafa',  // Blanco hueso
    200: '#e5e5e5',  // Gris muy claro
    300: '#d4d4d4',  // Gris claro
    400: '#a3a3a3',  // Gris medio claro
    500: '#737373',  // Gris medio
    600: '#525252',  // Gris oscuro
    700: '#404040',  // Gris muy oscuro
    800: '#262626',  // Casi negro
    900: '#171717',  // Negro suave
    950: '#000000',  // Negro puro
};

// Alias para mantener compatibilidad
const danube = mono;

// Tipo para los colores del tema
export interface ThemeColors {
    // Primarios
    primary: string;
    primaryLight: string;
    primaryDark: string;
    // Backgrounds
    background: string;
    backgroundSecondary: string;
    // Surfaces
    surface: string;
    surfaceLight: string;
    // Textos
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    // Bordes y divisores
    border: string;
    divider: string;
    // Estados
    online: string;
    offline: string;
    typing: string;
    // Acciones
    success: string;
    error: string;
    warning: string;
    info: string;
    // Especiales
    shadow: string;
    overlay: string;
    // Mensajes
    messageSent: string;
    messageReceived: string;
    messageRead: string;
}

// Gradientes tipo
export interface ThemeGradients {
    primary: string[];
    secondary: string[];
    dark: string[];
    surface: string[];
    accent: string[];
}

// ============================================
// TEMA CLARO - Blanco con textos negros
// ============================================
export const lightColors: ThemeColors = {
    // Primarios (negro como color principal)
    primary: mono[900],
    primaryLight: mono[600],
    primaryDark: mono[950],

    // Backgrounds (blancos)
    background: mono[50],
    backgroundSecondary: mono[100],

    // Surfaces
    surface: '#ffffff',
    surfaceLight: mono[100],

    // Textos (negros para contraste)
    textPrimary: mono[950],
    textSecondary: mono[700],
    textMuted: mono[500],

    // Bordes y divisores
    border: mono[300],
    divider: mono[200],

    // Estados (monocromáticos)
    online: mono[600],
    offline: mono[400],
    typing: mono[700],

    // Acciones (matices de gris)
    success: mono[700],
    error: mono[800],
    warning: mono[600],
    info: mono[500],

    // Especiales
    shadow: 'rgba(0, 0, 0, 0.15)',
    overlay: 'rgba(0, 0, 0, 0.5)',

    // Mensajes
    messageSent: mono[900],
    messageReceived: '#ffffff',
    messageRead: mono[500],
};

// Gradientes para tema claro
export const lightGradients: ThemeGradients = {
    primary: [mono[900], mono[700], mono[600]],
    secondary: [mono[800], mono[700]],
    dark: [mono[950], mono[900]],
    surface: [mono[50], mono[100]],
    accent: [mono[700], mono[500]],
};

// ============================================
// TEMA OSCURO - Negro con textos blancos
// ============================================
export const darkColors: ThemeColors = {
    // Primarios (blanco como color principal en tema oscuro)
<<<<<<< HEAD
    primary: mono[50],
    primaryLight: mono[200],
=======
    primary: mono[100],
    primaryLight: mono[300],
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
    primaryDark: mono[50],

    // Backgrounds (oscuros)
    background: mono[950],
    backgroundSecondary: mono[900],

    // Surfaces (oscuras)
    surface: mono[800],
    surfaceLight: mono[700],

    // Textos (blancos para contraste)
    textPrimary: mono[50],
    textSecondary: mono[300],
<<<<<<< HEAD
    textMuted: mono[400],

    // Bordes y divisores (oscuros)
    border: mono[600],
    divider: mono[700],

    // Estados (monocromáticos ajustados)
    online: mono[300],
    offline: mono[500],
    typing: mono[200],

    // Acciones (matices claros para visibilidad)
    success: mono[300],
    error: mono[300],
    warning: mono[300],
    info: mono[400],
=======
    textMuted: mono[500],

    // Bordes y divisores (oscuros)
    border: mono[700],
    divider: mono[800],

    // Estados (monocromáticos ajustados)
    online: mono[400],
    offline: mono[600],
    typing: mono[300],

    // Acciones (matices claros para visibilidad)
    success: mono[300],
    error: mono[200],
    warning: mono[400],
    info: mono[500],
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24

    // Especiales
    shadow: 'rgba(0, 0, 0, 0.4)',
    overlay: 'rgba(0, 0, 0, 0.7)',

<<<<<<< HEAD
    // Mensajes (fondo gris oscuro para burbujas enviadas, texto blanco)
    messageSent: mono[600],
    messageReceived: mono[800],
    messageRead: mono[400],
=======
    // Mensajes
    messageSent: mono[700],
    messageReceived: mono[800],
    messageRead: mono[500],
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
};

// Gradientes para tema oscuro
export const darkGradients: ThemeGradients = {
<<<<<<< HEAD
    primary: [mono[50], mono[200], mono[300]],
    secondary: [mono[100], mono[200]],
    dark: [mono[950], mono[900]],
    surface: [mono[900], mono[800]],
    accent: [mono[200], mono[400]],
=======
    primary: [mono[100], mono[300], mono[400]],
    secondary: [mono[200], mono[300]],
    dark: [mono[950], mono[900]],
    surface: [mono[900], mono[800]],
    accent: [mono[300], mono[500]],
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
};

// ============================================
// Exportaciones por defecto (tema claro)
// ============================================

// Colores por defecto (tema claro para compatibilidad)
const colors = lightColors;

// Gradientes por defecto
export const gradients = lightGradients;

// Exportar paleta mono para uso directo (y danube como alias)
export { danube, mono };

export default colors;
