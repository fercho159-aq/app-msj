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

// Paleta de azules
const blue = {
    50: '#f0f5fa', // Keeping light variants for backgrounds
    100: '#e1eaf5',
    200: '#c5d9ed',
    300: '#97B1DE', // Azul Pálido (User provided)
    400: '#7A93C8', // Azul Medio (User provided)
    500: '#5C76B2', // Azul Profundo (User provided)
    600: '#4a5f8f',
    700: '#325082',
    800: '#253b61',
    900: '#1a2a45',
    950: '#0f1826',
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
    // Primarios
    primary: blue[500], // #5C76B2
    primaryLight: blue[300], // #97B1DE
    primaryDark: blue[600],

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
    primary: [blue[500], blue[300]], // #5C76B2 -> #97B1DE
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
    primary: blue[300],
    primaryLight: blue[100],
    primaryDark: blue[500],

    // Backgrounds (oscuros)
    background: mono[950],
    backgroundSecondary: mono[900],

    // Surfaces (oscuras)
    surface: mono[800],
    surfaceLight: mono[700],

    // Textos (blancos para contraste)
    textPrimary: mono[50],
    textSecondary: mono[300],
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

    // Especiales
    shadow: 'rgba(0, 0, 0, 0.4)',
    overlay: 'rgba(0, 0, 0, 0.7)',

    // Mensajes (fondo gris oscuro para burbujas enviadas, texto blanco)
    messageSent: mono[600],
    messageReceived: mono[800],
    messageRead: mono[400],
};

// Gradientes para tema oscuro
export const darkGradients: ThemeGradients = {
    primary: [blue[500], blue[300]],
    secondary: [mono[100], mono[200]],
    dark: [mono[950], mono[900]],
    surface: [mono[900], mono[800]],
    accent: [mono[200], mono[400]],
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
