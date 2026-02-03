import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useLanguage } from '../../context/LanguageContext';
import { listImprovedCategories } from '../../lib/database';

export default function ImprovedTechnologiesHome() {
  const { currentLanguage } = useLanguage();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const cats = await listImprovedCategories();
      const arr = Array.isArray(cats) ? cats : [];
      // Sort categories alphabetically by display name
      const sorted = arr.sort((a, b) => {
        const labelA = labelForCategory(a).toLowerCase();
        const labelB = labelForCategory(b).toLowerCase();
        return labelA.localeCompare(labelB);
      });
      setCategories(sorted);
    } catch {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const labelForCategory = (c: any) => {
    let labelEn = c.name_en;
    const labelTa = c.name_ta;
    if (c.slug === 'agronomy') labelEn = 'Agronomy crops';
    else if (c.slug === 'horticulture') labelEn = 'Horticulture crops';
    else if (c.slug === 'animal') labelEn = 'Animal Husbandary';
    else if (c.slug === 'post-harvest') labelEn = 'Post Harvest technologies';
    return currentLanguage === 'ta' && labelTa ? labelTa : labelEn;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={{ backgroundColor: '#4caf50' }}>
        {Platform.OS === 'android' ? <View style={{ height: 20, backgroundColor: '#4caf50' }} /> : null}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{currentLanguage === 'ta' ? 'மேம்படுத்திய தொழில்நுட்பங்கள்' : 'Improved Technologies'}</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: '#2d5016' }}>
          {currentLanguage === 'ta' ? 'வகைகள்' : 'Categories'}
        </Text>
        <Text style={{ marginTop: 4, color: '#666', fontSize: 13 }}>
          {currentLanguage === 'ta' ? 'மேம்படுத்திய முறைகளை அறிய ஒரு வகையைத் தேர்ந்தெடுக்கவும்.' : 'Choose a category to explore improved practices.'}
        </Text>

        {loading ? (
          <View style={{ marginTop: 16 }}>
            <ActivityIndicator color="#4caf50" />
          </View>
        ) : categories.length === 0 ? (
          <Text style={{ marginTop: 16, color: '#666' }}>{currentLanguage === 'ta' ? 'எந்த வகைகளும் கிடைக்கவில்லை.' : 'No categories available.'}</Text>
        ) : (
          <View style={{ marginTop: 12 }}>
            {categories.map((c: any) => {
              const label = labelForCategory(c);
              return (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => router.push(`/improved-technologies/${c.slug}`)}
                  style={styles.categoryRow}
                >
                  <Text style={styles.categoryRowText} numberOfLines={2}>{label}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#4caf50" />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  categoryRow: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryRowText: {
    color: '#2d5016',
    fontWeight: '700',
    fontSize: 15,
    flex: 1,
    marginRight: 12,
  },
});
