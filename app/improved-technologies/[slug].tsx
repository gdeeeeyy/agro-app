import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useLanguage } from '../../context/LanguageContext';
import { listImprovedCategories, listImprovedArticles } from '../../lib/database';

export default function ImprovedTechnologiesCategory() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { currentLanguage } = useLanguage();
  const [categoryName, setCategoryName] = useState('');
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      try {
        const cats = await listImprovedCategories();
        const arr = Array.isArray(cats) ? cats : [];
        const found = arr.find((c: any) => c.slug === slug);
        if (found) {
          let labelEn = found.name_en;
          if (found.slug === 'agronomy') labelEn = 'Agronomy crops';
          else if (found.slug === 'horticulture') labelEn = 'Horticulture crops';
          else if (found.slug === 'animal') labelEn = 'Animal Husbandary';
          else if (found.slug === 'post-harvest') labelEn = 'Post Harvest technologies';
          setCategoryName(currentLanguage === 'ta' && found.name_ta ? found.name_ta : labelEn);
        }
        const arts = await listImprovedArticles(String(slug), currentLanguage === 'ta' ? 'ta' : 'en');
        // Sort articles alphabetically by heading
        const artArray = Array.isArray(arts) ? arts : [];
        const sorted = artArray.sort((a, b) => {
          const titleA = (currentLanguage === 'ta' && a.heading_ta ? a.heading_ta : a.heading_en || '').toLowerCase();
          const titleB = (currentLanguage === 'ta' && b.heading_ta ? b.heading_ta : b.heading_en || '').toLowerCase();
          return titleA.localeCompare(titleB);
        });
        setArticles(sorted);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, currentLanguage]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={{ backgroundColor: '#4caf50' }}>
        {Platform.OS === 'android' ? <View style={{ height: 20, backgroundColor: '#4caf50' }} /> : null}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{categoryName || 'Improved Technologies'}</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: '#2d5016' }}>
          {currentLanguage === 'ta' ? 'நிலைகள்' : 'Articles'}
        </Text>
        <Text style={{ marginTop: 4, color: '#666', fontSize: 13 }}>
          {currentLanguage === 'ta' ? 'முழு விபரங்களைப் படிக்க ஒரு கட்டுரையைத் தேர்ந்தெடுக்கவும்.' : 'Select an article to read full details.'}
        </Text>

        {loading ? (
          <Text style={{ color: '#666', marginTop: 8 }}>{currentLanguage === 'ta' ? 'எற்றுதல் நடந்துகொண்டிருக்கிறது...' : 'Loading...'}</Text>
        ) : articles.length === 0 ? (
          <Text style={{ color: '#666', marginTop: 8 }}>{currentLanguage === 'ta' ? 'இதுவரை கட்டுரைகள் எதுவுமில்லை.' : 'No articles yet.'}
        </Text>
        ) : (
          articles.map((a: any) => {
            const title = currentLanguage === 'ta' && a.heading_ta ? a.heading_ta : a.heading_en;
            return (
              <TouchableOpacity
                key={a.id}
                style={styles.articleCard}
                onPress={() => router.push(`/improved-technologies/article/${a.id}`)}
              >
                <Text style={{ flex: 1, color: '#2d5016', fontWeight: '700' }} numberOfLines={2}>
                  {title || 'Untitled article'}
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#4caf50" />
              </TouchableOpacity>
            );
          })
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
  articleCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
