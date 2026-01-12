import React from 'react';
import { StatusBar, View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { CallProvider } from './src/context/CallContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
<<<<<<< HEAD
import { StreamCallProvider } from './src/context/StreamCallContext';
import { AppNavigator } from './src/navigation';
import { CallModal } from './src/components/CallModal';
import { StreamCallModal } from './src/components/StreamCallModal';
=======
import { AppNavigator } from './src/navigation';
import { CallModal } from './src/components/CallModal';
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24

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
<<<<<<< HEAD
      {/* Modal global de llamadas (antiguo sistema) */}
      <CallModal />
      {/* Modal de llamadas con Stream */}
      <StreamCallModal />
=======
      {/* Modal global de llamadas */}
      <CallModal />
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <CallProvider>
<<<<<<< HEAD
              <StreamCallProvider>
                <AppContent />
              </StreamCallProvider>
=======
              <AppContent />
>>>>>>> 96245e354f61f5fe47f0223e06d5ca17501c0a24
            </CallProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
