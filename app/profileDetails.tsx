import React, { useContext } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { UserContext } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';
import { router } from 'expo-router';
import TopBar from '../components/TopBar';
import LanguageSelector from '../components/LanguageSelector';

export default function ProfileDetails() {
  const { user, setUser } = useContext(UserContext);
  const { t } = useLanguage();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => { setUser(null); router.replace('/auth/login'); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <TopBar title="Profile" showBack onBack={() => router.back()} />
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Back" style={{ padding: 6 }}>
          <Ionicons name="chevron-back" size={22} color="#2d5016" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={() => router.push('/profileEdit')} accessibilityLabel="Edit Profile" style={{ padding: 6 }}>
          <Ionicons name="create-outline" size={22} color="#2d5016" />
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Name</Text>
        <Text style={styles.sectionValue}>{user?.full_name || 'User'}</Text>

        <Text style={[styles.sectionLabel, { marginTop: 14 }]}>Phone Number</Text>
        <Text style={styles.sectionValue}>{user?.number || 'N/A'}</Text>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>{t('auth.logout')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.languageCard}>
        <LanguageSelector />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 8 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#2d5016' },
  card: { backgroundColor: '#eef0f4', margin: 12, padding: 16, borderRadius: 16 },
  languageCard: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e0e0e0' },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#2d5016', letterSpacing: 0.2 },
  sectionValue: { fontSize: 18, fontWeight: '600', color: '#222', marginTop: 2 },
  logoutBtn: { alignSelf: 'center', backgroundColor: '#d32f2f', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12, marginTop: 20 },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  tileRow: { backgroundColor: '#f1f8f4', borderWidth: 1, borderColor: '#c8e6c9', paddingVertical: 16, paddingHorizontal: 14, borderRadius: 12, marginTop: 12, flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginHorizontal: 12 },
  tileLeft: { flexDirection:'row', alignItems:'center', gap: 10 },
  tileTitle: { color:'#2d5016', fontWeight:'700', fontSize: 16 },
});