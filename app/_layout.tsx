import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { UserProvider } from '../context/UserContext';
import { useEffect } from 'react';
import { loadLanguage } from '../lib/i18n';

export default function RootLayout() {
  useEffect(() => {
    loadLanguage();
  }, []);

  return (
    <UserProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/signup" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="auto" />
    </UserProvider>
  );
}
