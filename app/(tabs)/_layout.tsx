import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React, { useContext } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserContext } from '../../context/UserContext';
import { useLanguage } from '../../context/LanguageContext';

export default function TabLayout() {
  const { user } = useContext(UserContext);
  const { t } = useLanguage();
  const isAdmin = user?.is_admin === 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#4caf50' }} edges={['right', 'left', 'bottom']}>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#e0f2f1',
        tabBarStyle: {
          backgroundColor: '#4caf50',
          borderTopWidth: 0,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
          elevation: 0, // Remove shadow on Android
          position: 'relative',
        },
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginBottom: 4,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
          marginBottom: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav.home'),
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="home" size={size + 6} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="App"
        options={{
          title: t('nav.scan'),
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="leaf" size={size + 6} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: t('nav.store'),
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="storefront" size={size + 6} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t('nav.orders'),
          href: null,
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="receipt" size={size + 6} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: t('nav.admin'),
          href: null,
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="settings" size={size + 6} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="adminOrders"
        options={{
          title: t('nav.manage'),
          href: null,
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="clipboard" size={size + 6} color={color} />
          ),
        }}
      />
      {/* Remove Cart from tab bar entirely */}
      <Tabs.Screen
        name="cart"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('account.title'),
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="person" size={size + 6} color={color} />
          ),
        }}
      />
    </Tabs>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4caf50',
  },
});
