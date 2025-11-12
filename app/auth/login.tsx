import { router } from 'expo-router';
import React, { useContext, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserContext } from '../../context/UserContext';
import { useLanguage } from '../../context/LanguageContext';
import { signIn } from '../../lib/auth';

export default function Login() {
  const [number, setnumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setUser } = useContext(UserContext);
  const { t, currentLanguage, setLanguage } = useLanguage();
  const [langVisible, setLangVisible] = useState(false);

  const changeLang = async (lang: 'en' | 'ta') => {
    await setLanguage(lang);
    setLangVisible(false);
  };

  const handleLogin = async () => {
    if (!number || !password) {
      setError(t('auth.fillFields'));
      return;
    }

    setLoading(true);
    setError('');

    const { user, error: authError } = await signIn(number, password);

    if (authError) {
      setError(authError);
      setLoading(false);
      return;
    }

    setUser(user);
    setLoading(false);
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Image source={require('../../assets/images/icon.png')} style={styles.logo} />
        <Text style={styles.title}>Agriismart - Faith of the Farmers</Text>

        <View style={styles.langRow}>
          <TouchableOpacity onPress={() => setLangVisible(true)} accessibilityLabel="Change Language" style={styles.actionBtn}>
            <Ionicons name="globe-outline" size={22} color="#4caf50" />
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder={t('auth.number')}
          placeholderTextColor="#999"
          value={number}
          onChangeText={setnumber}
          autoCapitalize="none"
          keyboardType="number-pad"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder={t('auth.password')}
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t('auth.signin')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/auth/signup')}
          disabled={loading}
        >
          <Text style={styles.link}>
            {t('auth.noAccount')} <Text style={styles.linkBold}>{t('auth.signup')}</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Language modal */}
      <Modal visible={langVisible} transparent animationType="fade" onRequestClose={() => setLangVisible(false)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.3)', justifyContent:'center', alignItems:'center' }}>
          <View style={{ width: '80%', backgroundColor:'#fff', borderRadius: 12, overflow:'hidden' }}>
            <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
              <Text style={{ fontSize:16, fontWeight:'700', color:'#333' }}>{t('language.selectLanguageTitle')}</Text>
              <TouchableOpacity onPress={() => setLangVisible(false)}>
                <Ionicons name="close" size={22} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 10 }}>
              <TouchableOpacity onPress={() => changeLang('en')} style={{ padding: 12, borderRadius: 8, borderWidth: 1, borderColor: currentLanguage==='en'?'#4caf50':'#eee', backgroundColor: currentLanguage==='en'?'#f1f8f4':'#fff', flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom: 8 }}>
                <Text style={{ color:'#333', fontWeight:'600' }}>English</Text>
                {currentLanguage==='en' ? <Ionicons name="checkmark-circle" size={20} color="#4caf50" /> : null}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => changeLang('ta')} style={{ padding: 12, borderRadius: 8, borderWidth: 1, borderColor: currentLanguage==='ta'?'#4caf50':'#eee', backgroundColor: currentLanguage==='ta'?'#f1f8f4':'#fff', flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
                <Text style={{ color:'#333', fontWeight:'600' }}>தமிழ்</Text>
                {currentLanguage==='ta' ? <Ionicons name="checkmark-circle" size={20} color="#4caf50" /> : null}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
    borderRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
  },
  langRow: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  actionBtn: {
    padding: 6,
  },
  subtitle: {
    fontSize: 16,
    color: '#111',
    marginBottom: 40,
  },
  error: {
    color: '#d32f2f',
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
    textAlign: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 16,
    color: '#000',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  button: {
    width: '100%',
    backgroundColor: '#4caf50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#a5d6a7',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  link: {
    fontSize: 15,
    color: '#666',
  },
  linkBold: {
    color: '#4caf50',
    fontWeight: '600',
  },
});
