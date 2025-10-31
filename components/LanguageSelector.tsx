import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';

export default function LanguageSelector() {
  const { currentLanguage, setLanguage, t } = useLanguage();

  const handleLanguageChange = async (language: 'en' | 'ta') => {
    try {
      await setLanguage(language);
      Alert.alert(t('common.success'), t('language.changed'));
    } catch (error) {
      Alert.alert(t('common.error'), 'Failed to change language');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('language.title')}</Text>
      
      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={[
            styles.languageOption,
            currentLanguage === 'en' && styles.selectedOption
          ]}
          onPress={() => handleLanguageChange('en')}
        >
          <Text style={[
            styles.languageText,
            currentLanguage === 'en' && styles.selectedText
          ]}>
            {t('language.english')}
          </Text>
          {currentLanguage === 'en' && (
            <Ionicons name="checkmark-circle" size={20} color="#4caf50" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.languageOption,
            currentLanguage === 'ta' && styles.selectedOption
          ]}
          onPress={() => handleLanguageChange('ta')}
        >
          <Text style={[
            styles.languageText,
            currentLanguage === 'ta' && styles.selectedText
          ]}>
            {t('language.tamil')}
          </Text>
          {currentLanguage === 'ta' && (
            <Ionicons name="checkmark-circle" size={20} color="#4caf50" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 12,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedOption: {
    backgroundColor: '#f1f8f4',
    borderColor: '#4caf50',
  },
  languageText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  selectedText: {
    color: '#4caf50',
    fontWeight: '600',
  },
});