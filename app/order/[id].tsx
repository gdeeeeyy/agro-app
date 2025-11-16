import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getOrderItems, getOrderStatusHistory } from '../../lib/database';

export default function OrderDetailsPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);
  const [items, setItems] = useState<any[]>([]);
  const [history, setHistory] = useState<Array<{ status: string; note?: string; created_at: string }>>([]);

  useEffect(() => {
    (async () => {
      try { const its = await getOrderItems(orderId) as any[]; setItems(its || []); } catch {}
      try { const hist = await getOrderStatusHistory(orderId) as any[]; setHistory(Array.isArray(hist)? hist : []); } catch {}
    })();
  }, [orderId]);

  // Map statuses to timeline entries with timestamps
  const getTime = (wanted: string) => {
    const row = history.find(h => {
      const s = String(h.status||'').toLowerCase();
      if (wanted==='processed') return (s==='processed' || s==='processing');
      if (wanted==='dispatched') return (s==='dispatched' || s==='shipped' || s==='delivered');
      return s===wanted;
    });
    return row ? new Date(row.created_at) : null;
  };

  const tConfirmed = getTime('confirmed');
  const tProcessed = getTime('processed');
  const tDispatched = getTime('dispatched');

  const processedLabel = tDispatched ? 'Processed' : (tProcessed ? 'Processing' : 'Processing');

  const fmt = (d: Date | null) => d ? d.toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'numeric', minute:'2-digit' }) : 'Pending';

  return (
    <View style={styles.container}>
      <SafeAreaView />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order #{orderId}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
        <Text style={styles.sectionTitle}>Order Items</Text>
        {items.map(it => (
          <View key={it.id} style={styles.itemRow}>
            <Text style={{ color:'#2d5016', fontWeight:'700' }}>{it.product_name}</Text>
            <Text style={{ color:'#666' }}>Qty: {it.quantity}</Text>
          </View>
        ))}

        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Order Status</Text>
        <View style={styles.timeline}>
          {[{ key:'confirmed', label:'Confirmed', time:tConfirmed }, { key:'processed', label:processedLabel, time:tProcessed }, { key:'dispatched', label:'Dispatched', time:tDispatched }].map((step, idx) => (
            <View key={step.key} style={styles.timelineRow}>
              <View style={styles.timelineColIcon}>
                <View style={[styles.dot, (step.time ? styles.dotDone : styles.dotPending)]} />
                {idx<2 && <View style={[styles.line, (step.time ? styles.lineDone : styles.linePending)]} />}
              </View>
              <View style={styles.timelineColText}>
                <Text style={[styles.stepTitle]}>{step.label}</Text>
                <Text style={styles.meta}>{fmt(step.time)}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:'#fff' },
  header: { backgroundColor:'#4caf50', paddingHorizontal:12, paddingVertical:10, flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  headerTitle: { color:'#fff', fontSize:18, fontWeight:'700' },
  sectionTitle: { color:'#2d5016', fontWeight:'800', fontSize:16, marginBottom:8 },
  itemRow: { padding:12, borderWidth:1, borderColor:'#e0e0e0', borderRadius:8, backgroundColor:'#f9f9f9', marginBottom:8, flexDirection:'row', justifyContent:'space-between' },
  timeline: { marginTop: 6, paddingLeft: 4 },
  timelineRow: { flexDirection:'row', alignItems:'flex-start', marginBottom:12 },
  timelineColIcon: { width:24, alignItems:'center' },
  dot: { width:14, height:14, borderRadius:7, marginTop:6, borderWidth:2, borderColor:'#4caf50', backgroundColor:'transparent' },
  dotDone: { backgroundColor:'#4caf50', borderWidth:0 },
  dotPending: { backgroundColor:'transparent' },
  line: { width:2, flexGrow:1, marginTop:4 },
  lineDone: { backgroundColor:'#4caf50' },
  linePending: { backgroundColor:'#4caf50' },
  timelineColText: { flex:1, paddingLeft:8 },
  stepTitle: { fontSize:14, fontWeight:'700', color:'#2d5016' },
  meta: { fontSize:12, color:'#666', marginTop:2 },
});
