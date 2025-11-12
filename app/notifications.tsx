import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getNotifications } from '../lib/database';
import { useLanguage } from '../context/LanguageContext';
import { UserContext } from '../context/UserContext';

export default function NotificationsScreen() {
  const { user } = useContext(UserContext);
  const { currentLanguage } = useLanguage();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { const list = await getNotifications(user?.id || undefined) as any[]; setRows(list); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user?.id]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#4caf50' }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={load}>
          <Ionicons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {loading ? (
          <Text style={{ color:'#666' }}>Loading...</Text>
        ) : rows.length === 0 ? (
          <Text style={{ color:'#666' }}>No notifications yet</Text>
        ) : rows.map((n:any) => (
          <View key={`${n.id}-${n.created_at}`} style={styles.card}>
            <Text style={styles.title}>{currentLanguage==='ta' && n.title_ta ? n.title_ta : n.title}</Text>
            <Text style={styles.message}>{currentLanguage==='ta' && n.message_ta ? n.message_ta : n.message}</Text>
            <Text style={styles.time}>{new Date(n.created_at || Date.now()).toLocaleString()}</Text>
          </View>
        ))}
      </ScrollView>
      <SafeAreaView edges={['bottom']} style={{ backgroundColor:'#fff' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { backgroundColor: '#4caf50', paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  card: { padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e0e0e0', backgroundColor: '#fff', marginBottom: 12 },
  title: { fontWeight: '700', color: '#2d5016' },
  message: { color: '#333', marginTop: 4 },
  time: { color: '#999', fontSize: 12, marginTop: 2 },
});
