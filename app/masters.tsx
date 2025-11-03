import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Alert, ScrollView, Image, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAllCrops, addCrop, upsertCropGuide, listCropPests, addCropPestBoth, addCropPestImage, listCropDiseases, addCropDiseaseBoth, addCropDiseaseImage, getCropGuide, updateCropPest, updateCropDisease, deleteCropPestImage, deleteCropDiseaseImage, deleteCropPest, deleteCropDisease, deleteCrop, deleteCropGuide, listCropPestImages, listCropDiseaseImages } from '../lib/database';
import { uploadImage } from '../lib/upload';
import { UserContext } from '../context/UserContext';

import * as ImagePicker from 'expo-image-picker';

export default function Masters() {
  const { user } = useContext(UserContext);
  const isAdmin = user?.is_admin === 1;

  // Crop Doctor Manager state
  const [guideModalVisible, setGuideModalVisible] = useState(false);
  const [crops, setCrops] = useState<any[]>([]);
  const [selectedCropId, setSelectedCropId] = useState<number | null>(null);
  const [newCropNameEn, setNewCropNameEn] = useState('');
  const [newCropNameTa, setNewCropNameTa] = useState('');
  const [newCropImage, setNewCropImage] = useState<string | null>(null);

  const [guideTextEn, setGuideTextEn] = useState('');
  const [guideTextTa, setGuideTextTa] = useState('');

  const [pestsEn, setPestsEn] = useState<any[]>([]);
  const [diseasesEn, setDiseasesEn] = useState<any[]>([]);
  const [editingPestId, setEditingPestId] = useState<number | null>(null);
  const [editingDiseaseId, setEditingDiseaseId] = useState<number | null>(null);
  const [pestImages, setPestImages] = useState<Record<number, any[]>>({});
  const [diseaseImages, setDiseaseImages] = useState<Record<number, any[]>>({});

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

  useEffect(() => { (async ()=>{ const all = await getAllCrops() as any[]; setCrops(all); if (all[0]) setSelectedCropId(Number(all[0].id)); })(); }, []);

  useEffect(() => {
    (async () => {
      if (!selectedCropId) return;
      // load existing guides
      const en = await getCropGuide(selectedCropId, 'en');
      const ta = await getCropGuide(selectedCropId, 'ta');
      setGuideTextEn((en as any)?.cultivation_guide || '');
      setGuideTextTa((ta as any)?.cultivation_guide || '');
      // load pests/diseases
      const ps = await listCropPests(selectedCropId, 'en') as any[];
      const ds = await listCropDiseases(selectedCropId, 'en') as any[];
      setPestsEn(ps);
      setDiseasesEn(ds);
      // fetch images for each
      const pimEntries = await Promise.all(ps.map(async p => [p.id, await listCropPestImages(Number(p.id))] as const));
      const dimEntries = await Promise.all(ds.map(async d => [d.id, await listCropDiseaseImages(Number(d.id))] as const));
      const pim: Record<number, any[]> = {}; pimEntries.forEach(([id, imgs]) => { pim[id] = imgs as any[]; });
      const dim: Record<number, any[]> = {}; dimEntries.forEach(([id, imgs]) => { dim[id] = imgs as any[]; });
      setPestImages(pim); setDiseaseImages(dim);
    })();
  }, [selectedCropId]);


  return (
    <SafeAreaView style={styles.container}>
      {Platform.OS === 'android' ? <View style={{ height: 20, backgroundColor: '#4caf50' }} /> : null}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Masters</Text>
        <View style={{ width: 24 }} />
      </View>


      <View style={{ paddingHorizontal: 12, paddingTop: 12 }}>
        <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Masters</Text>
        <View style={{ gap: 10 }}>
          <TouchableOpacity style={styles.masterBtn} onPress={() => setGuideModalVisible(true)}>
            <Ionicons name="book" size={18} color="#4caf50" />
            <Text style={styles.masterBtnText}>Crop Doctor Manager</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.masterBtn} onPress={() => router.push('/(tabs)/admin')}>
            <Ionicons name="pricetags" size={18} color="#4caf50" />
            <Text style={styles.masterBtnText}>Products, Keywords & Admins</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.masterBtn} onPress={() => router.push('/(tabs)/adminOrders')}>
            <Ionicons name="receipt" size={18} color="#4caf50" />
            <Text style={styles.masterBtnText}>Manage Orders</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Crop Doctor Manager */}
      <Modal visible={guideModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setGuideModalVisible(false)}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff' }} />
        {Platform.OS === 'android' ? <View style={{ height: 20, backgroundColor: '#4caf50' }} /> : null}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setGuideModalVisible(false)}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Crop Doctor Manager</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16 }}>

          {/* Create Crop */}
          <View style={{ gap: 12 }}>
            <Text style={{ color: '#2d5016', fontWeight: '700' }}>Create Crop</Text>
            <TextInput style={[styles.input, { marginBottom: 8 }]} placeholder="Crop name (English)" placeholderTextColor="#999" value={newCropNameEn} onChangeText={setNewCropNameEn} />
            <TextInput style={[styles.input, { marginBottom: 8 }]} placeholder="பயிர் பெயர் (Tamil)" placeholderTextColor="#999" value={newCropNameTa} onChangeText={setNewCropNameTa} />
            <TouchableOpacity style={styles.imagePicker} onPress={async ()=>{ 
              const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (perm.status !== 'granted') { Alert.alert('Permission required', 'Allow photo library access'); return; }
              const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images }); 
              if (!res.canceled) setNewCropImage(res.assets[0].uri); }}>
              <Ionicons name="camera" size={22} color="#4caf50" />
              <Text style={{ color: '#4caf50', fontWeight: '600' }}>{newCropImage ? 'Change Image' : 'Add Image (optional)'}</Text>
            </TouchableOpacity>
            {newCropImage && <Image source={{ uri: newCropImage }} style={{ width: '100%', height: 160, borderRadius: 8 }} />}
            <TouchableOpacity style={styles.savePrimaryBtn} onPress={async ()=>{
              if (!newCropNameEn.trim()) { Alert.alert('Error','Enter crop name'); return; }
              let imageUrl: string | undefined = undefined;
              try { if (newCropImage) { const up = await uploadImage(newCropImage); imageUrl = up.url; } } catch (e:any) { console.warn('Crop image upload failed:', e?.message||e); }
              const id = await addCrop({ name: newCropNameEn.trim(), name_ta: newCropNameTa.trim() || undefined, image: imageUrl });
              if (id) {
                const all = await getAllCrops() as any[]; setCrops(all);
                setSelectedCropId(Number(id));
                setNewCropNameEn(''); setNewCropNameTa(''); setNewCropImage(null);
                Alert.alert('Saved','Crop added');
              } else { Alert.alert('Error','Failed to add crop'); }
            }}>
              <Ionicons name="save" size={18} color="#fff" />
              <Text style={{ color:'#fff', fontWeight:'700' }}>Save Crop</Text>
            </TouchableOpacity>
          </View>

          {/* Working crop selector */}
          {crops.length === 0 ? (
            <Text style={{ color: '#666' }}>Add crops first.</Text>
          ) : (
            <>
              <View style={[styles.row, { marginBottom: 8, alignItems:'center' }]}>
                <TouchableOpacity style={[styles.input, { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                  onPress={() => {
                    const idx = crops.findIndex(c=> Number(c.id)===selectedCropId);
                    const next = crops[(idx+1)%crops.length]; setSelectedCropId(Number(next.id));
                  }}>
                  <Text>{(crops.find(c=>Number(c.id)===selectedCropId)||{}).name || 'Select Crop'}</Text>
                  <Ionicons name="chevron-down" size={18} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.masterBtn, { marginLeft: 8, borderColor:'#f8d7da', backgroundColor:'#fdecea' }]} onPress={async ()=>{ if (!selectedCropId) return; await deleteCrop(Number(selectedCropId)); const all = await getAllCrops() as any[]; setCrops(all); setSelectedCropId(all[0]? Number(all[0].id) : null); Alert.alert('Deleted','Crop removed'); }}>
                  <Ionicons name="trash" size={18} color="#d32f2f" />
                  <Text style={[styles.masterBtnText, { color:'#d32f2f' }]}>Delete Crop</Text>
                </TouchableOpacity>
              </View>

              {/* Cultivation guide EN/TA */}
              <Text style={{ color: '#2d5016', fontWeight: '700', marginBottom: 6 }}>Cultivation Guide (EN)</Text>
              <TextInput style={[styles.input, { minHeight: 80 }]} multiline placeholder="Guide text" placeholderTextColor="#999" value={guideTextEn} onChangeText={setGuideTextEn} />
              <Text style={{ color: '#2d5016', fontWeight: '700', marginTop: 10, marginBottom: 6 }}>விளைச்சல் வழிகாட்டி (TA)</Text>
              <TextInput style={[styles.input, { minHeight: 80 }]} multiline placeholder="Guide text" placeholderTextColor="#999" value={guideTextTa} onChangeText={setGuideTextTa} />
              <View style={{ flexDirection:'row', gap: 8 }}>
                <TouchableOpacity style={styles.masterBtn} onPress={async ()=>{ if(!selectedCropId) return; const tasks=[] as any[]; if (guideTextEn.trim()) tasks.push(upsertCropGuide(selectedCropId, 'en', { cultivation_guide: guideTextEn.trim() })); if (guideTextTa.trim()) tasks.push(upsertCropGuide(selectedCropId, 'ta', { cultivation_guide: guideTextTa.trim() })); await Promise.all(tasks); const en = await getCropGuide(selectedCropId,'en'); const ta = await getCropGuide(selectedCropId,'ta'); setGuideTextEn((en as any)?.cultivation_guide||''); setGuideTextTa((ta as any)?.cultivation_guide||''); Alert.alert('Saved'); }}>
                  <Ionicons name="save" size={18} color="#4caf50" /><Text style={styles.masterBtnText}>Save Guide</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.masterBtn, { borderColor:'#f8d7da', backgroundColor:'#fdecea' }]} onPress={async ()=>{ if(!selectedCropId) return; await deleteCropGuide(selectedCropId, 'en'); await deleteCropGuide(selectedCropId, 'ta'); setGuideTextEn(''); setGuideTextTa(''); Alert.alert('Deleted','Guide cleared'); }}>
                  <Ionicons name="trash" size={18} color="#d32f2f" /><Text style={[styles.masterBtnText,{ color:'#d32f2f' }]}>Clear Guide</Text>
                </TouchableOpacity>
              </View>

              {/* Pests list + add */}
              <Text style={{ color: '#2d5016', fontWeight: '700', marginTop: 12 }}>Pests</Text>
              {pestsEn.map(p => {
                const thumb = (pestImages[p.id] && pestImages[p.id][0]?.image) || null;
                return (
                  <View key={p.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
                    <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
                      <View style={{ flexDirection:'row', alignItems:'center', gap: 10, flex: 1, paddingRight: 8 }}>
                        <Image source={thumb ? { uri: thumb } : require('../assets/images/icon.png')} style={{ width: 48, height: 48, borderRadius: 8 }} />
                        <Text style={{ fontWeight: '600' }} numberOfLines={1}>{p.name}{p.name_ta ? ` / ${p.name_ta}` : ''}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems:'center', gap: 8 }}>
                        <TouchableOpacity onPress={async ()=>{ const perm = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (perm.status !== 'granted') { Alert.alert('Permission required', 'Allow photo library access'); return; } const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images }); if (!r.canceled) { const up = await uploadImage(r.assets[0].uri); await addCropPestImage(Number(p.id), up.url, undefined, undefined, up.publicId); const imgs = await listCropPestImages(Number(p.id)); setPestImages(prev=> ({...prev, [p.id]: imgs as any[]})); } }} style={{ padding: 8 }}>
                          <Ionicons name="image" size={18} color="#4caf50" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={()=> setEditingPestId(p.id)} style={{ padding: 8 }}>
                          <Ionicons name="create" size={18} color="#4caf50" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={async ()=>{ await deleteCropPest(Number(p.id)); const ps = await listCropPests(Number(selectedCropId), 'en') as any[]; setPestsEn(ps); setPestImages(prev=> { const n = {...prev}; delete n[p.id]; return n; }); }} style={{ padding: 8 }}>
                          <Ionicons name="trash" size={18} color="#d32f2f" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {editingPestId === p.id && (
                      <View style={{ marginTop: 8, gap: 6 }}>
                        <TextInput style={styles.input} placeholder="Name (EN)" value={p.name || ''} onChangeText={(v)=> setPestsEn(prev=> prev.map(x=> x.id===p.id?{...x,name:v}:x))} />
                        <TextInput style={styles.input} placeholder="Name (TA)" value={p.name_ta || ''} onChangeText={(v)=> setPestsEn(prev=> prev.map(x=> x.id===p.id?{...x,name_ta:v}:x))} />
                        <TextInput style={styles.input} placeholder="Description (EN)" value={p.description || ''} onChangeText={(v)=> setPestsEn(prev=> prev.map(x=> x.id===p.id?{...x,description:v}:x))} />
                        <TextInput style={styles.input} placeholder="Description (TA)" value={p.description_ta || ''} onChangeText={(v)=> setPestsEn(prev=> prev.map(x=> x.id===p.id?{...x,description_ta:v}:x))} />
                        <TextInput style={styles.input} placeholder="Management (EN)" value={p.management || ''} onChangeText={(v)=> setPestsEn(prev=> prev.map(x=> x.id===p.id?{...x,management:v}:x))} />
                        <TextInput style={styles.input} placeholder="Management (TA)" value={p.management_ta || ''} onChangeText={(v)=> setPestsEn(prev=> prev.map(x=> x.id===p.id?{...x,management_ta:v}:x))} />
                        <View style={{ flexDirection:'row', gap: 8 }}>
                          <TouchableOpacity style={styles.savePrimaryBtn} onPress={async ()=>{
                            const curr = pestsEn.find(x=> x.id===p.id);
                            if (!curr) return;
                            await updateCropPest(p.id, { name: curr.name, name_ta: curr.name_ta, description: curr.description, description_ta: curr.description_ta, management: curr.management, management_ta: curr.management_ta });
                            setEditingPestId(null);
                            const ps = await listCropPests(Number(selectedCropId), 'en') as any[]; setPestsEn(ps);
                          }}>
                            <Ionicons name="save" size={18} color="#fff" />
                            <Text style={{ color:'#fff', fontWeight:'700' }}>Save</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.masterBtn} onPress={()=> setEditingPestId(null)}>
                            <Ionicons name="close" size={18} color="#4caf50" />
                            <Text style={styles.masterBtnText}>Cancel</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
              <TextInput style={styles.input} placeholder="Pest name (EN)" placeholderTextColor="#999" value={pestNameEn} onChangeText={setPestNameEn} />
              <TextInput style={styles.input} placeholder="பூச்சி பெயர் (TA)" placeholderTextColor="#999" value={pestNameTa} onChangeText={setPestNameTa} />
              <TextInput style={styles.input} placeholder="Description (EN)" placeholderTextColor="#999" value={pestDescEn} onChangeText={setPestDescEn} />
              <TextInput style={styles.input} placeholder="விளக்கம் (TA)" placeholderTextColor="#999" value={pestDescTa} onChangeText={setPestDescTa} />
              <TextInput style={styles.input} placeholder="Management (EN)" placeholderTextColor="#999" value={pestMgmtEn} onChangeText={setPestMgmtEn} />
              <TextInput style={styles.input} placeholder="மேலாண்மை (TA)" placeholderTextColor="#999" value={pestMgmtTa} onChangeText={setPestMgmtTa} />
              <View style={styles.row}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Image caption (EN)" placeholderTextColor="#999" value={pestImgCaption} onChangeText={setPestImgCaption} />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="பட விளக்கம் (TA)" placeholderTextColor="#999" value={pestImgCaptionTa} onChangeText={setPestImgCaptionTa} />
              </View>
              <View style={styles.row}>
                <TouchableOpacity style={[styles.masterBtn, { flex:1, justifyContent:'center' }]} onPress={async ()=>{ const perm = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (perm.status !== 'granted') { Alert.alert('Permission required', 'Allow photo library access'); return; } const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images }); if (!r.canceled) setPestPendingImageUri(r.assets[0].uri); }}>
                  <Ionicons name="image" size={18} color="#4caf50" />
                  <Text style={styles.masterBtnText}>{pestPendingImageUri ? 'Change Image' : 'Attach Image (optional)'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addBtn} onPress={async ()=>{
                  if (!selectedCropId) { Alert.alert('Error','Select a crop'); return; }
                  if (!pestNameEn.trim() || !pestNameTa.trim()) { Alert.alert('Error','Enter pest name in both languages'); return; }
                  const pestId = await addCropPestBoth(selectedCropId, { name_en: pestNameEn.trim(), name_ta: pestNameTa.trim(), description_en: pestDescEn.trim()||undefined, description_ta: pestDescTa.trim()||undefined, management_en: pestMgmtEn.trim()||undefined, management_ta: pestMgmtTa.trim()||undefined });
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

              {/* Diseases list + add */}
              <Text style={{ color: '#2d5016', fontWeight: '700', marginTop: 12 }}>Diseases</Text>
              {diseasesEn.map(d => {
                const thumb = (diseaseImages[d.id] && diseaseImages[d.id][0]?.image) || null;
                return (
                  <View key={d.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
                    <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
                      <View style={{ flexDirection:'row', alignItems:'center', gap: 10, flex: 1, paddingRight: 8 }}>
                        <Image source={thumb ? { uri: thumb } : require('../assets/images/icon.png')} style={{ width: 48, height: 48, borderRadius: 8 }} />
                        <Text style={{ fontWeight: '600' }} numberOfLines={1}>{d.name}{d.name_ta ? ` / ${d.name_ta}` : ''}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems:'center', gap: 8 }}>
                        <TouchableOpacity onPress={async ()=>{ const perm = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (perm.status !== 'granted') { Alert.alert('Permission required', 'Allow photo library access'); return; } const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images }); if (!r.canceled) { const up = await uploadImage(r.assets[0].uri); await addCropDiseaseImage(Number(d.id), up.url, undefined, undefined, up.publicId); const imgs = await listCropDiseaseImages(Number(d.id)); setDiseaseImages(prev=> ({...prev, [d.id]: imgs as any[]})); } }} style={{ padding: 8 }}>
                          <Ionicons name="image" size={18} color="#4caf50" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={()=> setEditingDiseaseId(d.id)} style={{ padding: 8 }}>
                          <Ionicons name="create" size={18} color="#4caf50" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={async ()=>{ await deleteCropDisease(Number(d.id)); const ds = await listCropDiseases(Number(selectedCropId), 'en') as any[]; setDiseasesEn(ds); setDiseaseImages(prev=> { const n = {...prev}; delete n[d.id]; return n; }); }} style={{ padding: 8 }}>
                          <Ionicons name="trash" size={18} color="#d32f2f" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {editingDiseaseId === d.id && (
                      <View style={{ marginTop: 8, gap: 6 }}>
                        <TextInput style={styles.input} placeholder="Name (EN)" value={d.name || ''} onChangeText={(v)=> setDiseasesEn(prev=> prev.map(x=> x.id===d.id?{...x,name:v}:x))} />
                        <TextInput style={styles.input} placeholder="Name (TA)" value={d.name_ta || ''} onChangeText={(v)=> setDiseasesEn(prev=> prev.map(x=> x.id===d.id?{...x,name_ta:v}:x))} />
                        <TextInput style={styles.input} placeholder="Description (EN)" value={d.description || ''} onChangeText={(v)=> setDiseasesEn(prev=> prev.map(x=> x.id===d.id?{...x,description:v}:x))} />
                        <TextInput style={styles.input} placeholder="Description (TA)" value={d.description_ta || ''} onChangeText={(v)=> setDiseasesEn(prev=> prev.map(x=> x.id===d.id?{...x,description_ta:v}:x))} />
                        <TextInput style={styles.input} placeholder="Management (EN)" value={d.management || ''} onChangeText={(v)=> setDiseasesEn(prev=> prev.map(x=> x.id===d.id?{...x,management:v}:x))} />
                        <TextInput style={styles.input} placeholder="Management (TA)" value={d.management_ta || ''} onChangeText={(v)=> setDiseasesEn(prev=> prev.map(x=> x.id===d.id?{...x,management_ta:v}:x))} />
                        <View style={{ flexDirection:'row', gap: 8 }}>
                          <TouchableOpacity style={styles.savePrimaryBtn} onPress={async ()=>{
                            const curr = diseasesEn.find(x=> x.id===d.id);
                            if (!curr) return;
                            await updateCropDisease(d.id, { name: curr.name, name_ta: curr.name_ta, description: curr.description, description_ta: curr.description_ta, management: curr.management, management_ta: curr.management_ta });
                            setEditingDiseaseId(null);
                            const ds = await listCropDiseases(Number(selectedCropId), 'en') as any[]; setDiseasesEn(ds);
                          }}>
                            <Ionicons name="save" size={18} color="#fff" />
                            <Text style={{ color:'#fff', fontWeight:'700' }}>Save</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.masterBtn} onPress={()=> setEditingDiseaseId(null)}>
                            <Ionicons name="close" size={18} color="#4caf50" />
                            <Text style={styles.masterBtnText}>Cancel</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
              <TextInput style={styles.input} placeholder="Disease name (EN)" placeholderTextColor="#999" value={diseaseNameEn} onChangeText={setDiseaseNameEn} />
              <TextInput style={styles.input} placeholder="நோய் பெயர் (TA)" placeholderTextColor="#999" value={diseaseNameTa} onChangeText={setDiseaseNameTa} />
              <TextInput style={styles.input} placeholder="Description (EN)" placeholderTextColor="#999" value={diseaseDescEn} onChangeText={setDiseaseDescEn} />
              <TextInput style={styles.input} placeholder="விளக்கம் (TA)" placeholderTextColor="#999" value={diseaseDescTa} onChangeText={setDiseaseDescTa} />
              <TextInput style={styles.input} placeholder="Management (EN)" placeholderTextColor="#999" value={diseaseMgmtEn} onChangeText={setDiseaseMgmtEn} />
              <TextInput style={styles.input} placeholder="மேலாண்மை (TA)" placeholderTextColor="#999" value={diseaseMgmtTa} onChangeText={setDiseaseMgmtTa} />
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
                  if (!diseaseNameEn.trim() || !diseaseNameTa.trim()) { Alert.alert('Error','Enter disease name in both languages'); return; }
                  const diseaseId = await addCropDiseaseBoth(selectedCropId, { name_en: diseaseNameEn.trim(), name_ta: diseaseNameTa.trim(), description_en: diseaseDescEn.trim()||undefined, description_ta: diseaseDescTa.trim()||undefined, management_en: diseaseMgmtEn.trim()||undefined, management_ta: diseaseMgmtTa.trim()||undefined });
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

            </>
          )}

        </ScrollView>
        <View style={{ height: 10 }} />
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#fff' }} />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#4caf50', paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  section: { backgroundColor: '#fff', margin: 12, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e0e0e0' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2d5016', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  input: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 12 },
  addBtn: { backgroundColor: '#4caf50', padding: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  plantRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  masterBtn: { backgroundColor: '#f1f8f4', borderWidth: 1, borderColor: '#c8e6c9', padding: 12, borderRadius: 8, flexDirection: 'row', gap: 8, alignItems: 'center' },
  masterBtnText: { color: '#2d5016', fontWeight: '600' },
  imagePicker: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 2, borderStyle: 'dashed', borderColor: '#4caf50', padding: 14, borderRadius: 10, justifyContent: 'center' },
  savePrimaryBtn: { backgroundColor: '#4caf50', paddingVertical: 14, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  chip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: '#e0e0e0', backgroundColor: '#f9f9f9' },
  chipActive: { backgroundColor: '#eaf6ec', borderColor: '#4caf50' },
  chipText: { color: '#666', fontWeight: '600' },
  chipTextActive: { color: '#2d5016' },
});
