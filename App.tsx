import React, { useEffect } from 'react';
import { StatusBar, View, StyleSheet, Platform } from 'react-native';
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

// Componente interno que tiene acceso al tema
function AppContent() {
  const { colors, isDark } = useTheme();

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
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ScreenCaptureProvider protectByDefault={true}>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
