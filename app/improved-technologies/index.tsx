import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { listImprovedCategories } from '../../lib/database';
import { useLanguage } from '../../context/LanguageContext';
import AppHeader from '../../components/AppHeader';

export default function ImprovedTechnologiesHome() {
  const { currentLanguage } = useLanguage();
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const rows = await listImprovedCategories();
        setCategories(Array.isArray(rows) ? rows : []);
      } catch {}
    })();
  }, []);

  const labelFor = (c: any) => currentLanguage === 'ta' && c.name_ta ? c.name_ta : c.name_en;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Improved Technologies</Text>
        <Text style={styles.subtitle}>
          Select a category to explore improved practices and technologies.
        </Text>
        <View style={{ height: 12 }} />
        {categories.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={styles.categoryTile}
            onPress={() => router.push({ pathname: '/improved-technologies/[slug]', params: { slug: c.slug } })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <Ionicons name="book" size={22} color="#4caf50" />
              <Text style={styles.categoryTitle} numberOfLines={2}>{labelFor(c)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#2d5016" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 24 },
  title: { fontSize: 24, fontWeight: '800', color: '#2d5016' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 6 },
  categoryTile: {
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryTitle: { fontSize: 16, fontWeight: '700', color: '#2d5016', flexShrink: 1 },
});
