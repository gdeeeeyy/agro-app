import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { BackHandler } from 'react-native';
import { UserProvider } from '../context/UserContext';
import { CartProvider } from '../context/CartContext';
import { LanguageProvider } from '../context/LanguageContext';

export default function RootLayout() {
  React.useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      try {
        // Only intercept the Android back button when we can actually navigate back.
        // If we *can't* go back, return false so React Native can handle it (e.g. close modals / exit app).
        // @ts-ignore
        if ((router as any).canGoBack?.()) {
          router.back();
          return true;
        }
      } catch {}
      return false;
    });
    return () => sub.remove();
  }, []);

  return (
    <LanguageProvider>
      <UserProvider>
        <CartProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="language" />
            <Stack.Screen name="auth/login" />
            <Stack.Screen name="auth/signup" />
            <Stack.Screen name="(tabs)" />
          </Stack>
          <StatusBar style="auto" />
        </CartProvider>
      </UserProvider>
    </LanguageProvider>
  );
}
