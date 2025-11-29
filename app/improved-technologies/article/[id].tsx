import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { getImprovedArticle } from '../../../lib/database';
import { useLanguage } from '../../../context/LanguageContext';

export default function ImprovedArticleDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentLanguage } = useLanguage();
  const [article, setArticle] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        const data = await getImprovedArticle(Number(id));
        setArticle(data);
      } catch {}
    })();
  }, [id]);

  const heading = (a: any) => currentLanguage === 'ta' && a.heading_ta ? a.heading_ta : a.heading_en;
  const subheading = (a: any) => currentLanguage === 'ta' && a.subheading_ta ? a.subheading_ta : a.subheading_en;
  const body = (a: any) => currentLanguage === 'ta' && a.body_ta ? a.body_ta : a.body_en;
  const captionFor = (img: any) => currentLanguage === 'ta' && img.caption_ta ? img.caption_ta : img.caption_en;

  const paragraphs = (text?: string) => {
    if (!text) return [];
    return String(text).split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{article ? heading(article) : 'Improved Technologies'}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {!article ? (
          <Text style={{ color: '#666', marginTop: 16 }}>Loading...</Text>
        ) : (
          <>
            <Text style={styles.heading}>{heading(article)}</Text>
            {subheading(article) ? (
              <Text style={styles.subheading}>{subheading(article)}</Text>
            ) : null}

            {paragraphs(body(article)).map((p, idx) => (
              <Text key={idx} style={styles.paragraph}>{p}</Text>
            ))}

            {Array.isArray(article.images) && article.images.length > 0 && (
              <View style={{ marginTop: 18 }}>
                {article.images.map((img: any) => (
                  <View key={img.id} style={{ marginBottom: 16 }}>
                    <Image source={{ uri: img.image_url || img.image }} style={styles.image} />
                    {captionFor(img) ? (
                      <Text style={styles.caption}>{captionFor(img)}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </>
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
  heading: { fontSize: 22, fontWeight: '800', color: '#2d5016' },
  subheading: { marginTop: 6, fontSize: 15, color: '#555' },
  paragraph: {
    marginTop: 10,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    textAlign: 'justify',
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: '#ddd',
  },
  caption: {
    marginTop: 4,
    fontSize: 13,
    color: '#555',
    textAlign: 'justify',
  },
});
