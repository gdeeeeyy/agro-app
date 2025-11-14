import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import CartIcon from './CartIcon';
import { useLanguage } from '../context/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserContext } from '../context/UserContext';
import { getNotifications } from '../lib/database';
import { onNotificationsChanged } from '../lib/notifBus';

export default function AppHeader() {
  const { currentLanguage, setLanguage, t } = useLanguage();
  const { user } = React.useContext(UserContext);
  const [langVisible, setLangVisible] = React.useState(false);
  const [unread, setUnread] = React.useState(0);
  const changeLang = async (lang: 'en'|'ta') => { await setLanguage(lang); setLangVisible(false); };

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
          <Text style={styles.title} numberOfLines={1}>Agriismart</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => setLangVisible(true)} accessibilityLabel="Change Language" style={styles.actionBtn}>
            <Ionicons name="globe-outline" size={22} color="#fff" />
          </TouchableOpacity>
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

      <Modal visible={langVisible} transparent animationType="fade" onRequestClose={() => setLangVisible(false)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.3)', justifyContent:'center', alignItems:'center' }}>
          <View style={{ width: '80%', backgroundColor:'#fff', borderRadius: 12, overflow:'hidden' }}>
            <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
              <Text style={{ fontSize:16, fontWeight:'700', color:'#333' }}>{t('language.selectLanguageTitle')}</Text>
              <TouchableOpacity onPress={() => setLangVisible(false)}>
                <Ionicons name="close" size={22} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 10 }}>
              <TouchableOpacity onPress={() => changeLang('en')} style={{ padding: 12, borderRadius: 8, borderWidth: 1, borderColor: currentLanguage==='en'?'#4caf50':'#eee', backgroundColor: currentLanguage==='en'?'#f1f8f4':'#fff', flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom: 8 }}>
                <Text style={{ color:'#333', fontWeight:'600' }}>English</Text>
                {currentLanguage==='en' ? <Ionicons name="checkmark-circle" size={20} color="#4caf50" /> : null}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => changeLang('ta')} style={{ padding: 12, borderRadius: 8, borderWidth: 1, borderColor: currentLanguage==='ta'?'#4caf50':'#eee', backgroundColor: currentLanguage==='ta'?'#f1f8f4':'#fff', flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
                <Text style={{ color:'#333', fontWeight:'600' }}>தமிழ்</Text>
                {currentLanguage==='ta' ? <Ionicons name="checkmark-circle" size={20} color="#4caf50" /> : null}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
