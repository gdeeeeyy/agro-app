import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { getImprovedArticle, createImprovedArticle, updateImprovedArticle } from '../../lib/database';
import { uploadImprovedArticleDoc } from '../../lib/supabase';
import QuillEditor from '../../components/QuillEditor';

const INSTRUCTIONS_EN =
  '<p><em>Instructions:</em> Use the toolbar to add headings, sub-headings, bullet lists and images. The first heading will be used as the article title.</p><p><br/></p>';
const INSTRUCTIONS_TA =
  '<p><em>வழிமுறைகள்:</em> தலைப்பு, துணைத் தலைப்பு, பட்டியல்கள் மற்றும் படங்களை மேலுள்ள கருவிப்பட்டையை பயன்படுத்தி சேர்க்கவும். முதல் தலைப்பு கட்டுரையின் தலைப்பாக பயன்படுத்தப்படும்.</p><p><br/></p>';

const extractHeadingFromHtml = (html: string, fallback?: string): string => {
  if (!html) return fallback || '';
  const source = String(html);
  const hMatch = source.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
  const raw = hMatch ? hMatch[1] : source.replace(/<[^>]+>/g, ' ');
  const text = raw.replace(/\s+/g, ' ').trim();
  return text || (fallback || '');
};

export default function ImprovedTechnologiesAdminEditor() {
  const { slug, id } = useLocalSearchParams<{ slug: string; id: string }>();
  const isNew = !id || id === 'new';

  const [bodyEn, setBodyEn] = useState(INSTRUCTIONS_EN);
  const [bodyTa, setBodyTa] = useState(INSTRUCTIONS_TA);
  const [initialBodyEn, setInitialBodyEn] = useState(INSTRUCTIONS_EN);
  const [initialBodyTa, setInitialBodyTa] = useState(INSTRUCTIONS_TA);
  const [activeLang, setActiveLang] = useState<'en' | 'ta'>('en');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [loaded, setLoaded] = useState(isNew);

  useEffect(() => {
    if (isNew || !id) {
      setLoaded(true);
      return;
    }
    (async () => {
      const art = await getImprovedArticle(Number(id));
      if (art) {
        const a: any = art;
        const en = a.body_en || '';
        const ta = a.body_ta || '';
        setBodyEn(en);
        setBodyTa(ta);
        setInitialBodyEn(en);
        setInitialBodyTa(ta);
      }
      setLoaded(true);
    })();
  }, [id, isNew]);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvt, (e) => {
      setKeyboardHeight(e.endCoordinates?.height || 0);
    });
    const hideSub = Keyboard.addListener(hideEvt, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const save = async () => {
    const plainEn = (bodyEn || '').replace(/<[^>]+>/g, ' ').trim();
    const plainTa = (bodyTa || '').replace(/<[^>]+>/g, ' ').trim();
    // Require both EN and TA to be completed before saving
    if (!plainEn || !plainTa) {
      Alert.alert('Error', 'Complete both English and Tamil content before saving.');
      return;
    }

    const headingAutoEn =
      extractHeadingFromHtml(bodyEn).trim() || 'Untitled article';
    const headingAutoTa =
      extractHeadingFromHtml(bodyTa).trim() || undefined;

    try {
      let articleId: number;
      if (isNew) {
        // Auto-derive titles from topmost header text in each document
        const createdId = await createImprovedArticle({
          categorySlug: String(slug),
          heading_en: headingAutoEn,
          heading_ta: headingAutoTa,
          body_en: bodyEn || undefined,
          body_ta: bodyTa || undefined,
        });
        if (!createdId) return;
        articleId = Number(createdId);
      } else {
        articleId = Number(id);
        await updateImprovedArticle(articleId, {
          heading_en: headingAutoEn,
          heading_ta: headingAutoTa,
          body_en: bodyEn || undefined,
          body_ta: bodyTa || undefined,
        });
      }

      // Upload per-language text docs and show feedback
      try {
        await uploadImprovedArticleDoc(articleId, 'en', bodyEn);
        await uploadImprovedArticleDoc(articleId, 'ta', bodyTa);
      } catch {}

      setInitialBodyEn(bodyEn);
      setInitialBodyTa(bodyTa);

      Alert.alert('Saved', 'English and Tamil documents saved.');

      // Both languages are always completed here, so redirect back after save
      router.back();
    } catch (e) {
      Alert.alert('Error', 'Failed to save article');
    }
  };

  if (!loaded) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }} edges={['top', 'bottom']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#666' }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentTitle = extractHeadingFromHtml(
    activeLang === 'en' ? bodyEn : bodyTa,
    isNew ? 'New Article' : 'Edit Article'
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }} edges={['top', 'bottom']}>
      <View style={{ backgroundColor: '#4caf50' }}>
        {Platform.OS === 'android' ? <View style={{ height: 20, backgroundColor: '#4caf50' }} /> : null}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{currentTitle || (isNew ? 'New Article' : 'Edit Article')}</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <View style={styles.langBar}>
          <TouchableOpacity
            style={[styles.langChip, activeLang === 'en' && styles.langChipActive]}
            onPress={() => setActiveLang('en')}
          >
            <Text
              style={[
                styles.langChipText,
                activeLang === 'en' && styles.langChipTextActive,
              ]}
            >
              EN
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langChip, activeLang === 'ta' && styles.langChipActive]}
            onPress={() => setActiveLang('ta')}
          >
            <Text
              style={[
                styles.langChipText,
                activeLang === 'ta' && styles.langChipTextActive,
              ]}
            >
              TA
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1, padding: 8 }}>
          <QuillEditor
            key={`${id || 'new'}-${activeLang}`}
            value={activeLang === 'en' ? initialBodyEn : initialBodyTa}
            onChange={(html) =>
              activeLang === 'en' ? setBodyEn(html) : setBodyTa(html)
            }
            style={{ flex: 1, height: '100%' }}
          />
        </View>

        <View style={[styles.bottomBar, { paddingBottom: 10 + (keyboardHeight || 0) }]}>
          <TouchableOpacity style={styles.bottomSaveBtn} onPress={save}>
            <Ionicons name="save" size={20} color="#fff" />
            <Text style={styles.bottomSaveText}>Save Article</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  langBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#f0f5ef',
  },
  langChip: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#c8e6c9',
    marginHorizontal: 4,
    backgroundColor: '#fff',
  },
  langChipActive: {
    backgroundColor: '#4caf50',
    borderColor: '#4caf50',
  },
  langChipText: {
    fontWeight: '600',
    color: '#2d5016',
  },
  langChipTextActive: {
    color: '#fff',
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
  },
  bottomSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#4caf50',
  },
  bottomSaveText: {
    color: '#fff',
    fontWeight: '700',
    marginLeft: 8,
  },
});
