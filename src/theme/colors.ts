// Paleta de colores "Danube" - Tema claro elegante
const danube = {
    50: '#f3f6fb',
    100: '#e4ebf5',
    200: '#cedeef',
    300: '#adc7e3',
    400: '#86abd4',
    500: '#7397cc',
    600: '#5578bb',
    700: '#4b66aa',
    800: '#41558c',
    900: '#384870',
    950: '#262e45',
};

// Colores principales de la app - TEMA CLARO
const colors = {
    // Primarios
    primary: danube[600],
    primaryLight: danube[400],
    primaryDark: danube[700],

    // Backgrounds (tema claro)
    background: danube[50],
    backgroundSecondary: danube[100],

    // Surfaces
    surface: '#ffffff',
    surfaceLight: danube[100],

    // Textos (oscuros para tema claro)
    textPrimary: danube[950],
    textSecondary: danube[800],
    textMuted: danube[500],

    // Bordes y divisores
    border: danube[200],
    divider: danube[200],

    // Estados
    online: '#10B981',
    offline: danube[400],
    typing: danube[600],

    // Acciones
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: danube[500],

    // Especiales
    shadow: 'rgba(56, 72, 112, 0.15)',
    overlay: 'rgba(38, 46, 69, 0.5)',

    // Mensajes
    messageSent: danube[600],
    messageReceived: '#ffffff',
    messageRead: danube[400],
};

// Gradientes
export const gradients = {
    primary: [danube[600], danube[500], danube[400]],
    secondary: [danube[700], danube[600]],
    dark: [danube[900], danube[800]],
    surface: [danube[50], danube[100]],
    accent: [danube[500], danube[400]],
};

// Exportar paleta danube para uso directo
export { danube };

export default colors;
