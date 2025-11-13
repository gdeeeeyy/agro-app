import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { listAdmins, listConversations, listUsersBasic } from '../lib/database';
import { UserContext } from '../context/UserContext';

export default function ScanMessages() {
  const { user } = useContext(UserContext);
  const [rows, setRows] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersBasic, setUsersBasic] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const convs = await listConversations(Number(user.id)) as any[];
    setRows(convs || []);
    try { const as = await listAdmins(); setAdmins(as as any[]); } catch {}
    try { if (Number(user?.is_admin) === 3) { const ub = await listUsersBasic(); setUsersBasic(ub as any[]); } } catch {}
    // compute overall unread for support tile badge
    try {
      const db = await import('../lib/database');
      let total = 0;
      for (const c of convs||[]) {
        try {
          const msgs = await db.listMessages(Number(c.id)) as any[];
          const seenAt = await db.getConversationSeenAt(Number(c.id), Number(user.id));
          const unread = (msgs||[]).filter(m => Number(m.sender_id)!==Number(user.id) && (!seenAt || new Date(m.created_at).getTime() > new Date(seenAt).getTime())).length;
          if (unread > 0) total += 1;
        } catch {}
      }
      (global as any).__supportUnread = total;
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  useEffect(() => {
    // compute unread counts (client-side) after rows change
    (async ()=>{
      if (!user) return;
      try {
        const db = await import('../lib/database');
        const supportIds = admins.filter((a:any)=> Number(a.is_admin)===3).map((a:any)=> Number(a.id));
        const updated = await Promise.all((rows||[]).map(async (c:any) => {
          try {
            const msgs = await db.listMessages(Number(c.id)) as any[];
            const seenAt = await db.getConversationSeenAt(Number(c.id), Number(user.id));
            const unread = (msgs||[]).filter(m => Number(m.sender_id)!==Number(user.id) && (!seenAt || new Date(m.created_at).getTime() > new Date(seenAt).getTime())).length;
            return { ...c, _unread: unread };
          } catch { return { ...c, _unread: 0 }; }
        }));
        setRows(updated);
      } catch {}
    })();
  }, [rows.length, user?.id]);

  const nameFor = (ids: number[]) => {
    const me = Number(user?.id);
    const others = (ids||[]).filter(i => Number(i)!==me);
    if (others.length === 0) return `Conversation #${ids?.join('-')}`;
    const supportIds = admins.filter((a:any)=> Number(a.is_admin)===3).map((a:any)=> Number(a.id));
    const isSupport = Number(user?.is_admin) === 3;
    if (isSupport) {
      const endUsers = others.filter(id => !supportIds.includes(Number(id)));
      const names = endUsers.map(id => {
        const u = (usersBasic || []).find((x:any)=> Number(x.id)===Number(id));
        return u?.full_name || u?.number || `User ${id}`;
      });
      return names.join(', ') || `Conversation #${ids?.join('-')}`;
    }
    // Non-support user: label as Support if any support participant present
    const nameObjs = others.map(id => admins.find((a:any)=> Number(a.id)===Number(id)) || { id, full_name: `User ${id}`, is_admin: 0 });
    const hasSupport = nameObjs.some((a:any)=> Number(a.is_admin) === 3);
    if (hasSupport) return 'Support';
    const names = nameObjs.map((a:any)=> a.full_name || `User ${a.id}`);
    return names.join(', ');
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={()=> router.push(`/scan-messages/${item.id}`)}>
      <View style={{ flex:1 }}>
        <Text style={styles.title} numberOfLines={1}>{nameFor(item.participant_ids || [])}</Text>
        <Text style={styles.subline} numberOfLines={1}>{item.last_text || 'No messages yet'}</Text>
      </View>
      {!!item._unread && (
        <View style={styles.badge}><Text style={styles.badgeText}>{item._unread}</Text></View>
      )}
      <Ionicons name="chevron-forward" size={18} color="#2d5016" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#4caf50' }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assistance Messages</Text>
        <TouchableOpacity onPress={load}>
          <Ionicons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ padding: 16 }}><Text style={{ color:'#666' }}>Loading...</Text></View>
      ) : rows.length === 0 ? (
        <View style={{ padding: 16 }}><Text style={{ color:'#666' }}>No conversations yet</Text></View>
      ) : (
        <FlatList data={rows} renderItem={renderItem} keyExtractor={(i)=> String(i.id)} contentContainerStyle={{ padding: 12 }} />
      )}
      <SafeAreaView edges={['bottom']} style={{ backgroundColor:'#fff' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { backgroundColor: '#4caf50', paddingHorizontal: 12, paddingVertical: 10, flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight:'700' },
  card: { flexDirection:'row', alignItems:'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#c8e6c9', backgroundColor: '#f1f8f4', marginBottom: 12 },
  title: { color:'#2d5016', fontWeight:'800' },
  subline: { color:'#4e7c35', fontWeight:'600', fontSize: 12 },
  badge: { minWidth:18, height:18, borderRadius:9, backgroundColor:'#e53935', alignItems:'center', justifyContent:'center', paddingHorizontal: 4, marginRight: 8 },
  badgeText: { color:'#fff', fontSize:10, fontWeight:'800' },
});
