import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Alert, ScrollView, Image, Modal, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { 
  getAllCrops,
  listCropPests,
  listCropDiseases,
  listCropPestImages,
  listCropDiseaseImages,
  addCropPestBoth,
  addCropDiseaseBoth,
  updateCropPest,
  updateCropDisease,
  addCropPestImage,
  addCropDiseaseImage,
  deleteCropPestImage,
  deleteCropDiseaseImage,
  deleteCropPest,
  deleteCropDisease,
} from '../lib/database';
import { uploadImage } from '../lib/upload';

export default function MastersPests() {
  const [crops, setCrops] = useState<any[]>([]);
  const [selectedCropId, setSelectedCropId] = useState<number | null>(null);

  const [pestsEn, setPestsEn] = useState<any[]>([]);
  const [diseasesEn, setDiseasesEn] = useState<any[]>([]);
  const [pestImages, setPestImages] = useState<Record<number, any[]>>({});
  const [diseaseImages, setDiseaseImages] = useState<Record<number, any[]>>({});

  const [pestLang, setPestLang] = useState<'en'|'ta'>('en');
  const [diseaseLang, setDiseaseLang] = useState<'en'|'ta'>('en');

  const [editingPestId, setEditingPestId] = useState<number | null>(null);
  const [editingDiseaseId, setEditingDiseaseId] = useState<number | null>(null);

  // Add new pest/disease inputs
  const [pestNameEn, setPestNameEn] = useState('');
  const [pestNameTa, setPestNameTa] = useState('');
  const [pestDescEn, setPestDescEn] = useState('');
  const [pestDescTa, setPestDescTa] = useState('');
  const [pestMgmtEn, setPestMgmtEn] = useState('');
  const [pestMgmtTa, setPestMgmtTa] = useState('');
  const [pestImgCaption, setPestImgCaption] = useState('');
  const [pestImgCaptionTa, setPestImgCaptionTa] = useState('');
  const [pestPendingImageUri, setPestPendingImageUri] = useState<string | null>(null);

  const [diseaseNameEn, setDiseaseNameEn] = useState('');
  const [diseaseNameTa, setDiseaseNameTa] = useState('');
  const [diseaseDescEn, setDiseaseDescEn] = useState('');
  const [diseaseDescTa, setDiseaseDescTa] = useState('');
  const [diseaseMgmtEn, setDiseaseMgmtEn] = useState('');
  const [diseaseMgmtTa, setDiseaseMgmtTa] = useState('');
  const [diseaseImgCaption, setDiseaseImgCaption] = useState('');
  const [diseaseImgCaptionTa, setDiseaseImgCaptionTa] = useState('');
  const [diseasePendingImageUri, setDiseasePendingImageUri] = useState<string | null>(null);

  // Image modals
  const [imgModalVisible, setImgModalVisible] = useState(false);
  const [imgModalPestId, setImgModalPestId] = useState<number | null>(null);
  const [imgModalImage, setImgModalImage] = useState<any | null>(null);
  const [disImgModalVisible, setDisImgModalVisible] = useState(false);
  const [disImgModalDiseaseId, setDisImgModalDiseaseId] = useState<number | null>(null);
  const [disImgModalImage, setDisImgModalImage] = useState<any | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => { (async ()=>{ const all = await getAllCrops() as any[]; setCrops(all); if (all[0]) setSelectedCropId(Number(all[0].id)); setLoading(false); })(); }, []);

  useEffect(() => {
    (async () => {
      if (!selectedCropId) return;
      const ps = await listCropPests(selectedCropId, 'en') as any[];
      const ds = await listCropDiseases(selectedCropId, 'en') as any[];
      setPestsEn(ps);
      setDiseasesEn(ds);
      const pimEntries = await Promise.all(ps.map(async p => [p.id, await listCropPestImages(Number(p.id))] as const));
      const dimEntries = await Promise.all(ds.map(async d => [d.id, await listCropDiseaseImages(Number(d.id))] as const));
      const pim: Record<number, any[]> = {}; pimEntries.forEach(([id, imgs]) => { pim[id] = imgs as any[]; });
      const dim: Record<number, any[]> = {}; dimEntries.forEach(([id, imgs]) => { dim[id] = imgs as any[]; });
      setPestImages(pim); setDiseaseImages(dim);
    })();
  }, [selectedCropId]);

  const [cropPickerOpen, setCropPickerOpen] = useState(false);
  const CropSelector = () => (
    <View style={[styles.row, { marginBottom: 8, alignItems:'center' }]}>
      <TouchableOpacity style={[styles.input, { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
        onPress={() => setCropPickerOpen(true)}>
        <Text>{(crops.find(c=>Number(c.id)===selectedCropId)||{}).name || 'Select Crop'}</Text>
        <Ionicons name="chevron-down" size={18} color="#666" />
      </TouchableOpacity>
      <Modal visible={cropPickerOpen} transparent animationType="fade" onRequestClose={()=> setCropPickerOpen(false)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.3)', justifyContent:'center', alignItems:'center' }}>
          <View style={{ width: '92%', maxHeight: '70%', backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' }}>
              <Text style={{ fontSize: 18, fontWeight: '700' }}>Select Crop</Text>
              <TouchableOpacity onPress={()=> setCropPickerOpen(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
              {crops.map((c:any)=> (
                <TouchableOpacity key={c.id} style={{ paddingVertical: 12, borderBottomWidth:1, borderBottomColor:'#f0f0f0' }} onPress={()=> { setSelectedCropId(Number(c.id)); setCropPickerOpen(false); }}>
                  <Text style={{ color:'#333' }}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {Platform.OS === 'android' ? <View style={{ height: 20, backgroundColor: '#4caf50' }} /> : null}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Pests & Diseases</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}>
          <ActivityIndicator color="#4caf50" />
        </View>
      ) : (
      <ScrollView style={{ flex:1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ color:'#2d5016', fontWeight:'700', fontSize:16 }}>Crop</Text>
        <CropSelector />

        {/* Pests section */}
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginTop: 8 }}>
          <Text style={{ color: '#2d5016', fontWeight: '700' }}>Pests</Text>
          <View style={styles.segmented}>
            <TouchableOpacity onPress={()=> setPestLang('en')} style={[styles.segment, pestLang==='en' && styles.segmentActive]}>
              <Text style={[styles.segmentText, pestLang==='en' && styles.segmentTextActive]}>EN</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={()=> setPestLang('ta')} style={[styles.segment, pestLang==='ta' && styles.segmentActive]}>
              <Text style={[styles.segmentText, pestLang==='ta' && styles.segmentTextActive]}>TA</Text>
            </TouchableOpacity>
          </View>
        </View>
        {pestsEn.map(p => {
          const thumb = (pestImages[p.id] && pestImages[p.id][0]?.image) || null;
          return (
            <View key={p.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
              <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
                <View style={{ flexDirection:'row', alignItems:'center', gap: 10, flex: 1, paddingRight: 8 }}>
                  <Image source={thumb ? { uri: thumb } : require('../assets/images/icon.png')} style={{ width: 48, height: 48, borderRadius: 8 }} />
                  <Text style={{ fontWeight: '600', flex:1 }} numberOfLines={2}>{pestLang==='ta' ? (p.name_ta || p.name) : p.name}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems:'center', gap: 8 }}>
                  <TouchableOpacity accessibilityLabel="Add Image" onPress={async ()=>{ if (!(p as any).name_ta || !(p as any).name_ta.trim()) { Alert.alert('Add Tamil details first', 'Please add the Tamil name for this pest before attaching images.'); return; } const perm = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (perm.status !== 'granted') { Alert.alert('Permission required', 'Allow photo library access'); return; } const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images }); if (!r.canceled) { const up = await uploadImage(r.assets[0].uri); await addCropPestImage(Number(p.id), up.url, undefined, undefined, up.publicId); const imgs = await listCropPestImages(Number(p.id)); setPestImages(prev=> ({...prev, [p.id]: imgs as any[]})); } }} style={styles.actionChip}>
                    <Ionicons name="image" size={16} color="#4caf50" />
                  </TouchableOpacity>
                  <TouchableOpacity accessibilityLabel="Edit Pest" onPress={()=> setEditingPestId(p.id)} style={styles.actionChip}>
                    <Ionicons name="create" size={16} color="#4caf50" />
                  </TouchableOpacity>
                  <TouchableOpacity accessibilityLabel="Delete Pest" onPress={async ()=>{ Alert.alert('Delete Pest', 'Are you sure you want to delete this pest entirely?', [ { text:'Cancel', style:'cancel' }, { text:'Delete', style:'destructive', onPress: async ()=> { await deleteCropPest(Number(p.id)); const ps = await listCropPests(Number(selectedCropId), 'en') as any[]; setPestsEn(ps); setPestImages(prev=> { const n = {...prev}; delete n[p.id]; return n; }); Alert.alert('Deleted','Pest removed'); } } ]); }} style={[styles.actionChip, styles.actionChipDanger]}>
                    <Ionicons name="trash" size={16} color="#d32f2f" />
                  </TouchableOpacity>
                </View>
              </View>
              {Array.isArray(pestImages[p.id]) && pestImages[p.id].length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }} contentContainerStyle={{ gap: 10 }}>
                  {pestImages[p.id].map((img: any) => (
                    <View key={img.id} style={{ width: 92 }}>
                      <TouchableOpacity onPress={()=> { setImgModalPestId(Number(p.id)); setImgModalImage(img); setImgModalVisible(true); }}>
                        <Image source={{ uri: img.image }} style={{ width: 92, height: 92, borderRadius: 8 }} />
                      </TouchableOpacity>
                      { (pestLang==='ta' ? img.caption_ta : img.caption) ? (
                        <Text style={{ fontSize:11, color:'#555', marginTop: 4 }} numberOfLines={2}>{pestLang==='ta' ? img.caption_ta : img.caption}</Text>
                      ) : null }
                    </View>
                  ))}
                </ScrollView>
              ) : null}

              {editingPestId === p.id && (
                <View style={{ marginTop: 8, gap: 6 }}>
                  {pestLang==='en' ? (
                    <>
                      <TextInput style={styles.input} placeholder="Name (EN)" value={p.name || ''} onChangeText={(v)=> setPestsEn(prev=> prev.map(x=> x.id===p.id?{...x,name:v}:x))} />
                      <TextInput style={styles.input} placeholder="Description (EN)" value={p.description || ''} onChangeText={(v)=> setPestsEn(prev=> prev.map(x=> x.id===p.id?{...x,description:v}:x))} />
                      <TextInput style={styles.input} placeholder="Management (EN)" value={p.management || ''} onChangeText={(v)=> setPestsEn(prev=> prev.map(x=> x.id===p.id?{...x,management:v}:x))} />
                    </>
                  ) : (
                    <>
                      <TextInput style={styles.input} placeholder="Name (TA)" value={p.name_ta || ''} onChangeText={(v)=> setPestsEn(prev=> prev.map(x=> x.id===p.id?{...x,name_ta:v}:x))} />
                      <TextInput style={styles.input} placeholder="Description (TA)" value={p.description_ta || ''} onChangeText={(v)=> setPestsEn(prev=> prev.map(x=> x.id===p.id?{...x,description_ta:v}:x))} />
                      <TextInput style={styles.input} placeholder="Management (TA)" value={p.management_ta || ''} onChangeText={(v)=> setPestsEn(prev=> prev.map(x=> x.id===p.id?{...x,management_ta:v}:x))} />
                    </>
                  )}
                  <View style={{ flexDirection:'row', gap: 8 }}>
                    <TouchableOpacity style={styles.savePrimaryBtn} onPress={async ()=>{
                      const curr = pestsEn.find(x=> x.id===p.id);
                      if (!curr || !selectedCropId) return;
                      await addCropPestBoth(Number(selectedCropId), {
                        name_en: curr.name || undefined,
                        name_ta: curr.name_ta || undefined,
                        description_en: curr.description || undefined,
                        description_ta: curr.description_ta || undefined,
                        management_en: curr.management || undefined,
                        management_ta: curr.management_ta || undefined,
                      });
                      setEditingPestId(null);
                      const ps = await listCropPests(Number(selectedCropId), 'en') as any[]; setPestsEn(ps);
                    }}>
                      <Ionicons name="save" size={18} color="#fff" />
                      <Text style={{ color:'#fff', fontWeight:'700' }}>Save {pestLang.toUpperCase()}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.masterBtn} onPress={()=> { setEditingPestId(null); Alert.alert('Saved','Edits saved'); }}>
                      <Ionicons name="close" size={18} color="#4caf50" />
                      <Text style={styles.masterBtnText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        })}

        {pestLang==='en' ? (
          <>
            <TextInput style={styles.input} placeholder="Pest name (EN)" placeholderTextColor="#999" value={pestNameEn} onChangeText={setPestNameEn} />
            <TextInput style={styles.input} placeholder="Description (EN)" placeholderTextColor="#999" value={pestDescEn} onChangeText={setPestDescEn} />
            <TextInput style={styles.input} placeholder="Management (EN)" placeholderTextColor="#999" value={pestMgmtEn} onChangeText={setPestMgmtEn} />
          </>
        ) : (
          <>
            <TextInput style={styles.input} placeholder="பூச்சி பெயர் (TA)" placeholderTextColor="#999" value={pestNameTa} onChangeText={setPestNameTa} />
            <TextInput style={styles.input} placeholder="விளக்கம் (TA)" placeholderTextColor="#999" value={pestDescTa} onChangeText={setPestDescTa} />
            <TextInput style={styles.input} placeholder="மேலாண்மை (TA)" placeholderTextColor="#999" value={pestMgmtTa} onChangeText={setPestMgmtTa} />
          </>
        )}
        <View style={styles.row}>
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="Image caption (EN)" placeholderTextColor="#999" value={pestImgCaption} onChangeText={setPestImgCaption} />
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="பட விளக்கம் (TA)" placeholderTextColor="#999" value={pestImgCaptionTa} onChangeText={setPestImgCaptionTa} />
        </View>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.masterBtn, { flex:1, justifyContent:'center' }]} onPress={async ()=>{ if (!pestNameTa.trim()) { Alert.alert('Add Tamil details first', 'Please enter the Tamil name before attaching an image.'); return; } const perm = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (perm.status !== 'granted') { Alert.alert('Permission required', 'Allow photo library access'); return; } const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images }); if (!r.canceled) setPestPendingImageUri(r.assets[0].uri); }}>
            <Ionicons name="image" size={18} color="#4caf50" />
            <Text style={styles.masterBtnText}>{pestPendingImageUri ? 'Change Image' : 'Attach Image (optional)'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={async ()=>{
            if (!selectedCropId) { Alert.alert('Error','Select a crop'); return; }
            if (!pestNameTa.trim()) { Alert.alert('Error','Enter the Tamil name (TA) for the pest before saving'); return; }
            const pestId = await addCropPestBoth(selectedCropId, { name_en: pestNameEn.trim()||undefined, name_ta: pestNameTa.trim()||undefined, description_en: pestDescEn.trim()||undefined, description_ta: pestDescTa.trim()||undefined, management_en: pestMgmtEn.trim()||undefined, management_ta: pestMgmtTa.trim()||undefined });
            if (pestId) {
              if (pestPendingImageUri) { const up = await uploadImage(pestPendingImageUri); await addCropPestImage(Number(pestId), up.url, pestImgCaption.trim()||undefined, pestImgCaptionTa.trim()||undefined, up.publicId); }
              const ps = await listCropPests(selectedCropId, 'en') as any[]; setPestsEn(ps);
              setPestNameEn(''); setPestNameTa(''); setPestDescEn(''); setPestDescTa(''); setPestMgmtEn(''); setPestMgmtTa(''); setPestImgCaption(''); setPestImgCaptionTa(''); setPestPendingImageUri(null);
              Alert.alert('Saved','Pest added');
            }
          }}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        {pestPendingImageUri ? (
          <View style={{ marginTop: 8 }}>
            <Text style={{ color:'#666', marginBottom: 6 }}>Preview</Text>
            <Image source={{ uri: pestPendingImageUri }} style={{ width: 120, height: 120, borderRadius: 8 }} />
          </View>
        ) : null}

        {/* Diseases section */}
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginTop: 12 }}>
          <Text style={{ color: '#2d5016', fontWeight: '700' }}>Diseases</Text>
          <View style={styles.segmented}>
            <TouchableOpacity onPress={()=> setDiseaseLang('en')} style={[styles.segment, diseaseLang==='en' && styles.segmentActive]}>
              <Text style={[styles.segmentText, diseaseLang==='en' && styles.segmentTextActive]}>EN</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={()=> setDiseaseLang('ta')} style={[styles.segment, diseaseLang==='ta' && styles.segmentActive]}>
              <Text style={[styles.segmentText, diseaseLang==='ta' && styles.segmentTextActive]}>TA</Text>
            </TouchableOpacity>
          </View>
        </View>
        {diseasesEn.map(d => {
          const thumb = (diseaseImages[d.id] && diseaseImages[d.id][0]?.image) || null;
          return (
            <View key={d.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
              <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
                <View style={{ flexDirection:'row', alignItems:'center', gap: 10, flex: 1, paddingRight: 8 }}>
                  <Image source={thumb ? { uri: thumb } : require('../assets/images/icon.png')} style={{ width: 48, height: 48, borderRadius: 8 }} />
                  <Text style={{ fontWeight: '600', flex:1 }} numberOfLines={2}>{diseaseLang==='ta' ? (d.name_ta || d.name) : d.name}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems:'center', gap: 8 }}>
                  <TouchableOpacity accessibilityLabel="Add Image" onPress={async ()=>{ const perm = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (perm.status !== 'granted') { Alert.alert('Permission required', 'Allow photo library access'); return; } const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images }); if (!r.canceled) { const up = await uploadImage(r.assets[0].uri); await addCropDiseaseImage(Number(d.id), up.url, undefined, undefined, up.publicId); const imgs = await listCropDiseaseImages(Number(d.id)); setDiseaseImages(prev=> ({...prev, [d.id]: imgs as any[]})); } }} style={styles.actionChip}>
                    <Ionicons name="image" size={16} color="#4caf50" />
                  </TouchableOpacity>
                  <TouchableOpacity accessibilityLabel="Edit Disease" onPress={()=> setEditingDiseaseId(d.id)} style={styles.actionChip}>
                    <Ionicons name="create" size={16} color="#4caf50" />
                  </TouchableOpacity>
                  <TouchableOpacity accessibilityLabel="Delete Disease" onPress={async ()=>{ Alert.alert('Delete Disease', 'Are you sure you want to delete this disease entirely?', [ { text:'Cancel', style:'cancel' }, { text:'Delete', style:'destructive', onPress: async ()=> { await deleteCropDisease(Number(d.id)); const ds = await listCropDiseases(Number(selectedCropId), 'en') as any[]; setDiseasesEn(ds); setDiseaseImages(prev=> { const n = {...prev}; delete n[d.id]; return n; }); Alert.alert('Deleted','Disease removed'); } } ]); }} style={[styles.actionChip, styles.actionChipDanger]}>
                    <Ionicons name="trash" size={16} color="#d32f2f" />
                  </TouchableOpacity>
                </View>
              </View>
              {Array.isArray(diseaseImages[d.id]) && diseaseImages[d.id].length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }} contentContainerStyle={{ gap: 10 }}>
                  {diseaseImages[d.id].map((img: any) => (
                    <View key={img.id} style={{ width: 92 }}>
                      <TouchableOpacity onPress={()=> { setDisImgModalDiseaseId(Number(d.id)); setDisImgModalImage(img); setDisImgModalVisible(true); }}>
                        <Image source={{ uri: img.image }} style={{ width: 92, height: 92, borderRadius: 8 }} />
                      </TouchableOpacity>
                      { (diseaseLang==='ta' ? img.caption_ta : img.caption) ? (
                        <Text style={{ fontSize:11, color:'#555', marginTop: 4 }} numberOfLines={2}>{diseaseLang==='ta' ? img.caption_ta : img.caption}</Text>
                      ) : null }
                    </View>
                  ))}
                </ScrollView>
              ) : null}

              {editingDiseaseId === d.id && (
                <View style={{ marginTop: 8, gap: 6 }}>
                  {diseaseLang==='en' ? (
                    <>
                      <TextInput style={styles.input} placeholder="Name (EN)" value={d.name || ''} onChangeText={(v)=> setDiseasesEn(prev=> prev.map(x=> x.id===d.id?{...x,name:v}:x))} />
                      <TextInput style={styles.input} placeholder="Description (EN)" value={d.description || ''} onChangeText={(v)=> setDiseasesEn(prev=> prev.map(x=> x.id===d.id?{...x,description:v}:x))} />
                      <TextInput style={styles.input} placeholder="Management (EN)" value={d.management || ''} onChangeText={(v)=> setDiseasesEn(prev=> prev.map(x=> x.id===d.id?{...x,management:v}:x))} />
                    </>
                  ) : (
                    <>
                      <TextInput style={styles.input} placeholder="Name (TA)" value={d.name_ta || ''} onChangeText={(v)=> setDiseasesEn(prev=> prev.map(x=> x.id===d.id?{...x,name_ta:v}:x))} />
                      <TextInput style={styles.input} placeholder="Description (TA)" value={d.description_ta || ''} onChangeText={(v)=> setDiseasesEn(prev=> prev.map(x=> x.id===d.id?{...x,description_ta:v}:x))} />
                      <TextInput style={styles.input} placeholder="Management (TA)" value={d.management_ta || ''} onChangeText={(v)=> setDiseasesEn(prev=> prev.map(x=> x.id===d.id?{...x,management_ta:v}:x))} />
                    </>
                  )}
                  <View style={{ flexDirection:'row', gap: 8 }}>
                    <TouchableOpacity style={styles.savePrimaryBtn} onPress={async ()=>{
                      const curr = diseasesEn.find(x=> x.id===d.id);
                      if (!curr || !selectedCropId) return;
                      await addCropDiseaseBoth(Number(selectedCropId), {
                        name_en: curr.name || undefined,
                        name_ta: curr.name_ta || undefined,
                        description_en: curr.description || undefined,
                        description_ta: curr.description_ta || undefined,
                        management_en: curr.management || undefined,
                        management_ta: curr.management_ta || undefined,
                      });
                      setEditingDiseaseId(null);
                      const ds = await listCropDiseases(Number(selectedCropId), 'en') as any[]; setDiseasesEn(ds);
                    }}>
                      <Ionicons name="save" size={18} color="#fff" />
                      <Text style={{ color:'#fff', fontWeight:'700' }}>Save {diseaseLang.toUpperCase()}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.masterBtn} onPress={()=> { setEditingDiseaseId(null); Alert.alert('Saved','Edits saved'); }}>
                      <Ionicons name="close" size={18} color="#4caf50" />
                      <Text style={styles.masterBtnText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        })}

        {diseaseLang==='en' ? (
          <>
            <TextInput style={styles.input} placeholder="Disease name (EN)" placeholderTextColor="#999" value={diseaseNameEn} onChangeText={setDiseaseNameEn} />
            <TextInput style={styles.input} placeholder="Description (EN)" placeholderTextColor="#999" value={diseaseDescEn} onChangeText={setDiseaseDescEn} />
            <TextInput style={styles.input} placeholder="Management (EN)" placeholderTextColor="#999" value={diseaseMgmtEn} onChangeText={setDiseaseMgmtEn} />
          </>
        ) : (
          <>
            <TextInput style={styles.input} placeholder="நோய் பெயர் (TA)" placeholderTextColor="#999" value={diseaseNameTa} onChangeText={setDiseaseNameTa} />
            <TextInput style={styles.input} placeholder="விளக்கம் (TA)" placeholderTextColor="#999" value={diseaseDescTa} onChangeText={setDiseaseDescTa} />
            <TextInput style={styles.input} placeholder="மேலாண்மை (TA)" placeholderTextColor="#999" value={diseaseMgmtTa} onChangeText={setDiseaseMgmtTa} />
          </>
        )}
        <View style={styles.row}>
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="Image caption (EN)" placeholderTextColor="#999" value={diseaseImgCaption} onChangeText={setDiseaseImgCaption} />
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="பட விளக்கம் (TA)" placeholderTextColor="#999" value={diseaseImgCaptionTa} onChangeText={setDiseaseImgCaptionTa} />
        </View>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.masterBtn, { flex:1, justifyContent:'center' }]} onPress={async ()=>{ const perm = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (perm.status !== 'granted') { Alert.alert('Permission required', 'Allow photo library access'); return; } const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images }); if (!r.canceled) setDiseasePendingImageUri(r.assets[0].uri); }}>
            <Ionicons name="image" size={18} color="#4caf50" />
            <Text style={styles.masterBtnText}>{diseasePendingImageUri ? 'Change Image' : 'Attach Image (optional)'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={async ()=>{
            if (!selectedCropId) { Alert.alert('Error','Select a crop'); return; }
            if (!diseaseNameEn.trim() && !diseaseNameTa.trim()) { Alert.alert('Error','Enter disease name in EN or TA'); return; }
            const diseaseId = await addCropDiseaseBoth(selectedCropId, { name_en: diseaseNameEn.trim()||undefined, name_ta: diseaseNameTa.trim()||undefined, description_en: diseaseDescEn.trim()||undefined, description_ta: diseaseDescTa.trim()||undefined, management_en: diseaseMgmtEn.trim()||undefined, management_ta: diseaseMgmtTa.trim()||undefined });
            if (diseaseId) {
              if (diseasePendingImageUri) { const up = await uploadImage(diseasePendingImageUri); await addCropDiseaseImage(Number(diseaseId), up.url, diseaseImgCaption.trim()||undefined, diseaseImgCaptionTa.trim()||undefined, up.publicId); }
              const ds = await listCropDiseases(selectedCropId, 'en') as any[]; setDiseasesEn(ds);
              setDiseaseNameEn(''); setDiseaseNameTa(''); setDiseaseDescEn(''); setDiseaseDescTa(''); setDiseaseMgmtEn(''); setDiseaseMgmtTa(''); setDiseaseImgCaption(''); setDiseaseImgCaptionTa(''); setDiseasePendingImageUri(null);
              Alert.alert('Saved','Disease added');
            }
          }}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        {diseasePendingImageUri ? (
          <View style={{ marginTop: 8 }}>
            <Text style={{ color:'#666', marginBottom: 6 }}>Preview</Text>
            <Image source={{ uri: diseasePendingImageUri }} style={{ width: 120, height: 120, borderRadius: 8 }} />
          </View>
        ) : null}

        <View style={{ height: 18 }} />
      </ScrollView>
      )}

      {/* Pest Image Modal */}
      <Modal visible={imgModalVisible} animationType="slide" transparent onRequestClose={()=> setImgModalVisible(false)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.4)', justifyContent:'center', alignItems:'center', padding:16 }}>
          <View style={{ width:'92%', borderRadius:16, backgroundColor:'#fff', padding:16 }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
              <Text style={{ fontSize:16, fontWeight:'700', color:'#2d5016' }}>Pest Image</Text>
              <TouchableOpacity onPress={()=> setImgModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            {imgModalImage ? (
              <View style={{ alignItems:'center', marginTop:12 }}>
                <Image source={{ uri: imgModalImage.image }} style={{ width:'100%', height:220, borderRadius:12 }} resizeMode="cover" />
                {(pestLang==='ta' ? imgModalImage.caption_ta : imgModalImage.caption) ? (
                  <Text style={{ color:'#555', marginTop:8 }}>{pestLang==='ta' ? imgModalImage.caption_ta : imgModalImage.caption}</Text>
                ) : null}
              </View>
            ) : null}
            <View style={{ flexDirection:'row', gap:10, marginTop:16 }}>
              <TouchableOpacity style={[styles.masterBtn, { flex:1, justifyContent:'center' }]} onPress={async ()=>{
                if (!imgModalPestId) return;
                const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (perm.status !== 'granted') { Alert.alert('Permission required', 'Allow photo library access'); return; }
                const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
                if (!r.canceled) {
                  const up = await uploadImage(r.assets[0].uri);
                  await addCropPestImage(Number(imgModalPestId), up.url, pestImgCaption.trim()||undefined, pestImgCaptionTa.trim()||undefined, up.publicId);
                  const imgs = await listCropPestImages(Number(imgModalPestId));
                  setPestImages(prev=> ({...prev, [Number(imgModalPestId)]: imgs as any[]}));
                  Alert.alert('Saved','Image added');
                  setImgModalVisible(false);
                }
              }}>
                <Ionicons name="add" size={18} color="#4caf50" />
                <Text style={styles.masterBtnText}>Add Image</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.masterBtn, { flex:1, justifyContent:'center', borderColor:'#f8d7da', backgroundColor:'#fdecea' }]} onPress={async ()=>{
                if (!imgModalImage) return;
                Alert.alert('Delete Image', 'Delete this image?', [ { text:'Cancel', style:'cancel' }, { text:'Delete', style:'destructive', onPress: async ()=> { await deleteCropPestImage(Number(imgModalImage.id)); if (imgModalPestId) { const imgs = await listCropPestImages(Number(imgModalPestId)); setPestImages(prev=> ({...prev, [Number(imgModalPestId)]: imgs as any[]})); } setImgModalVisible(false); Alert.alert('Deleted','Image removed'); } } ]);
              }}>
                <Ionicons name="trash" size={18} color="#d32f2f" />
                <Text style={[styles.masterBtnText, { color:'#d32f2f' }]}>Delete Image</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Disease Image Modal */}
      <Modal visible={disImgModalVisible} animationType="slide" transparent onRequestClose={()=> setDisImgModalVisible(false)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.4)', justifyContent:'center', alignItems:'center', padding:16 }}>
          <View style={{ width:'92%', borderRadius:16, backgroundColor:'#fff', padding:16 }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
              <Text style={{ fontSize:16, fontWeight:'700', color:'#2d5016' }}>Disease Image</Text>
              <TouchableOpacity onPress={()=> setDisImgModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            {disImgModalImage ? (
              <View style={{ alignItems:'center', marginTop:12 }}>
                <Image source={{ uri: disImgModalImage.image }} style={{ width:'100%', height:220, borderRadius:12 }} resizeMode="cover" />
                {(diseaseLang==='ta' ? disImgModalImage.caption_ta : disImgModalImage.caption) ? (
                  <Text style={{ color:'#555', marginTop:8 }}>{diseaseLang==='ta' ? disImgModalImage.caption_ta : disImgModalImage.caption}</Text>
                ) : null}
              </View>
            ) : null}
            <View style={{ flexDirection:'row', gap:10, marginTop:16 }}>
              <TouchableOpacity style={[styles.masterBtn, { flex:1, justifyContent:'center' }]} onPress={async ()=>{
                if (!disImgModalDiseaseId) return;
                const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (perm.status !== 'granted') { Alert.alert('Permission required', 'Allow photo library access'); return; }
                const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
                if (!r.canceled) {
                  const up = await uploadImage(r.assets[0].uri);
                  await addCropDiseaseImage(Number(disImgModalDiseaseId), up.url, diseaseImgCaption.trim()||undefined, diseaseImgCaptionTa.trim()||undefined, up.publicId);
                  const imgs = await listCropDiseaseImages(Number(disImgModalDiseaseId));
                  setDiseaseImages(prev=> ({...prev, [Number(disImgModalDiseaseId)]: imgs as any[]}));
                  Alert.alert('Saved','Image added');
                  setDisImgModalVisible(false);
                }
              }}>
                <Ionicons name="add" size={18} color="#4caf50" />
                <Text style={styles.masterBtnText}>Add Image</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.masterBtn, { flex:1, justifyContent:'center', borderColor:'#f8d7da', backgroundColor:'#fdecea' }]} onPress={async ()=>{
                if (!disImgModalImage) return;
                Alert.alert('Delete Image', 'Delete this image?', [ { text:'Cancel', style:'cancel' }, { text:'Delete', style:'destructive', onPress: async ()=> { await deleteCropDiseaseImage(Number(disImgModalImage.id)); if (disImgModalDiseaseId) { const imgs = await listCropDiseaseImages(Number(disImgModalDiseaseId)); setDiseaseImages(prev=> ({...prev, [Number(disImgModalDiseaseId)]: imgs as any[]})); } setDisImgModalVisible(false); Alert.alert('Deleted','Image removed'); } } ]);
              }}>
                <Ionicons name="trash" size={18} color="#d32f2f" />
                <Text style={[styles.masterBtnText, { color:'#d32f2f' }]}>Delete Image</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#fff' }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#4caf50', paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12, backgroundColor: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center' },
  masterBtn: { borderWidth: 1, borderColor: '#cde8d3', backgroundColor:'#f1f8f4', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  addBtn: { backgroundColor:'#4caf50', padding: 12, borderRadius: 10, marginLeft: 8, alignItems:'center', justifyContent:'center' },
  savePrimaryBtn: { backgroundColor:'#4caf50', paddingVertical:10, paddingHorizontal:12, borderRadius:10, flexDirection:'row', alignItems:'center', gap:8 },
  masterBtnText: { color:'#2d5016', fontWeight:'700' },
  segmented: { flexDirection:'row', backgroundColor:'#f0f0f0', borderRadius: 8, overflow:'hidden' },
  segment: { paddingVertical: 6, paddingHorizontal: 12 },
  segmentActive: { backgroundColor:'#f1f8f4' },
  segmentText: { color:'#666', fontWeight:'600' },
  segmentTextActive: { color:'#2d5016' },
  actionChip: { padding: 8, backgroundColor:'#f1f8f4', borderRadius: 8 },
  actionChipDanger: { backgroundColor:'#fdecea' },
});
