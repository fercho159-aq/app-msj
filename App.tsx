import React, { useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { StatusBar, View, StyleSheet, Platform, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import { AuthProvider } from './src/context/AuthContext';
import { WebRTCProvider } from './src/context/WebRTCContext';
import { CallProvider } from './src/context/CallContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { ScreenCaptureProvider } from './src/context/ScreenCaptureContext';
import { AppNavigator } from './src/navigation';
import { CallModal } from './src/components/CallModal';

// Error Boundary para capturar errores de renderizado
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Error capturado:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 20 }}>
          <Text style={{ color: 'red', fontSize: 18, fontWeight: 'bold' }}>Error en la aplicación</Text>
          <Text style={{ color: '#333', marginTop: 10 }}>{this.state.error?.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// Componente interno que tiene acceso al tema
function AppContent() {
  const { colors, isDark } = useTheme();

  console.log('[AppContent] Renderizando, colors:', colors?.background);

  // Ocultar barra de navegación en Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
      NavigationBar.setBehaviorAsync('overlay-swipe');
    }
  }, []);

  return (
    <>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
        translucent={true}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AppNavigator />
      </View>
      {/* Modal global de llamadas */}
      <CallModal />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <ScreenCaptureProvider protectByDefault={false}>
            <ThemeProvider>
              <AuthProvider>
                <WebRTCProvider>
                  <CallProvider>
                    <AppContent />
                  </CallProvider>
                </WebRTCProvider>
              </AuthProvider>
            </ThemeProvider>
          </ScreenCaptureProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
