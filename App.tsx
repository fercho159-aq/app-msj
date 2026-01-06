import React from 'react';
import { StatusBar, View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { CallProvider } from './src/context/CallContext';
import { AppNavigator } from './src/navigation';
import { CallModal } from './src/components/CallModal';
import colors from './src/theme/colors';

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <AuthProvider>
          <CallProvider>
            <StatusBar
              barStyle="dark-content"
              backgroundColor={colors.background}
              translucent={true}
            />
            <View style={styles.container}>
              <AppNavigator />
            </View>
            {/* Modal global de llamadas */}
            <CallModal />
          </CallProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
