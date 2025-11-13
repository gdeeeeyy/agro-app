import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { listMessages, sendMessage, listConversations, listAdmins, listUsersBasic, getPendingConversationByTempId, queueOutboxMessage, flushOutbox } from '../../lib/database';
import { UserContext } from '../../context/UserContext';

export default function ConversationThread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useContext(UserContext);
  const [rows, setRows] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('Conversation');
  const [admins, setAdmins] = useState<any[]>([]);
  const [usersBasic, setUsersBasic] = useState<any[]>([]);
  const listRef = useRef<FlatList>(null);

  const load = async () => {
    try {
      const convIdNum = Number(id);
      if (!Number.isFinite(convIdNum)) {
        setRows([]);
      } else {
        const msgs = await listMessages(convIdNum) as any[];
        setRows(Array.isArray(msgs) ? msgs : []);
      }
    } catch {
      setRows([]);
    }
    setLoading(false);
    setTimeout(()=> listRef.current?.scrollToEnd({ animated: true }), 50);
  };

  useEffect(() => { load(); (async ()=>{
    try { const as = await listAdmins(); setAdmins(as as any[]); } catch {}
    try { const ub = await listUsersBasic(); setUsersBasic(ub as any[]); } catch {}
    try {
      const meSupport = Number(user?.is_admin) === 3;
      const convs = await listConversations(Number(user?.id||0)) as any[];
      const conv = (convs||[]).find(c => Number(c.id)===Number(id));
      if (conv) {
        const pids = (conv.participant_ids||[]).map((x:any)=> Number(x));
        if (meSupport) {
          const supportIds = (admins||[]).filter((a:any)=> Number(a.is_admin)===3).map((a:any)=> Number(a.id));
          const endUsers = pids.filter(pid => pid !== Number(user?.id) && !supportIds.includes(pid));
          const label = endUsers.map(uid => {
            const u = (usersBasic||[]).find((x:any)=> Number(x.id)===Number(uid));
            return u?.full_name || u?.number || `User ${uid}`;
          }).join(', ');
          if (label) setTitle(label);
        } else {
          setTitle('Support');
        }
      }
    } catch {}
  })(); }, [id]);

  useEffect(() => {
    // mark as seen when opening for real conv ids only
    (async () => {
      if (!user?.id) return;
      const convIdNum = Number(id);
      if (!Number.isFinite(convIdNum)) return;
      try {
        const db = await import('../../lib/database');
        await db.markConversationSeen(convIdNum, Number(user.id));
      } catch {}
    })();
  }, [id, user?.id]);

  const onSend = async () => {
    if (!text.trim() || !user) return;
    const payload = text.trim();
    setText('');
    // optimistic bubble
    const tempId = `temp-${Date.now()}`;
    const optimistic = { id: tempId, sender_id: Number(user.id), text: payload, created_at: new Date().toISOString(), _pending: true } as any;
    setRows(prev => [...prev, optimistic]);
    setTimeout(()=> listRef.current?.scrollToEnd({ animated: true }), 10);
    const convIdNum = Number(id);
    if (Number.isFinite(convIdNum)) {
      const res = await sendMessage(convIdNum, Number(user.id), payload);
      if (res && (res as any).queued) {
        try { await flushOutbox(); } catch {}
      } else if (res) {
        await load();
      } else {
        setRows(prev => prev.map(m => (m.id===tempId ? { ...m, _pending: false, _failed: true } : m)));
      }
    } else {
      // temp conversation: queue with negative pending id
      try {
        const pend = await getPendingConversationByTempId(String(id));
        if (pend && pend.id) {
          await queueOutboxMessage(-Number(pend.id), Number(user.id), payload);
          await flushOutbox();
        } else {
          setRows(prev => prev.map(m => (m.id===tempId ? { ...m, _pending: false, _failed: true } : m)));
        }
      } catch {
        setRows(prev => prev.map(m => (m.id===tempId ? { ...m, _pending: false, _failed: true } : m)));
      }
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const mine = Number(item.sender_id) === Number(user?.id);
    const ts = item.created_at ? new Date(item.created_at) : null;
    const timeStr = ts ? `${ts.toLocaleDateString()} ${ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '';
    const statusText = item?._failed ? 'failed' : (item?._pending ? 'sending...' : '');
    const timeLabel = timeStr ? (statusText ? `${timeStr} • ${statusText}` : timeStr) : '';
    return (
      <View style={[styles.bubbleRow, mine ? { justifyContent:'flex-end' } : { justifyContent:'flex-start' }]}>
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther, item._failed ? { borderColor:'#e53935', borderWidth:1 } : null]}>
          <Text style={styles.bubbleText}>{item.text}</Text>
          {timeLabel ? <Text style={[styles.timeText, item._failed ? { color:'#e53935' } : null]}>{timeLabel}</Text> : null}
        </View>
      </View>
    );
  };

  useEffect(() => {
    const iv = setInterval(async ()=> { try { const db = await import('../../lib/database'); const n = await db.flushOutbox(); if (n>0) await load(); } catch {} }, 15000);
    return () => clearInterval(iv);
  }, [id]);

  return (
    <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={{ flex:1 }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#4caf50' }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <TouchableOpacity onPress={load}>
          <Ionicons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList ref={listRef} data={rows} renderItem={renderItem} keyExtractor={(i)=> String(i.id)} contentContainerStyle={{ padding: 12 }} onContentSizeChange={()=> listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={!loading ? (<View style={{ padding: 16, alignItems:'center' }}><Text style={{ color:'#666' }}>No messages yet</Text></View>) : null}
      />

      <View style={styles.inputRow}>
        <TextInput style={styles.input} value={text} onChangeText={setText} placeholder="Type a message" placeholderTextColor="#999" />
        <TouchableOpacity style={[styles.sendBtn, { marginRight: 8 }]} onPress={async ()=>{
          try {
            const db = await import('../../lib/database');
            const scans = await db.getAllPlants(Number(user?.id||0));
            if (!Array.isArray(scans) || scans.length===0) return;
            const latest = scans[0];
            const msg = typeof latest.result === 'string' ? latest.result : JSON.stringify(latest.result);
            setText(prev => prev ? `${prev}\n\n${msg}` : msg);
          } catch {}
        }}>
          <Ionicons name="attach" size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.sendBtn} onPress={onSend}>
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
      <SafeAreaView edges={['bottom']} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#4caf50', paddingHorizontal: 12, paddingVertical: 10, flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  headerTitle: { color:'#fff', fontSize: 18, fontWeight:'700' },
  inputRow: { flexDirection:'row', alignItems:'center', gap:8, padding: 12, borderTopWidth:1, borderTopColor:'#e0e0e0', backgroundColor:'#fff' },
  input: { flex:1, backgroundColor:'#fff', borderWidth:1, borderColor:'#e0e0e0', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 10 },
  sendBtn: { backgroundColor:'#4caf50', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleRow: { flexDirection:'row', marginBottom: 8 },
  bubble: { maxWidth:'80%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  bubbleMine: { backgroundColor:'#DCF8C6', alignSelf:'flex-end' },
  bubbleOther: { backgroundColor:'#FFFFFF', alignSelf:'flex-start', borderWidth:1, borderColor:'#eee' },
  bubbleText: { color:'#2d5016' },
  timeText: { color:'#4e7c35', fontSize: 10, marginTop: 4, alignSelf:'flex-end' },
});
