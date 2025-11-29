import { router } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserContext } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';
import { signIn, signUp } from '../lib/auth';

type AuthMode = 'login' | 'signup';

interface AuthScreenProps {
  initialMode?: AuthMode;
}

export default function AuthScreen({ initialMode = 'login' }: AuthScreenProps) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const isSignup = mode === 'signup';

  const [number, setNumber] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [langVisible, setLangVisible] = useState(false);

  const { setUser } = useContext(UserContext);
  const { t, currentLanguage, setLanguage } = useLanguage();

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const changeLang = async (lang: 'en' | 'ta') => {
    await setLanguage(lang);
    setLangVisible(false);
  };

  const handleSubmit = async () => {
    if (!number || !password || (isSignup && !fullName)) {
      setError(t('auth.fillFields'));
      return;
    }

    if (isSignup && password.length < 6) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = isSignup
        ? await signUp(number, password, fullName)
        : await signIn(number, password);

      const { user, error: authError } = result;

      if (authError || !user) {
        setError(authError || (isSignup ? 'Failed to create account' : 'Failed to sign in'));
        setLoading(false);
        return;
      }

      setUser(user);
      setLoading(false);
      router.replace('/(tabs)');
    } catch (e) {
      setError(isSignup ? 'Failed to create account' : 'Failed to sign in');
      setLoading(false);
    }
  };

  const switchMode = (next: AuthMode) => {
    if (next === mode) return;
    setMode(next);
    setError('');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Image source={require('../assets/images/icon.png')} style={styles.logo} />
        <Text style={styles.title}>Agriismart</Text>
        <Text style={styles.tagline}>Faith of the Farmers</Text>

        {/* Mode switcher */}
        <View style={styles.modeSwitcher}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'login' && styles.modeButtonActive]}
            onPress={() => switchMode('login')}
            disabled={loading}
          >
            <Text style={[styles.modeButtonText, mode === 'login' && styles.modeButtonTextActive]}>
              {t('auth.signin')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'signup' && styles.modeButtonActive]}
            onPress={() => switchMode('signup')}
            disabled={loading}
          >
            <Text style={[styles.modeButtonText, mode === 'signup' && styles.modeButtonTextActive]}>
              {t('auth.signup')}
            </Text>
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {isSignup && (
          <TextInput
            style={styles.input}
            placeholder={t('auth.fullname')}
            placeholderTextColor="#999"
            value={fullName}
            onChangeText={setFullName}
            editable={!loading}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder={t('auth.number')}
          placeholderTextColor="#999"
          value={number}
          onChangeText={setNumber}
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
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {isSignup ? t('auth.signup') : t('auth.signin')}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => switchMode(isSignup ? 'login' : 'signup')}
          disabled={loading}
        >
          <Text style={styles.link}>
            {isSignup ? (
              <>
                {t('auth.hasAccount')}{' '}
                <Text style={styles.linkBold}>{t('auth.signin')}</Text>
              </>
            ) : (
              <>
                {t('auth.noAccount')}{' '}
                <Text style={styles.linkBold}>{t('auth.signup')}</Text>
              </>
            )}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 7 }]}>
        <TouchableOpacity
          onPress={() => setLangVisible(true)}
          accessibilityLabel="Change Language"
          style={styles.langButton}
        >
          <Ionicons name="globe-outline" size={18} color="#4caf50" />
          <Text style={styles.langButtonText}>Language</Text>
        </TouchableOpacity>
      </View>

      {/* Language picker */}
      <Modal visible={langVisible} transparent animationType="fade" onRequestClose={() => setLangVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '80%', backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' }}>
            <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#333' }}>{t('language.selectLanguageTitle')}</Text>
              <TouchableOpacity onPress={() => setLangVisible(false)}>
                <Ionicons name="close" size={22} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 10 }}>
              <TouchableOpacity
                onPress={() => changeLang('en')}
                style={{ padding: 12, borderRadius: 8, borderWidth: 1, borderColor: currentLanguage === 'en' ? '#4caf50' : '#eee', backgroundColor: currentLanguage === 'en' ? '#f1f8f4' : '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}
              >
                <Text style={{ color: '#333', fontWeight: '600' }}>English</Text>
                {currentLanguage === 'en' ? <Ionicons name="checkmark-circle" size={20} color="#4caf50" /> : null}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => changeLang('ta')}
                style={{ padding: 12, borderRadius: 8, borderWidth: 1, borderColor: currentLanguage === 'ta' ? '#4caf50' : '#eee', backgroundColor: currentLanguage === 'ta' ? '#f1f8f4' : '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Text style={{ color: '#333', fontWeight: '600' }}>தமிழ்</Text>
                {currentLanguage === 'ta' ? <Ionicons name="checkmark-circle" size={20} color="#4caf50" /> : null}
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
    marginBottom: 4,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 16,
    fontWeight: '400',
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
  },
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#e8f5e9',
    borderRadius: 50,
    padding: 4,
    marginBottom: 20,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 50,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#4caf50',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d5016',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#c8e6c9',
    backgroundColor: '#f1f8f4',
  },
  langButtonText: {
    color: '#2d5016',
    fontWeight: '600',
    fontSize: 15,
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
