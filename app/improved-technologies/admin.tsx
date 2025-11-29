import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useLanguage } from '../../context/LanguageContext';
import { listImprovedCategories } from '../../lib/database';

export default function ImprovedTechnologiesAdmin() {
  const { currentLanguage } = useLanguage();

  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const cats = await listImprovedCategories();
      const arr = Array.isArray(cats) ? cats : [];
      setCategories(arr);
    } catch (e) {
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
    <SafeAreaView style={styles.container} edges={['bottom']}>
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

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <Text style={{ color: '#2d5016', fontWeight: '700' }}>Categories</Text>

        {loading ? (
          <View style={{ marginTop: 16 }}>
            <ActivityIndicator color="#4caf50" />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
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
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: 20,
                    borderWidth: 2,
                    borderColor: '#e0e0e0',
                    backgroundColor: '#f9f9f9',
                  }}
                >
                  <Text style={{ color: '#333', fontWeight: '600' }}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: 16 }} />
        <Text style={{ color: '#666', fontSize: 13 }}>
          Select a category to manage its articles (add, edit, delete) on the next page.
        </Text>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
});
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useLanguage } from '../../context/LanguageContext';
import { listImprovedCategories } from '../../lib/database';

export default function ImprovedTechnologiesAdmin() {
  const { currentLanguage } = useLanguage();

  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const cats = await listImprovedCategories();
      const arr = Array.isArray(cats) ? cats : [];
      setCategories(arr);
    } catch (e) {
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
    <SafeAreaView style={styles.container} edges={['bottom']}>
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

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <Text style={{ color: '#2d5016', fontWeight: '700' }}>Categories</Text>

        {loading ? (
          <View style={{ marginTop: 16 }}>
            <ActivityIndicator color="#4caf50" />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
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
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: 20,
                    borderWidth: 2,
                    borderColor: '#e0e0e0',
                    backgroundColor: '#f9f9f9',
                  }}
                >
                  <Text style={{ color: '#333', fontWeight: '600' }}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: 16 }} />
        <Text style={{ color: '#666', fontSize: 13 }}>
          Select a category to manage its articles (add, edit, delete) on the next page.
        </Text>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
});
                const delta = 2;
                return { text: newText, selection: { start: sel.start + delta, end: sel.end + delta } };
              })}
            >
              <Text style={styles.mdChipText}>•</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.input, { minHeight: 120, textAlignVertical:'top', textAlign:'justify' }]}
            value={articleBodyEn}
            onChangeText={setArticleBodyEn}
            multiline
            placeholder="Article body in English using markdown (#, ##, -)"
            placeholderTextColor="#999"
            onSelectionChange={(e) => setArticleBodyEnSelection(e.nativeEvent.selection)}
          />

          <Text style={{ marginTop:10, color:'#2d5016', fontWeight:'700' }}>Content (TA)</Text>
          <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginTop:6, marginBottom:4 }}>
            <TouchableOpacity
              style={styles.mdChip}
              onPress={() => applyMarkdownToBody('ta', (text, sel) => {
                const idx = text.lastIndexOf('\n', sel.start - 1) + 1;
                const newText = text.slice(0, idx) + '# ' + text.slice(idx);
                const delta = 2;
                return { text: newText, selection: { start: sel.start + delta, end: sel.end + delta } };
              })}
            >
              <Text style={styles.mdChipText}>H1</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mdChip}
              onPress={() => applyMarkdownToBody('ta', (text, sel) => {
                const idx = text.lastIndexOf('\n', sel.start - 1) + 1;
                const newText = text.slice(0, idx) + '## ' + text.slice(idx);
                const delta = 3;
                return { text: newText, selection: { start: sel.start + delta, end: sel.end + delta } };
              })}
            >
              <Text style={styles.mdChipText}>H2</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mdChip}
              onPress={() => applyMarkdownToBody('ta', (text, sel) => {
                const newText = text.slice(0, sel.start) + '- ' + text.slice(sel.start);
                const delta = 2;
                return { text: newText, selection: { start: sel.start + delta, end: sel.end + delta } };
              })}
            >
              <Text style={styles.mdChipText}>•</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.input, { minHeight: 120, textAlignVertical:'top', textAlign:'justify' }]}
            value={articleBodyTa}
            onChangeText={setArticleBodyTa}
            multiline
            placeholder="உள்ளடக்கம் (Tamil) - markdown headings, lists"
            placeholderTextColor="#999"
            onSelectionChange={(e) => setArticleBodyTaSelection(e.nativeEvent.selection)}
          />

          <TouchableOpacity style={[styles.savePrimaryBtn, { marginTop: 14 }]} onPress={saveArticle}>
            <Ionicons name="save" size={18} color="#fff" />
            <Text style={{ color:'#fff', fontWeight:'700' }}>{editingArticleId ? 'Update Article' : 'Save Article'}</Text>
          </TouchableOpacity>
        </View>

          <Text style={{ color:'#2d5016', fontWeight:'700', fontSize:16 }}>Images</Text>
          <Text style={{ color:'#666', fontSize:12, marginTop:4 }}>Attach multiple images with captions.</Text>

          <View style={{ marginTop:10 }}>
            <Text style={{ color:'#2d5016', fontWeight:'700' }}>Caption (EN)</Text>
            <TextInput style={styles.input} value={articleImgCaptionEn} onChangeText={setArticleImgCaptionEn} placeholder="Caption in English" placeholderTextColor="#999" />
            <Text style={{ marginTop:8, color:'#2d5016', fontWeight:'700' }}>Caption (TA)</Text>
            <TextInput style={styles.input} value={articleImgCaptionTa} onChangeText={setArticleImgCaptionTa} placeholder="விளக்கம் (Tamil)" placeholderTextColor="#999" />

            <TouchableOpacity style={[styles.masterBtn, { marginTop:10, justifyContent:'center' }]} onPress={addImage}>
              <Ionicons name="image" size={18} color="#4caf50" />
              <Text style={styles.masterBtnText}>Add Image</Text>
            </TouchableOpacity>
          </View>

          {Array.isArray(articleImages) && articleImages.length > 0 && (
            <View style={{ marginTop:14 }}>
              {articleImages.map((img:any) => (
                <View key={img.id} style={{ flexDirection:'row', alignItems:'center', marginBottom:10 }}>
                  <Image source={{ uri: img.image_url || img.image }} style={{ width:64, height:64, borderRadius:8, marginRight:10 }} />
                  <View style={{ flex:1 }}>
                    {(img.caption_en || img.caption_ta) ? (
                      <Text style={{ color:'#333', fontSize:13 }} numberOfLines={2}>
                        {currentLanguage==='ta' && img.caption_ta ? img.caption_ta : img.caption_en}
                      </Text>
                    ) : (
                      <Text style={{ color:'#999', fontSize:12 }}>No caption</Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => removeImage(Number(img.id))} style={{ padding:6, backgroundColor:'#fdecea', borderRadius:8 }}>
                    <Ionicons name="trash" size={18} color="#d32f2f" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  masterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c8e6c9',
    backgroundColor: '#f5fbf6',
  },
  masterBtnText: {
    color: '#2d5016',
    fontWeight: '600',
  },
  savePrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#4caf50',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    fontSize: 14,
    color: '#333',
  },
  mdChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#c8e6c9',
    backgroundColor: '#f5fbf6',
  },
  mdChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2d5016',
  },
});