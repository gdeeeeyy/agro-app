// router imported once below
import React, { useContext } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserContext } from '../../context/UserContext';
import { router } from 'expo-router';
import { useLanguage } from '../../context/LanguageContext';
import AppHeader from '../../components/AppHeader';

export default function Profile() {
  const { user, setUser } = useContext(UserContext);
  const { t } = useLanguage();

  const handleLogout = () => {
    Alert.alert(
      t('auth.logout'),
      'Are you sure you want to logout?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('auth.logout'),
          style: 'destructive',
          onPress: () => {
            setUser(null);
            router.replace('/auth/login');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader />


      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 10 }}>
        <View style={styles.infoCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Ionicons name="person-circle" size={24} color="#4caf50" />
          <Text style={[styles.value]}>{t('account.profile')}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Ionicons name="id-card" size={18} color="#99a598" />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{t('auth.fullname')}</Text>
              <Text style={styles.value}>{user?.full_name || 'N/A'}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="call" size={18} color="#99a598" />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{t('auth.number')}</Text>
              <Text style={styles.value}>{user?.number || 'N/A'}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: '#FFD54F' }]} onPress={() => router.push('/(tabs)/orders')}>
          <Text style={[styles.logoutButtonText, { color: '#333' }]}>{t('nav.orders')}</Text>
        </TouchableOpacity>

        {user?.is_admin === 1 && (
          <TouchableOpacity style={[styles.logoutButton, { backgroundColor: '#4caf50', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }]} onPress={() => router.push('/masters')}>
            <Ionicons name="construct" size={20} color="#fff" />
            <Text style={[styles.logoutButtonText]}>{t('profile.masterControls')}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: '#d32f2f' }]} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>{t('auth.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4caf50',
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 12,
    borderRadius: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  logoutButton: {
    backgroundColor: '#d32f2f',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
