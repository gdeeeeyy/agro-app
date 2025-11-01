import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React, { useContext } from 'react';
import { UserContext } from '../../context/UserContext';
import { useLanguage } from '../../context/LanguageContext';

export default function TabLayout() {
  const { user } = useContext(UserContext);
  const { t } = useLanguage();
  const isAdmin = user?.is_admin === 1;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4caf50',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
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
          title: t('nav.profile'),
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="person" size={size + 6} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
