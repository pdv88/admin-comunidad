import 'react-native-gesture-handler';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { LogBox } from 'react-native';
import 'react-native-reanimated';
import "../global.css";

// Suppress specific warnings including the SafeAreaView deprecation
LogBox.ignoreLogs([
  'SafeAreaView has been deprecated',
]);

import { AuthProvider } from '../context/AuthContext';
import { AppProvider, useApp } from '../context/AppContext';

import { useProtectedRoute } from '@/hooks/useProtectedRoute';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <AppProvider>
      <AuthProvider>
        <LayoutContent />
      </AuthProvider>
    </AppProvider>
  );
}

function LayoutContent() {
  const { isDarkMode } = useApp();
  useProtectedRoute();

  return (
    <ThemeProvider value={isDarkMode ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
