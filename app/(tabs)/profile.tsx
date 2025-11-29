import React, { useContext } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Alert, StyleSheet, Text, TouchableOpacity, View, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserContext } from '../../context/UserContext';
import { useLanguage } from '../../context/LanguageContext';
import { router } from 'expo-router';
import TopBar from '../../components/TopBar';

export default function Profile() {
  const { user } = useContext(UserContext);
  const { t } = useLanguage();

  const name = user?.full_name || 'User';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <TopBar title={t('account.title')} />
      <ScrollView contentContainerStyle={styles.menuContainer}>
        <Text style={styles.title}>{t('home.welcome')} {name}</Text>

        <TouchableOpacity style={styles.tileRow} onPress={() => router.push('/profileDetails')}>
          <View style={styles.tileLeft}>
            <Ionicons name="person-circle" size={20} color="#4caf50" />
            <Text style={styles.tileTitle}>{t('account.profile')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#2d5016" />
        </TouchableOpacity>

        {(user?.is_admin ?? 0) >= 1 && (
          <>
            <TouchableOpacity style={styles.tileRow} onPress={() => router.push('/masters')}>
              <View style={styles.tileLeft}>
                <Ionicons name="construct" size={20} color="#4caf50" />
                <Text style={styles.tileTitle}>{t('profile.masterControls')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#2d5016" />
            </TouchableOpacity>
            {(user?.is_admin ?? 0) === 2 && (
              <TouchableOpacity style={styles.tileRow} onPress={() => router.push('/(tabs)/adminOrders')}>
                <View style={styles.tileLeft}>
                  <Ionicons name="receipt" size={20} color="#4caf50" />
                  <Text style={styles.tileTitle}>{t('nav.manage')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#2d5016" />
              </TouchableOpacity>
            )}
          </>
        )}

        <TouchableOpacity style={styles.tileRow} onPress={() => router.push('/(tabs)/orders?from=profile')}>
          <View style={styles.tileLeft}>
            <Ionicons name="receipt" size={20} color="#4caf50" />
            <Text style={styles.tileTitle}>{t('orders.title')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#2d5016" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.tileRow} onPress={() => router.push('/contact')}>
          <View style={styles.tileLeft}>
            <Ionicons name="call" size={20} color="#4caf50" />
            <Text style={styles.tileTitle} numberOfLines={2}>{t('account.forSaleContact')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#2d5016" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tileRow}
          onPress={() => Linking.openURL('mailto:kvktvmalai91@gmail.com')}
        >
          <View style={styles.tileLeft}>
            <Ionicons name="mail" size={20} color="#4caf50" />
            <Text style={styles.tileTitle} numberOfLines={2}>{t('account.forSaleContact')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#2d5016" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  menuContainer: { padding: 12, paddingBottom: 24 },
  title: { fontSize: 24, fontWeight: '800', color: '#2d5016', marginBottom: 8 },
  tileRow: {
    backgroundColor: '#f1f8f4',
    borderWidth: 1,
    borderColor: '#c8e6c9',
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tileLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  tileTitle: { color: '#2d5016', fontWeight: '700', fontSize: 18, letterSpacing: 0.2, flexShrink: 1, flexWrap: 'wrap' },
});
