import React, { useContext } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Alert, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserContext } from '../../context/UserContext';
import { router } from 'expo-router';
import TopBar from '../../components/TopBar';

export default function Profile() {
  const { user } = useContext(UserContext);

  const name = user?.full_name || 'User';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <TopBar title="Account" />
      <ScrollView contentContainerStyle={styles.menuContainer}>
        <Text style={styles.title}>Mr. {name}</Text>

        <TouchableOpacity style={styles.tileRow} onPress={() => router.push('/profileDetails')}>
          <View style={styles.tileLeft}>
            <Ionicons name="person-circle" size={20} color="#4caf50" />
            <Text style={styles.tileTitle}>Profile</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#2d5016" />
        </TouchableOpacity>

        {(user?.is_admin ?? 0) >= 1 && (
          <>
            <TouchableOpacity style={styles.tileRow} onPress={() => router.push('/masters')}>
              <View style={styles.tileLeft}>
                <Ionicons name="construct" size={20} color="#4caf50" />
                <Text style={styles.tileTitle}>Master</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#2d5016" />
            </TouchableOpacity>
            {(user?.is_admin ?? 0) === 2 && (
              <TouchableOpacity style={styles.tileRow} onPress={() => router.push('/(tabs)/adminOrders')}>
                <View style={styles.tileLeft}>
                  <Ionicons name="receipt" size={20} color="#4caf50" />
                  <Text style={styles.tileTitle}>Manage Orders</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#2d5016" />
              </TouchableOpacity>
            )}
          </>
        )}

        <TouchableOpacity style={styles.tileRow} onPress={() => router.push('/(tabs)/orders?from=profile')}>
          <View style={styles.tileLeft}>
            <Ionicons name="receipt" size={20} color="#4caf50" />
            <Text style={styles.tileTitle}>Order history</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#2d5016" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.tileRow} onPress={() => router.push('/contact')}>
          <View style={styles.tileLeft}>
            <Ionicons name="call" size={20} color="#4caf50" />
            <Text style={styles.tileTitle}>Contact us</Text>
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
  tileLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tileTitle: { color: '#2d5016', fontWeight: '700', fontSize: 18, letterSpacing: 0.2 },
});
