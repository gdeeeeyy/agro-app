import React from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import TopBar from '../components/TopBar';

export default function Contact() {
  const num = (process.env.EXPO_PUBLIC_SUPPORT_NUMBER || '').replace(/\s+/g,'');

  const call = async () => {
    if (!num) { Alert.alert('Contact us', 'Set EXPO_PUBLIC_SUPPORT_NUMBER to enable calling.'); return; }
    try { await Linking.openURL(`tel:${num}`); } catch {}
  };
  const wa = async () => {
    if (!num) { Alert.alert('Contact us', 'Set EXPO_PUBLIC_SUPPORT_NUMBER to enable WhatsApp.'); return; }
    try { await Linking.openURL(`https://wa.me/${num}`); } catch {}
  };

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:'#fff' }}>
      <TopBar title="Contact us" showBack onBack={() => history.back?.()} />

      <View style={{ padding: 16, gap: 12 }}>
        <Text style={{ color:'#2d5016', fontWeight:'700', fontSize: 16 }}>We’re here to help</Text>
        <TouchableOpacity style={styles.masterBtn} onPress={call}>
          <Ionicons name="call" size={18} color="#4caf50" />
          <Text style={styles.masterBtnText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.masterBtn} onPress={wa}>
          <Ionicons name="logo-whatsapp" size={18} color="#4caf50" />
          <Text style={styles.masterBtnText}>WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  masterBtn: { backgroundColor: '#f1f8f4', borderWidth: 1, borderColor: '#c8e6c9', padding: 12, borderRadius: 8, flexDirection: 'row', gap: 8, alignItems: 'center' },
  masterBtnText: { color: '#2d5016', fontWeight: '600' },
});
