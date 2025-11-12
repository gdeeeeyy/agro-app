import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getPendingProducts, reviewProduct } from '../lib/database';
import { UserContext } from '../context/UserContext';

export default function PendingProducts() {
  const { user } = useContext(UserContext);
  const isMaster = (user?.is_admin ?? 0) === 2;
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = async () => {
    try { const list = await getPendingProducts() as any[]; setRows(list); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openDetails = (item: any) => { setSelected(item); setNote(''); setModalOpen(true); };

  const approve = async (id: number) => {
    try { await reviewProduct(id, 'approved', note.trim() || undefined, user?.id); setModalOpen(false); await load(); } catch { Alert.alert('Error','Approve failed'); }
  };
  const reject = async (id: number) => {
    try { await reviewProduct(id, 'rejected', note.trim() || undefined, user?.id); setModalOpen(false); await load(); } catch { Alert.alert('Error','Reject failed'); }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => openDetails(item)}>
      <View style={{ flexDirection:'row', gap: 12 }}>
        {item.image ? <Image source={{ uri: item.image }} style={styles.thumb} /> : null}
        <View style={{ flex:1 }}>
          <Text style={styles.title} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.meta} numberOfLines={1}>{item.keywords}</Text>
          <Text style={styles.meta}>Stock: {item.stock_available} • ₹{item.cost_per_unit}</Text>
        </View>
        <View style={styles.statusPill}><Text style={styles.statusText}>PENDING</Text></View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#4caf50' }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Product Requests</Text>
        <TouchableOpacity onPress={load}>
          <Ionicons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ padding: 20 }}><Text style={{ color:'#666' }}>Loading...</Text></View>
      ) : rows.length === 0 ? (
        <View style={{ padding: 20 }}><Text style={{ color:'#666' }}>No pending products</Text></View>
      ) : (
        <FlatList data={rows} renderItem={renderItem} keyExtractor={(i)=> String(i.id)} contentContainerStyle={{ padding: 12 }} />
      )}

      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=> setModalOpen(false)}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff' }} />
        <View style={{ padding: 16 }}>
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
            <Text style={{ fontSize: 18, fontWeight:'700' }}>Product Details</Text>
            <TouchableOpacity onPress={()=> setModalOpen(false)}><Ionicons name="close" size={22} color="#333" /></TouchableOpacity>
          </View>
          {selected && (
            <ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
              {selected.image ? <Image source={{ uri: selected.image }} style={{ width: '100%', height: 180, borderRadius: 8 }} /> : null}
              <Text style={{ marginTop: 10, fontWeight:'700', color:'#2d5016' }}>{selected.name}</Text>
              {selected.name_ta ? <Text style={{ color:'#2d5016' }}>{selected.name_ta}</Text> : null}
              <Text style={{ marginTop: 8, color:'#333' }}>{selected.details}</Text>
              {selected.details_ta ? <Text style={{ marginTop: 6, color:'#333' }}>{selected.details_ta}</Text> : null}

              <View style={{ marginTop: 12 }}>
                <Text style={{ color:'#2d5016', fontWeight:'700', marginBottom: 6 }}>Reviewer Note (optional)</Text>
                <TextInput style={styles.input} value={note} onChangeText={setNote} placeholder="Add a note" placeholderTextColor="#999" multiline />
              </View>

              {isMaster ? (
                <View style={{ flexDirection:'row', gap: 10, marginTop: 12 }}>
                  <TouchableOpacity style={[styles.btn, { backgroundColor:'#e8f5e9', borderColor:'#c8e6c9' }]} onPress={()=> approve(Number(selected.id))}>
                    <Ionicons name="checkmark" size={18} color="#2e7d32" />
                    <Text style={[styles.btnText,{ color:'#2e7d32' }]}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btn, { backgroundColor:'#fdecea', borderColor:'#f8d7da' }]} onPress={()=> reject(Number(selected.id))}>
                    <Ionicons name="close" size={18} color="#d32f2f" />
                    <Text style={[styles.btnText,{ color:'#d32f2f' }]}>Reject</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={{ marginTop: 12, color:'#666' }}>Only masters can approve or reject.</Text>
              )}
            </ScrollView>
          )}
        </View>
        <SafeAreaView edges={['bottom']} style={{ backgroundColor:'#fff' }} />
      </Modal>
      <SafeAreaView edges={['bottom']} style={{ backgroundColor:'#fff' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { backgroundColor: '#4caf50', paddingHorizontal: 12, paddingVertical: 10, flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight:'700' },
  card: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e0e0e0', backgroundColor: '#fff', marginBottom: 12 },
  thumb: { width: 64, height: 64, borderRadius: 8, backgroundColor:'#f1f1f1' },
  title: { fontWeight:'700', color:'#2d5016' },
  meta: { color:'#666', marginTop: 2 },
  statusPill: { alignSelf:'flex-start', backgroundColor:'#fff8e1', borderWidth:1, borderColor:'#ffe0b2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusText: { color:'#ff8f00', fontSize: 12, fontWeight:'700' },
  input: { borderWidth:1, borderColor:'#e0e0e0', borderRadius: 8, padding: 10, minHeight: 80, textAlignVertical:'top', backgroundColor:'#f9f9f9' },
  btn: { flexDirection:'row', alignItems:'center', gap:8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1 },
  btnText: { fontWeight:'700' },
});
