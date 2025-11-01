import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import CartIcon from './CartIcon';

export default function AppHeader() {
  return (
    <View>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#4caf50' }} />
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Image source={require('../assets/images/icon.png')} style={styles.logo} />
          <Text style={styles.title} numberOfLines={1}>Agriismart</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/cart')} accessibilityLabel="Open Cart" style={styles.actionBtn}>
            <CartIcon size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#4caf50', paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 32, height: 32, borderRadius: 8 },
  title: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtn: { padding: 6 },
});
