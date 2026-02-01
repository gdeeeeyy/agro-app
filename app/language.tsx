import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import LanguageSelector from '../components/LanguageSelector';
import { useLanguage } from '../context/LanguageContext';
import { UserContext } from '../context/UserContext';

export default function LanguageScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useContext(UserContext);

  const onContinue = () => {
    router.replace(user ? '/(tabs)' : '/auth/login');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Text style={styles.heading}>{t('language.selectLanguage')}</Text>
      <LanguageSelector />
      <TouchableOpacity style={styles.cta} onPress={onContinue}>
        <Text style={styles.ctaText}>{t('common.next')}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  cta: {
    marginTop: 24,
    backgroundColor: '#4caf50',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
