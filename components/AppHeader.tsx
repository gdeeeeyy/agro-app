import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import CartIcon from './CartIcon';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserContext } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';
import { getNotifications } from '../lib/database';
import { onNotificationsChanged } from '../lib/notifBus';

export default function AppHeader() {
  const { user } = React.useContext(UserContext);
  const { currentLanguage } = useLanguage();
  const [unread, setUnread] = React.useState(0);

  const keyFor = (uid?: number|null) => `@agro_last_notif_time_${uid?String(uid):'all'}`;
  const refreshNotifCount = React.useCallback(async () => {
    try {
      const rows = await getNotifications(user?.id || undefined) as any[];
      const last = await AsyncStorage.getItem(keyFor(user?.id || null));
      const lastTs = last ? Date.parse(last) : 0;
      const count = rows.filter(r => {
        const ts = Date.parse(r.created_at || '') || 0;
        return ts > lastTs;
      }).length;
      setUnread(count);
    } catch {}
  }, [user?.id]);

  React.useEffect(() => {
    let tmr: any;
    const off = onNotificationsChanged(refreshNotifCount);
    (async () => {
      await refreshNotifCount();
      tmr = setInterval(refreshNotifCount, 30000);
    })();
    return () => { if (tmr) clearInterval(tmr); off && off(); };
  }, [refreshNotifCount]);

  const openNotifications = async () => {
    try { await AsyncStorage.setItem(keyFor(user?.id || null), new Date().toISOString()); } catch {}
    setUnread(0);
    router.push('/notifications');
  };

  return (
    <View>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#4caf50' }} />
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Image source={require('../assets/images/icon.png')} style={styles.logo} />
          <Text style={styles.title} numberOfLines={1}>{currentLanguage === 'ta' ? 'அக்ரிஸ்மார்ட்' : 'Agriismart'}</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={openNotifications} accessibilityLabel="Notifications" style={[styles.actionBtn, { position:'relative' }]}>
            <Ionicons name="notifications" size={22} color="#fff" />
            {unread > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread > 9 ? '9+' : String(unread)}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(tabs)/cart')} accessibilityLabel="Open Cart" style={styles.actionBtn}>
            <CartIcon size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#4caf50', paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 32, height: 32, borderRadius: 8 },
  title: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtn: { padding: 6 },
  badge: { position:'absolute', top: 0, right: 0, backgroundColor:'#f44336', minWidth:16, height:16, borderRadius:8, alignItems:'center', justifyContent:'center' },
  badgeText: { color:'#fff', fontSize: 10, fontWeight:'800', paddingHorizontal: 3 },
});
