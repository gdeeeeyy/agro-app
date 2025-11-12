import React, { useContext, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { UserContext } from '../context/UserContext';
import { router } from 'expo-router';
import TopBar from '../components/TopBar';

export default function ProfileEdit() {
  const { user, setUser } = useContext(UserContext);
  const [name, setName] = useState(user?.full_name || '');
  const [number, setNumber] = useState(user?.number || '');

  const onSave = async () => {
    if (!name.trim() || !number.trim()) {
      Alert.alert('Invalid', 'Please fill both name and phone number');
      return;
    }
    await setUser({ ...(user as any), full_name: name.trim(), number: number.trim() });
    Alert.alert('Saved', 'Profile updated');
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <TopBar title="Edit Profile" showBack onBack={() => router.back()} />
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Back" style={{ padding: 6 }}>
          <Ionicons name="chevron-back" size={22} color="#2d5016" />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Profile</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="#999" />

        <Text style={[styles.label, { marginTop: 12 }]}>Phone Number</Text>
        <TextInput style={styles.input} value={number} onChangeText={setNumber} keyboardType="number-pad" placeholder="10-digit number" placeholderTextColor="#999" />

        <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal: 12, marginTop: 4 },
  title: { fontSize: 24, fontWeight: '800', color: '#2d5016' },
  card: { backgroundColor: '#eef0f4', margin: 12, padding: 16, borderRadius: 16 },
  label: { fontSize: 14, color: '#666', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, padding: 12, fontSize: 16 },
  saveBtn: { alignSelf: 'center', backgroundColor: '#4caf50', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 18, marginTop: 18 },
  saveText: { fontSize: 18, fontWeight: '800', color: '#fff' },
});
