import React from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import TopBar from '../components/TopBar';
import { router } from 'expo-router';

export default function Contact() {
  // Contact details (from provided reference)
  const EMAIL = 'kvktvmalai91@gmail.com';
  const WEBSITE = 'http://www.kvkthiruvannamalai.com';

  const PHONE_OFFICE = '04182-290551';
  const PHONE_MOBILE_1 = '+916384093303';
  const PHONE_MOBILE_2 = '+918220004286';

  const call = async (num: string) => {
    const tel = String(num).replace(/\s+/g, '').replace(/-/g, '');
    try {
      await Linking.openURL(`tel:${tel}`);
    } catch {
      Alert.alert('Contact us', 'Unable to open phone dialer.');
    }
  };

  const wa = async (num: string) => {
    const n = String(num).replace(/\s+/g, '').replace(/-/g, '').replace(/^\+/, '');
    try {
      await Linking.openURL(`https://wa.me/${n}`);
    } catch {
      Alert.alert('Contact us', 'Unable to open WhatsApp.');
    }
  };

  const email = async (subject?: string) => {
    try {
      const s = subject ? `?subject=${encodeURIComponent(subject)}` : '';
      await Linking.openURL(`mailto:${EMAIL}${s}`);
    } catch {
      Alert.alert('Contact us', 'Unable to open email app.');
    }
  };

  const openWebsite = async () => {
    try {
      await Linking.openURL(WEBSITE);
    } catch {
      Alert.alert('Contact us', 'Unable to open website.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <TopBar title="Contact Us" showBack onBack={() => router.back()} />

      <View style={styles.content}>
        <Text style={styles.heading}>We’re here to help</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Email Us</Text>
          <TouchableOpacity style={styles.actionRow} onPress={() => email()}>
            <Ionicons name="mail" size={18} color="#4caf50" />
            <Text style={styles.actionText}>{EMAIL}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionRow} onPress={openWebsite}>
            <Ionicons name="globe" size={18} color="#4caf50" />
            <Text style={styles.actionText}>www.kvkthiruvannamalai.com</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Call Us</Text>
          <TouchableOpacity style={styles.actionRow} onPress={() => call(PHONE_OFFICE)}>
            <Ionicons name="call" size={18} color="#4caf50" />
            <Text style={styles.actionText}>{PHONE_OFFICE}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionRow} onPress={() => call(PHONE_MOBILE_1)}>
            <Ionicons name="call" size={18} color="#4caf50" />
            <Text style={styles.actionText}>{PHONE_MOBILE_1}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionRow} onPress={() => call(PHONE_MOBILE_2)}>
            <Ionicons name="call" size={18} color="#4caf50" />
            <Text style={styles.actionText}>{PHONE_MOBILE_2}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionRow, { marginTop: 6 }]} onPress={() => wa(PHONE_MOBILE_1)}>
            <Ionicons name="logo-whatsapp" size={18} color="#4caf50" />
            <Text style={styles.actionText}>WhatsApp: {PHONE_MOBILE_1}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, gap: 12 },
  heading: { color: '#2d5016', fontWeight: '800', fontSize: 18 },
  card: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#fff',
  },
  cardTitle: { color: '#2d5016', fontWeight: '800', fontSize: 16, marginBottom: 10 },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
  actionText: { color: '#2d5016', fontWeight: '700', flexShrink: 1 },
  masterBtn: {
    backgroundColor: '#f1f8f4',
    borderWidth: 1,
    borderColor: '#c8e6c9',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  masterBtnText: { color: '#2d5016', fontWeight: '700' },
});
