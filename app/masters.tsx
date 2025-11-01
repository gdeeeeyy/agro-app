import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Alert, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { addScanPlant, deleteScanPlant, getScanPlants } from '../lib/database';
import { UserContext } from '../context/UserContext';

export default function Masters() {
  const { user } = useContext(UserContext);
  const isAdmin = user?.is_admin === 1;
  const [plants, setPlants] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [nameTa, setNameTa] = useState('');

  const load = async () => {
    const rows = await getScanPlants() as any[];
    setPlants(rows);
  };

  useEffect(() => { load(); }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Masters</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Scanner Plants</Text>
        {isAdmin ? (
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Plant name (EN)"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Name (TA)"
              value={nameTa}
              onChangeText={setNameTa}
            />
            <TouchableOpacity
              style={styles.addBtn}
              onPress={async () => {
                if (!name.trim()) { Alert.alert('Error', 'Enter name'); return; }
                const id = await addScanPlant(name.trim(), nameTa.trim() || undefined);
                if (id) { setName(''); setNameTa(''); load(); }
              }}
            >
              <Ionicons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : null}
        <FlatList
          data={plants}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View style={styles.plantRow}>
              <Text style={{ flex: 1, color: '#2d5016', fontWeight: '600' }}>{item.name}</Text>
              {item.name_ta ? <Text style={{ flex: 1, color: '#666' }}>{item.name_ta}</Text> : null}
              {isAdmin && (
                <TouchableOpacity onPress={async () => { await deleteScanPlant(item.id); load(); }}>
                  <Ionicons name="trash" size={18} color="#f44336" />
                </TouchableOpacity>
              )}
            </View>
          )}
          ListEmptyComponent={<Text style={{ color: '#666' }}>No plants yet</Text>}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Other Masters</Text>
        <View style={{ gap: 10 }}>
          <TouchableOpacity style={styles.masterBtn} onPress={() => router.push('/(tabs)/admin')}>
            <Ionicons name="cube" size={18} color="#4caf50" />
            <Text style={styles.masterBtnText}>Manage Products</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.masterBtn} onPress={() => router.push('/(tabs)/adminOrders')}>
            <Ionicons name="clipboard" size={18} color="#4caf50" />
            <Text style={styles.masterBtnText}>Manage Orders</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#4caf50', paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  section: { backgroundColor: '#fff', margin: 12, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e0e0e0' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2d5016', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  input: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 10 },
  addBtn: { backgroundColor: '#4caf50', padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  plantRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  masterBtn: { backgroundColor: '#f1f8f4', borderWidth: 1, borderColor: '#c8e6c9', padding: 12, borderRadius: 8, flexDirection: 'row', gap: 8, alignItems: 'center' },
  masterBtnText: { color: '#2d5016', fontWeight: '600' },
});
