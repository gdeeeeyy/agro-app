import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import CartIcon from './CartIcon';
import { useLanguage } from '../context/LanguageContext';

export default function AppHeader() {
  const { currentLanguage, setLanguage, t } = useLanguage();
  const [langVisible, setLangVisible] = React.useState(false);
  const changeLang = async (lang: 'en'|'ta') => { await setLanguage(lang); setLangVisible(false); };
  return (
    <View>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#4caf50' }} />
      {Platform.OS === 'android' ? <View style={{ height: 20, backgroundColor: '#4caf50' }} /> : null}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Image source={require('../assets/images/icon.png')} style={styles.logo} />
          <Text style={styles.title} numberOfLines={1}>Agriismart</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => setLangVisible(true)} accessibilityLabel="Change Language" style={styles.actionBtn}>
            <Ionicons name="globe-outline" size={22} color="#fff" />
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
});
