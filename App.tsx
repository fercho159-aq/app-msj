import React from 'react';
import { StatusBar, View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { CallProvider } from './src/context/CallContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
// StreamCallProvider removed - now using AgoraCallProvider
import { AgoraCallProvider } from './src/context/AgoraCallContext';
import { ScreenCaptureProvider } from './src/context/ScreenCaptureContext';
import { AppNavigator } from './src/navigation';
import { CallModal } from './src/components/CallModal';
import Preloader from './src/components/Preloader';
// import { StreamCallModal } from './src/components/StreamCallModal';

// Componente interno que tiene acceso al tema
function AppContent() {
  const { colors, isDark } = useTheme();

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
              <CallProvider>
                <AgoraCallProvider>
                  <AppContent />
                </AgoraCallProvider>
              </CallProvider>
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
