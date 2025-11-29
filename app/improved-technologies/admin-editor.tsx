import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { getImprovedArticle, createImprovedArticle, updateImprovedArticle, addImprovedArticleImage, deleteImprovedArticleImage } from '../../lib/database';
import { uploadImprovedArticleDoc } from '../../lib/supabase';
import QuillEditor from '../../components/QuillEditor';
import { uploadImage } from '../../lib/upload';
import * as ImagePicker from 'expo-image-picker';

export default function ImprovedTechnologiesAdminEditor() {
  const { slug, id } = useLocalSearchParams<{ slug: string; id: string }>();
  const isNew = !id || id === 'new';

  const [headingEn, setHeadingEn] = useState('');
  const [headingTa, setHeadingTa] = useState('');
  const [bodyEn, setBodyEn] = useState('');
  const [bodyTa, setBodyTa] = useState('');
  const [images, setImages] = useState<any[]>([]);
  const [captionEn, setCaptionEn] = useState('');
  const [captionTa, setCaptionTa] = useState('');

  useEffect(() => {
    if (isNew || !id) return;
    (async () => {
      const art = await getImprovedArticle(Number(id));
      if (art) {
        const a: any = art;
        setHeadingEn(a.heading_en || '');
        setHeadingTa(a.heading_ta || '');
        setBodyEn(a.body_en || '');
        setBodyTa(a.body_ta || '');
        setImages(Array.isArray(a.images) ? a.images : []);
      }
    })();
  }, [id, isNew]);

  const save = async () => {
    if (!headingEn.trim()) {
      Alert.alert('Error', 'Enter English heading');
      return;
    }
    try {
      let articleId: number;
      if (isNew) {
        const createdId = await createImprovedArticle({
          categorySlug: String(slug),
          heading_en: headingEn.trim(),
          heading_ta: headingTa.trim() || undefined,
          body_en: bodyEn || undefined,
          body_ta: bodyTa || undefined,
        });
        if (!createdId) return;
        articleId = Number(createdId);
      } else {
        articleId = Number(id);
        await updateImprovedArticle(articleId, {
          heading_en: headingEn.trim() || undefined,
          heading_ta: headingTa.trim() || undefined,
          body_en: bodyEn || undefined,
          body_ta: bodyTa || undefined,
        });
      }

      try {
        if (bodyEn.trim()) await uploadImprovedArticleDoc(articleId, 'en', bodyEn);
        if (bodyTa.trim()) await uploadImprovedArticleDoc(articleId, 'ta', bodyTa);
      } catch {}

      router.back();
    } catch (e) {
      Alert.alert('Error', 'Failed to save article');
    }
  };

  const addImage = async () => {
    const articleId = isNew ? null : Number(id);
    if (!articleId) {
      Alert.alert('Save article first', 'Create the article before adding images.');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permission required', 'Allow photo library access');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (res.canceled) return;
    try {
      const up = await uploadImage(res.assets[0].uri);
      const pos = (images?.length || 0) + 1;
      await addImprovedArticleImage(articleId, up.url, up.publicId, captionEn.trim() || undefined, captionTa.trim() || undefined, pos);
      const full = await getImprovedArticle(articleId);
      if (full) setImages(Array.isArray((full as any).images) ? (full as any).images : []);
      setCaptionEn('');
      setCaptionTa('');
    } catch (e) {
      Alert.alert('Error', 'Failed to add image');
    }
  };

  const removeImage = async (imgId: number) => {
    Alert.alert('Delete Image', 'Delete this image?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteImprovedArticleImage(imgId);
          if (!isNew && id) {
            const full = await getImprovedArticle(Number(id));
            if (full) setImages(Array.isArray((full as any).images) ? (full as any).images : []);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }} edges={['top', 'bottom']}>
      <View style={{ backgroundColor: '#4caf50' }}>
        {Platform.OS === 'android' ? <View style={{ height: 20, backgroundColor: '#4caf50' }} /> : null}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isNew ? 'New Article' : 'Edit Article'}</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <Text style={styles.label}>Heading (EN)</Text>
        <TextInput
          style={styles.input}
          value={headingEn}
          onChangeText={setHeadingEn}
          placeholder="Heading in English"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Heading (TA)</Text>
        <TextInput
          style={styles.input}
          value={headingTa}
          onChangeText={setHeadingTa}
          placeholder="தலைப்பு (Tamil)"
          placeholderTextColor="#999"
        />

        <Text style={[styles.label, { marginTop: 12 }]}>Content (EN)</Text>
        <QuillEditor value={bodyEn} onChange={setBodyEn} />

        <Text style={[styles.label, { marginTop: 16 }]}>Content (TA)</Text>
        <QuillEditor value={bodyTa} onChange={setBodyTa} />

        <TouchableOpacity style={styles.saveBtn} onPress={save}>
          <Ionicons name="save" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', marginLeft: 6 }}>
            {isNew ? 'Save Article' : 'Update Article'}
          </Text>
        </TouchableOpacity>

        {/* Images */}
        <View style={{ marginTop: 24 }}>
          <Text style={{ color: '#2d5016', fontWeight: '700', fontSize: 16 }}>Images</Text>
          <Text style={{ color: '#666', fontSize: 12, marginTop: 4 }}>Attach multiple images with captions.</Text>
          <View style={{ marginTop: 10 }}>
            <Text style={styles.label}>Caption (EN)</Text>
            <TextInput
              style={styles.input}
              value={captionEn}
              onChangeText={setCaptionEn}
              placeholder="Caption in English"
              placeholderTextColor="#999"
            />
            <Text style={styles.label}>Caption (TA)</Text>
            <TextInput
              style={styles.input}
              value={captionTa}
              onChangeText={setCaptionTa}
              placeholder="விளக்கம் (Tamil)"
              placeholderTextColor="#999"
            />
            <TouchableOpacity style={[styles.masterBtn, { marginTop: 10, justifyContent: 'center' }]} onPress={addImage}>
              <Ionicons name="image" size={18} color="#4caf50" />
              <Text style={styles.masterBtnText}>Add Image</Text>
            </TouchableOpacity>
          </View>

          {Array.isArray(images) && images.length > 0 && (
            <View style={{ marginTop: 14 }}>
              {images.map((img: any) => (
                <View key={img.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <Image source={{ uri: img.image_url || img.image }} style={{ width: 64, height: 64, borderRadius: 8, marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    {(img.caption_en || img.caption_ta) ? (
                      <Text style={{ color: '#333', fontSize: 13 }} numberOfLines={2}>
                        {img.caption_en || img.caption_ta}
                      </Text>
                    ) : (
                      <Text style={{ color: '#999', fontSize: 12 }}>No caption</Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => removeImage(Number(img.id))} style={{ padding: 6, backgroundColor: '#fdecea', borderRadius: 8 }}>
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
  header: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  label: { marginTop: 10, color: '#2d5016', fontWeight: '700' },
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
  saveBtn: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#4caf50',
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
  masterBtnText: { color: '#2d5016', fontWeight: '600' },
});