import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { listImprovedArticles, listImprovedCategories } from '../../lib/database';
import { useLanguage } from '../../context/LanguageContext';

export default function ImprovedTechnologiesCategory() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { currentLanguage } = useLanguage();
  const [articles, setArticles] = useState<any[]>([]);
  const [categoryName, setCategoryName] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        const cats = await listImprovedCategories();
        const cat = (Array.isArray(cats) ? cats : []).find((c: any) => c.slug === slug);
        if (cat) {
          setCategoryName(currentLanguage === 'ta' && cat.name_ta ? cat.name_ta : cat.name_en);
        }
      } catch {}
    })();
  }, [slug, currentLanguage]);

  useEffect(() => {
    (async () => {
      if (!slug) return;
      try {
        const rows = await listImprovedArticles(String(slug), currentLanguage === 'ta' ? 'ta' : 'en');
        setArticles(Array.isArray(rows) ? rows : []);
      } catch {}
    })();
  }, [slug, currentLanguage]);

  const heading = (a: any) => currentLanguage === 'ta' && a.heading_ta ? a.heading_ta : a.heading_en;
  const subheading = (a: any) => currentLanguage === 'ta' && a.subheading_ta ? a.subheading_ta : a.subheading_en;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{categoryName || 'Improved Technologies'}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {articles.length === 0 ? (
          <Text style={{ color: '#666', marginTop: 12 }}>No articles yet.</Text>
        ) : (
          articles.map((a) => (
            <TouchableOpacity
              key={a.id}
              style={styles.articleCard}
              onPress={() => router.push({ pathname: '/improved-technologies/article/[id]', params: { id: String(a.id) } })}
            >
              <Text style={styles.articleHeading} numberOfLines={2}>{heading(a)}</Text>
              {subheading(a) ? (
                <Text style={styles.articleSubheading} numberOfLines={3}>{subheading(a)}</Text>
              ) : null}
            </TouchableOpacity>
          ))
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
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700', flex: 1, marginLeft: 8 },
  content: { padding: 16, paddingBottom: 24 },
  articleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 12,
  },
  articleHeading: { fontSize: 18, fontWeight: '700', color: '#2d5016' },
  articleSubheading: { marginTop: 4, fontSize: 14, color: '#555', textAlign: 'justify' },
});
