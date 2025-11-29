import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useLanguage } from '../../../context/LanguageContext';
import { getImprovedArticle } from '../../../lib/database';
import { WebView } from 'react-native-webview';

interface ImprovedArticleFull {
  id: number;
  heading_en: string;
  heading_ta?: string | null;
  body_en?: string | null;
  body_ta?: string | null;
  images?: Array<{ id: number; image: string; caption_en?: string | null; caption_ta?: string | null }>;
}

export default function ImprovedTechnologiesArticle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentLanguage } = useLanguage();
  const [article, setArticle] = useState<ImprovedArticleFull | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const full = await getImprovedArticle(Number(id));
        if (full) setArticle(full as any);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const title = useMemo(() => {
    if (!article) return '';
    if (currentLanguage === 'ta' && article.heading_ta) return article.heading_ta;
    return article.heading_en || '';
  }, [article, currentLanguage]);

  const htmlDocument = useMemo(() => {
    if (!article) return '<p>No content.</p>';
    const rawBody =
      currentLanguage === 'ta' && article.body_ta
        ? article.body_ta
        : article.body_en || '';

    // Normalise Quill HTML a bit to avoid large empty gaps
    let bodyHtml = (rawBody || '')
      // remove paragraphs that are only <br>
      .replace(/<p>\s*(<br\s*\/?\s*>\s*)+<\/p>/gi, '')
      // collapse multiple blank divs
      .replace(/<div>\s*<br\s*\/?\s*>\s*<\/div>/gi, '')
      // collapse repeated line breaks
      .replace(/(<br\s*\/?\s*>\s*){3,}/gi, '<br />')
      // trim whitespace around tags
      .replace(/\s+<\//g, ' </')
      .trim();

    if (!bodyHtml) bodyHtml = '<p>No content yet.</p>';

    const imagesHtml = Array.isArray(article.images) && article.images.length
      ? `<div class="images">${article.images
          .map((img) => {
            const caption =
              currentLanguage === 'ta' && img.caption_ta
                ? img.caption_ta
                : img.caption_en || '';
            const escCaption = caption
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
            return `
              <figure style="margin: 12px 0;">
                <img src="${img.image}" style="max-width:100%;height:auto;border-radius:10px;" />
                ${caption ? `<figcaption style="font-size:12px;color:#555;margin-top:4px;">${escCaption}</figcaption>` : ''}
              </figure>
            `;
          })
          .join('')}</div>`
      : '';

    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {
        margin: 0;
        padding: 12px 16px 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background-color: #ffffff;
        color: #333333;
      }
      h1, h2, h3, h4 {
        color: #2d5016;
        margin-top: 14px;
        margin-bottom: 6px;
      }
      p, li {
        font-size: 15px;
        line-height: 1.6;
      }
      p {
        margin: 6px 0;
      }
      ul, ol {
        padding-left: 20px;
        margin: 6px 0;
      }
      img {
        max-width: 100%;
        height: auto;
        border-radius: 8px;
      }
      .content {
        margin-top: 4px;
      }
    </style>
  </head>
  <body>
    ${imagesHtml}
    <div class="content">
      ${bodyHtml}
    </div>
  </body>
</html>`;
  }, [article, currentLanguage, title]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={{ backgroundColor: '#4caf50' }}>
        {Platform.OS === 'android' ? <View style={{ height: 20, backgroundColor: '#4caf50' }} /> : null}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title || 'Article'}
          </Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#4caf50" />
        </View>
      ) : !article ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#666', textAlign: 'center' }}>Article not found.</Text>
        </View>
      ) : (
        <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
          <WebView
            originWhitelist={["*"]}
            source={{ html: htmlDocument }}
            style={{ flex: 1, backgroundColor: 'transparent' }}
          />
        </View>
      )}
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
});
