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
  Switch,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const [showPassword, setShowPassword] = useState(false);

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
        setError(authError || 'Authentication failed');
        setLoading(false);
        return;
      }

      // Always persist login on this device so the user stays signed in.
      await setUser(user, { persist: true });
      setLoading(false);
      router.replace('/(tabs)');
    } catch {
      setError('Authentication failed');
      setLoading(false);
    }
  };

  const switchMode = (next: AuthMode) => {
    if (next === mode) return;
    setMode(next);
    setError('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1 }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoidingView}
          >
            <View style={styles.content}>
              <Image
                source={require('../assets/images/icon.png')}
                style={styles.appIcon}
                resizeMode="contain"
              />

              <Image
                source={require('../assets/images/typo-logo.jpeg')}
                style={styles.typoLogo}
                resizeMode="contain"
              />

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
                keyboardType="number-pad"
                editable={!loading}
              />

              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder={t('auth.password')}
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={22}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>


              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : (
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
                  {isSignup ? t('auth.hasAccount') : t('auth.noAccount')}{' '}
                  <Text style={styles.linkBold}>
                    {isSignup ? t('auth.signin') : t('auth.signup')}
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>

          {/* 🔒 FIXED LANGUAGE FOOTER */}
          <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
            <TouchableOpacity style={styles.langButton} onPress={() => setLangVisible(true)}>
              <Ionicons name="globe-outline" size={18} color="#4caf50" />
              <Text style={styles.langButtonText}>Language</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>

      {/* 🌍 LANGUAGE MODAL */}
      <Modal visible={langVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('language.selectLanguageTitle')}</Text>
              <TouchableOpacity onPress={() => setLangVisible(false)}>
                <Ionicons name="close" size={22} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.langItem, currentLanguage === 'en' && styles.langItemActive]}
              onPress={() => changeLang('en')}
            >
              <Text>English</Text>
              {currentLanguage === 'en' && <Ionicons name="checkmark-circle" size={18} color="#4caf50" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.langItem, currentLanguage === 'ta' && styles.langItemActive]}
              onPress={() => changeLang('ta')}
            >
              <Text>தமிழ்</Text>
              {currentLanguage === 'ta' && <Ionicons name="checkmark-circle" size={18} color="#4caf50" />}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  keyboardAvoidingView: { flex: 1 },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    paddingBottom: 120,
  },

  appIcon: { width: 100, height: 100, marginBottom: 10, borderRadius: 20 },
  typoLogo: { width: '80%', height: 80, marginBottom: 30 },

  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#e8f5e9',
    borderRadius: 50,
    padding: 4,
    marginBottom: 20,
  },

  modeButton: { flex: 1, paddingVertical: 8, borderRadius: 50, alignItems: 'center' },
  modeButtonActive: { backgroundColor: '#4caf50' },
  modeButtonText: { fontWeight: '600', color: '#2d5016' },
  modeButtonTextActive: { color: '#fff' },

  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    color: '#333',
  },

  passwordContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    marginBottom: 16,
    paddingRight: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 8,
  },

  rememberRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  rememberLabel: { marginLeft: 8 },

  button: {
    width: '100%',
    backgroundColor: '#4caf50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: { backgroundColor: '#a5d6a7' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },

  link: { color: '#666' },
  linkBold: { color: '#4caf50', fontWeight: '600' },

  error: {
    width: '100%',
    backgroundColor: '#ffebee',
    color: '#d32f2f',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    textAlign: 'center',
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: '#fff',
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
  langButtonText: { fontWeight: '600', color: '#2d5016' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: { fontWeight: '700' },

  langItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  langItemActive: {
    borderColor: '#4caf50',
    backgroundColor: '#f1f8f4',
  },
});
