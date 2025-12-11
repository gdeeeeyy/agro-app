import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useLanguage } from '../../context/LanguageContext';
import { listImprovedCategories, listImprovedArticles, deleteImprovedArticle } from '../../lib/database';

export default function ImprovedTechnologiesAdminCategory() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { currentLanguage } = useLanguage();
  const [categoryName, setCategoryName] = useState('');
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newCropName, setNewCropName] = useState('');
  const [cropNameModalVisible, setCropNameModalVisible] = useState(false);

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
        setArticles(Array.isArray(arts) ? arts : []);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, currentLanguage]);

  const goToEditor = (articleId?: number, title?: string) => {
    router.push({
      pathname: '/improved-technologies/admin-editor',
      params: {
        slug: String(slug),
        id: articleId != null ? String(articleId) : 'new',
        ...(title ? { title } : {}),
      },
    });
  };

  const handleStartNewArticle = () => {
    const name = newCropName.trim();
    if (!name) {
      Alert.alert('Missing info', 'Enter crop name');
      return;
    }
    goToEditor(undefined, name);
    setCropNameModalVisible(false);
    setNewCropName('');
  };

  const confirmDelete = (id: number) => {
    Alert.alert('Delete Article', 'Delete this article?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteImprovedArticle(id);
          const refresh = await listImprovedArticles(String(slug), currentLanguage === 'ta' ? 'ta' : 'en');
          setArticles(Array.isArray(refresh) ? refresh : []);
        },
      },
    ]);
  };

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

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#2d5016' }}>Articles</Text>
          <TouchableOpacity
            style={styles.masterBtn}
            onPress={() => {
              setCropNameModalVisible(true);
            }}
          >
            <Ionicons name="add" size={18} color="#4caf50" />
            <Text style={styles.masterBtnText}>Add Article</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <Text style={{ color: '#666', marginTop: 8 }}>Loading...</Text>
        ) : articles.length === 0 ? (
          <Text style={{ color: '#666', marginTop: 8 }}>No articles yet.</Text>
        ) : (
          articles.map((a: any) => {
            const title = currentLanguage === 'ta' && a.heading_ta ? a.heading_ta : a.heading_en;
            return (
              <View key={a.id} style={styles.articleCard}>
                <Text style={{ flex: 1, color: '#2d5016', fontWeight: '700' }} numberOfLines={2}>
                  {title}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={() => goToEditor(a.id)} style={styles.iconChip}>
                    <Ionicons name="create" size={18} color="#2d5016" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmDelete(Number(a.id))} style={styles.iconChipDanger}>
                    <Ionicons name="trash" size={18} color="#d32f2f" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {cropNameModalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalBackdrop}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => {
                setCropNameModalVisible(false);
                setNewCropName('');
              }}
            />
            <View style={styles.modalCard}>
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalIconCircle}>
                  <Ionicons name="leaf" size={20} color="#4caf50" />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.modalTitle}>Add crop name</Text>
                  <Text style={styles.modalSubtitle}>
                    This name will be used as the article heading in the next step.
                  </Text>
                </View>
              </View>

              <TextInput
                style={[styles.input, { marginTop: 16 }]}
                value={newCropName}
                onChangeText={setNewCropName}
                placeholder="e.g. Paddy (CO 51)"
                placeholderTextColor="#999"
                autoFocus
              />

              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={styles.modalSecondaryBtn}
                  onPress={() => {
                    setCropNameModalVisible(false);
                    setNewCropName('');
                  }}
                >
                  <Text style={styles.modalSecondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleStartNewArticle}>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
  masterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c8e6c9',
    backgroundColor: '#f5fbf6',
  },
  masterBtnText: { color: '#2d5016', fontWeight: '600' },
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
  iconChip: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#eaf6ec',
  },
  iconChipDanger: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#fdecea',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '90%',
    maxWidth: 420,
    borderRadius: 18,
    backgroundColor: '#fff',
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  modalIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d5016',
  },
  modalSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#555',
  },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 18,
    columnGap: 10,
  },
  modalSecondaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
  },
  modalSecondaryText: {
    color: '#555',
    fontWeight: '600',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#4caf50',
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
});
