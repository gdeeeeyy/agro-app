import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useLanguage } from '../../context/LanguageContext';
import { listImprovedCategories, createImprovedCategory } from '../../lib/database';

export default function ImprovedTechnologiesAdmin() {
  const { currentLanguage } = useLanguage();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newNameEn, setNewNameEn] = useState('');
  const [newNameTa, setNewNameTa] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const cats = await listImprovedCategories();
      const arr = Array.isArray(cats) ? cats : [];
      setCategories(arr);
    } catch {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    const nameEn = newNameEn.trim();
    const nameTa = newNameTa.trim();

    if (!nameEn) {
      Alert.alert('Missing info', 'Enter category name');
      return;
    }

    try {
      setSavingCategory(true);
      const id = await createImprovedCategory({
        name_en: nameEn,
        name_ta: nameTa || undefined,
      });
      if (!id) {
        Alert.alert('Error', 'Could not create category');
        return;
      }
      setNewNameEn('');
      setNewNameTa('');
      await loadCategories();
      setAddModalVisible(false);
    } catch {
      Alert.alert('Error', 'Could not create category');
    } finally {
      setSavingCategory(false);
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
          <Text style={styles.headerTitle}>Improved Technologies (Admin)</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
        <Text style={{ color: '#2d5016', fontWeight: '700', fontSize: 18 }}>Categories</Text>

        {loading ? (
          <View style={{ marginTop: 16 }}>
            <ActivityIndicator color="#4caf50" />
          </View>
        ) : (
          <>
            <View style={{ marginTop: 12 }}>
              {categories.map((c: any) => {
                const label = labelForCategory(c);
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() =>
                      router.push({
                        pathname: '/improved-technologies/admin-category',
                        params: { slug: c.slug },
                      })
                    }
                    style={styles.categoryRow}
                  >
                    <Text style={styles.categoryRowText}>{label}</Text>
                    <Ionicons name="chevron-forward" size={18} color="#4caf50" />
                  </TouchableOpacity>
                );
              })}
            </View>
            {categories.length === 0 && !loading && (
              <Text style={{ color: '#666', marginTop: 12 }}>No categories yet.</Text>
            )}
          </>
        )}

        <View style={{ height: 16 }} />
        <Text style={{ color: '#666', fontSize: 13 }}>
          Select a category to manage its articles (add, edit, delete) on the next page.
        </Text>
      </ScrollView>

      {/* Floating + button to add category */}
      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.fab} onPress={() => setAddModalVisible(true)}>
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Add Category modal */}
      <>
        {addModalVisible && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Add Category</Text>
              <TextInput
                style={styles.input}
                value={newNameEn}
                onChangeText={setNewNameEn}
                placeholder="Name (English)"
                placeholderTextColor="#999"
              />
              <TextInput
                style={styles.input}
                value={newNameTa}
                onChangeText={setNewNameTa}
                placeholder="பெயர் (Tamil, optional)"
                placeholderTextColor="#999"
              />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 12 }}>
                <TouchableOpacity onPress={() => { setAddModalVisible(false); setNewNameEn(''); setNewNameTa(''); }}>
                  <Text style={{ color: '#666', fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleAddCategory} disabled={savingCategory}>
                  <Ionicons name="save" size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>{savingCategory ? 'Saving...' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
  },
  chipText: {
    color: '#333',
    fontWeight: '600',
  },
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
  },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  primaryBtn: {
    marginTop: 12,
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
  fabContainer: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#4caf50',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '88%',
    borderRadius: 16,
    backgroundColor: '#fff',
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d5016',
    marginBottom: 8,
  },
});
