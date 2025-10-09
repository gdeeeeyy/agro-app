import { router } from 'expo-router';
import React, { useContext } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { UserContext } from '../../context/UserContext';
import { useTranslation } from 'react-i18next';
import { saveLanguage } from '../../lib/i18n';

export default function Profile() {
  const { user, setUser } = useContext(UserContext);
  const { t, i18n } = useTranslation();

  const handleLogout = () => {
    Alert.alert(
      t('profile.logout'),
      'Are you sure you want to logout?',
      [
        { text: t('home.cancel'), style: 'cancel' },
        {
          text: t('profile.logout'),
          style: 'destructive',
          onPress: () => {
            setUser(null);
            router.replace('/auth/login');
          },
        },
      ]
    );
  };

  const changeLanguage = async (lang: string) => {
    await saveLanguage(lang);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>👤</Text>
        <Text style={styles.headerTitle}>{t('profile.title')}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.label}>Full Name</Text>
          <Text style={styles.value}>{user?.full_name || 'N/A'}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.label}>{t('auth.email')}</Text>
          <Text style={styles.value}>{user?.email || 'N/A'}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.label}>Member Since</Text>
          <Text style={styles.value}>
            {user?.created_at
              ? new Date(user.created_at).toLocaleDateString()
              : 'N/A'}
          </Text>
        </View>

        <View style={styles.languageCard}>
          <Text style={styles.label}>{t('common.language')}</Text>
          <View style={styles.languageButtons}>
            <TouchableOpacity
              style={[
                styles.languageButton,
                i18n.language === 'en' && styles.languageButtonActive,
              ]}
              onPress={() => changeLanguage('en')}
            >
              <Text
                style={[
                  styles.languageButtonText,
                  i18n.language === 'en' && styles.languageButtonTextActive,
                ]}
              >
                {t('common.english')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.languageButton,
                i18n.language === 'ta' && styles.languageButtonActive,
              ]}
              onPress={() => changeLanguage('ta')}
            >
              <Text
                style={[
                  styles.languageButtonText,
                  i18n.language === 'ta' && styles.languageButtonTextActive,
                ]}
              >
                {t('common.tamil')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>{t('profile.logout')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4caf50',
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 60,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  logoutButton: {
    backgroundColor: '#d32f2f',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  languageCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  languageButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  languageButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4caf50',
    alignItems: 'center',
  },
  languageButtonActive: {
    backgroundColor: '#4caf50',
  },
  languageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4caf50',
  },
  languageButtonTextActive: {
    color: '#fff',
  },
});
