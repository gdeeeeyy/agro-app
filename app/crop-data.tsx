import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Image, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage } from '../lib/upload';
import { getAllCrops, addCrop, getCropGuide, upsertCropGuide, listCropPests, addCropPestBoth, addCropPestImage, listCropDiseases, addCropDiseaseBoth, addCropDiseaseImage, listCropPestImages, listCropDiseaseImages, deleteCropPestImage, deleteCropDiseaseImage, deleteCropPest, deleteCropDisease, deleteCropGuide, updateCropPest, updateCropDisease } from '../lib/database';

export default function CropDataPage() {
  const [crops, setCrops] = useState<any[]>([]);
  const [selectedCropId, setSelectedCropId] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [newCropNameEn, setNewCropNameEn] = useState('');
  const [newCropNameTa, setNewCropNameTa] = useState('');
  const [newCropImage, setNewCropImage] = useState<string | null>(null);

  const [guideLang, setGuideLang] = useState<'en'|'ta'>('en');
  const [guideTextEn, setGuideTextEn] = useState('');
  const [guideTextTa, setGuideTextTa] = useState('');
  const [guideEditableEn, setGuideEditableEn] = useState(true);
  const [guideEditableTa, setGuideEditableTa] = useState(true);

  const [pestLang, setPestLang] = useState<'en'|'ta'>('en');
  const [pestsEn, setPestsEn] = useState<any[]>([]);
  const [pestImages, setPestImages] = useState<Record<number, any[]>>({});
  const [pestNameEn, setPestNameEn] = useState('');
  const [pestNameTa, setPestNameTa] = useState('');
  const [pestDescEn, setPestDescEn] = useState('');
  const [pestDescTa, setPestDescTa] = useState('');
  const [pestMgmtEn, setPestMgmtEn] = useState('');
  const [pestMgmtTa, setPestMgmtTa] = useState('');
  const [pestImgCaption, setPestImgCaption] = useState('');
  const [pestImgCaptionTa, setPestImgCaptionTa] = useState('');
  const [pestPendingImageUri, setPestPendingImageUri] = useState<string | null>(null);

  const [diseaseLang, setDiseaseLang] = useState<'en'|'ta'>('en');
  const [diseasesEn, setDiseasesEn] = useState<any[]>([]);
  const [diseaseImages, setDiseaseImages] = useState<Record<number, any[]>>({});
  const [diseaseNameEn, setDiseaseNameEn] = useState('');
  const [diseaseNameTa, setDiseaseNameTa] = useState('');
  const [diseaseDescEn, setDiseaseDescEn] = useState('');
  const [diseaseDescTa, setDiseaseDescTa] = useState('');
  const [diseaseMgmtEn, setDiseaseMgmtEn] = useState('');
  const [diseaseMgmtTa, setDiseaseMgmtTa] = useState('');
  const [diseaseImgCaption, setDiseaseImgCaption] = useState('');
  const [diseaseImgCaptionTa, setDiseaseImgCaptionTa] = useState('');
  const [diseasePendingImageUri, setDiseasePendingImageUri] = useState<string | null>(null);

  // Saved lists
  const [savedPestsVisible, setSavedPestsVisible] = useState(false);
  const [savedDiseasesVisible, setSavedDiseasesVisible] = useState(false);
  const [savedPestsLang, setSavedPestsLang] = useState<'en'|'ta'>('en');
  const [savedDiseaseLang, setSavedDiseaseLang] = useState<'en'|'ta'>('en');
  const [editingPestId, setEditingPestId] = useState<number | null>(null);
  const [editingDiseaseId, setEditingDiseaseId] = useState<number | null>(null);

  useEffect(() => { (async ()=>{ const all = await getAllCrops() as any[]; setCrops(all); if (all[0]) setSelectedCropId(Number(all[0].id)); })(); }, []);

  useEffect(() => {
    (async () => {
      if (!selectedCropId) return;
      // load guide
      const en = await getCropGuide(selectedCropId, 'en');
      const ta = await getCropGuide(selectedCropId, 'ta');
      const enText = (en as any)?.cultivation_guide || '';
      const taText = (ta as any)?.cultivation_guide || '';
      setGuideTextEn(enText); setGuideTextTa(taText);
      setGuideEditableEn(!enText); setGuideEditableTa(!taText);
      // load pests/diseases (EN association used for IDs)
      const ps = await listCropPests(selectedCropId, 'en') as any[]; setPestsEn(ps);
      const ds = await listCropDiseases(selectedCropId, 'en') as any[]; setDiseasesEn(ds);
      const pimEntries = await Promise.all(ps.map(async p => [p.id, await listCropPestImages(Number(p.id))] as const));
      const dimEntries = await Promise.all(ds.map(async d => [d.id, await listCropDiseaseImages(Number(d.id))] as const));
      const pim: Record<number, any[]> = {}; pimEntries.forEach(([id, imgs]) => { pim[id] = imgs as any[]; });
      const dim: Record<number, any[]> = {}; dimEntries.forEach(([id, imgs]) => { dim[id] = imgs as any[]; });
      setPestImages(pim); setDiseaseImages(dim);
    })();
  }, [selectedCropId]);

  return (
    <View style={styles.container}>
      <SafeAreaView />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Crop Data</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
        <View style={{ padding: 16 }}>
          <Text style={{ color: '#2d5016', fontWeight: '700' }}>Create Crop</Text>
          <TextInput style={[styles.input, { marginTop: 8 }]} placeholder="Crop name (English)" placeholderTextColor="#999" value={newCropNameEn} onChangeText={setNewCropNameEn} />
          <TextInput style={[styles.input, { marginTop: 8 }]} placeholder="பயிர் பெயர் (Tamil)" placeholderTextColor="#999" value={newCropNameTa} onChangeText={setNewCropNameTa} />
          <TouchableOpacity style={styles.imagePicker} onPress={async ()=>{ const perm = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (perm.status !== 'granted') { Alert.alert('Permission required', 'Allow photo library access'); return; } const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images }); if (!res.canceled) setNewCropImage(res.assets[0].uri); }}>
            <Ionicons name="camera" size={22} color="#4caf50" />
            <Text style={{ color: '#4caf50', fontWeight: '600' }}>{newCropImage ? 'Change Image' : 'Add Image (optional)'}</Text>
          </TouchableOpacity>
          {newCropImage && <Image source={{ uri: newCropImage }} style={{ width: '100%', height: 160, borderRadius: 8 }} />}
          <TouchableOpacity style={styles.savePrimaryBtn} onPress={async ()=>{ if (!newCropNameEn.trim()) { Alert.alert('Error','Enter crop name'); return; } let imageUrl: string | undefined; try { if (newCropImage) { const up = await uploadImage(newCropImage); imageUrl = up.url; } } catch {} const id = await addCrop({ name: newCropNameEn.trim(), name_ta: newCropNameTa.trim() || undefined, image: imageUrl }); if (id) { const all = await getAllCrops() as any[]; setCrops(all); setSelectedCropId(Number(id)); setNewCropNameEn(''); setNewCropNameTa(''); setNewCropImage(null); Alert.alert('Saved','Crop added'); } }}>
            <Ionicons name="save" size={18} color="#fff" />
            <Text style={{ color:'#fff', fontWeight:'700' }}>Save Crop</Text>
          </TouchableOpacity>

          {/* Crop selector */}
          <View style={[styles.row, { marginTop: 16, alignItems:'center' }]}>
            <TouchableOpacity style={[styles.input, { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} onPress={() => setPickerOpen(true)}>
              <Text>{(crops.find(c=>Number(c.id)===selectedCropId)||{}).name || 'Select Crop'}</Text>
              <Ionicons name="chevron-down" size={18} color="#666" />
            </TouchableOpacity>
          </View>
          <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={()=> setPickerOpen(false)}>
            <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.3)', justifyContent:'center', alignItems:'center' }}>
              <View style={{ width:'92%', maxHeight:'70%', backgroundColor:'#fff', borderRadius:16, overflow:'hidden' }}>
                <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:16, borderBottomWidth:1, borderBottomColor:'#e0e0e0' }}>
                  <Text style={{ fontSize:18, fontWeight:'700' }}>Select Crop</Text>
                  <TouchableOpacity onPress={()=> setPickerOpen(false)}>
                    <Ionicons name="chevron-back" size={24} color="#333" />
                  </TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={{ padding:16 }}>
                  {crops.map((c:any)=> (
                    <TouchableOpacity key={c.id} style={{ paddingVertical:12, borderBottomWidth:1, borderBottomColor:'#f0f0f0' }} onPress={()=> { setSelectedCropId(Number(c.id)); setPickerOpen(false); }}>
                      <Text style={{ color:'#333' }}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Guides */}
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginTop: 12 }}>
            <Text style={{ color: '#2d5016', fontWeight: '700' }}>Cultivation Guide</Text>
            <View style={styles.segmented}>
              <TouchableOpacity onPress={()=> setGuideLang('en')} style={[styles.segment, guideLang==='en' && styles.segmentActive]}>
                <Text style={[styles.segmentText, guideLang==='en' && styles.segmentTextActive]}>EN</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={()=> setGuideLang('ta')} style={[styles.segment, guideLang==='ta' && styles.segmentActive]}>
                <Text style={[styles.segmentText, guideLang==='ta' && styles.segmentTextActive]}>TA</Text>
              </TouchableOpacity>
            </View>
          </View>
          {guideLang==='en' ? (
            <TextInput style={[styles.input, { minHeight: 80, opacity: (guideEditableEn?1:0.7) }]} multiline editable={guideEditableEn} placeholder="Guide text (EN)" placeholderTextColor="#999" value={guideTextEn} onChangeText={setGuideTextEn} />
          ) : (
            <TextInput style={[styles.input, { minHeight: 80, opacity: (guideEditableTa?1:0.7) }]} multiline editable={guideEditableTa} placeholder="வழிகாட்டி (TA)" placeholderTextColor="#999" value={guideTextTa} onChangeText={setGuideTextTa} />
          )}
          {(guideLang==='en'?guideEditableEn:guideEditableTa) && (
            <View style={{ flexDirection:'row', gap: 8 }}>
              <TouchableOpacity style={styles.masterBtn} onPress={async ()=>{ if(!selectedCropId) return; if (guideLang==='en') { await upsertCropGuide(selectedCropId, 'en', { cultivation_guide: guideTextEn.trim()||'' }); setGuideEditableEn(false); } else { await upsertCropGuide(selectedCropId, 'ta', { cultivation_guide: guideTextTa.trim()||'' }); setGuideEditableTa(false); } const en = await getCropGuide(selectedCropId,'en'); const ta = await getCropGuide(selectedCropId,'ta'); setGuideTextEn((en as any)?.cultivation_guide||''); setGuideTextTa((ta as any)?.cultivation_guide||''); Alert.alert('Saved'); }}>
                <Ionicons name="save" size={18} color="#4caf50" /><Text style={styles.masterBtnText}>Save {guideLang.toUpperCase()}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.masterBtn, { borderColor:'#f8d7da', backgroundColor:'#fdecea' }]} onPress={async ()=>{ if(!selectedCropId) return; await deleteCropGuide(selectedCropId, guideLang); if (guideLang==='en') setGuideTextEn(''); else setGuideTextTa(''); Alert.alert('Deleted', `${guideLang.toUpperCase()} guide cleared`); }}>
                <Ionicons name="trash" size={18} color="#d32f2f" /><Text style={[styles.masterBtnText,{ color:'#d32f2f' }]}>Clear {guideLang.toUpperCase()}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Pests */}
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginTop: 12 }}>
            <Text style={{ color: '#2d5016', fontWeight: '700' }}>Pests</Text>
            <View style={{ flexDirection:'row', alignItems:'center', gap: 8 }}>
              <TouchableOpacity onPress={()=> setSavedPestsVisible(true)} style={[styles.masterBtn, { paddingVertical: 6, paddingHorizontal: 10 }]}>
                <Ionicons name="albums" size={16} color="#4caf50" />
                <Text style={styles.masterBtnText}>Saved Pests</Text>
              </TouchableOpacity>
              <View style={styles.segmented}>
                <TouchableOpacity onPress={()=> setPestLang('en')} style={[styles.segment, pestLang==='en' && styles.segmentActive]}>
                  <Text style={[styles.segmentText, pestLang==='en' && styles.segmentTextActive]}>EN</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={()=> setPestLang('ta')} style={[styles.segment, pestLang==='ta' && styles.segmentActive]}>
                  <Text style={[styles.segmentText, pestLang==='ta' && styles.segmentTextActive]}>TA</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
            <TouchableOpacity style={styles.addBtn} onPress={async ()=>{ if (!selectedCropId) { Alert.alert('Error','Select a crop'); return; } if (!pestNameTa.trim()) { Alert.alert('Error','Enter the Tamil name (TA) for the pest before saving'); return; } const pestId = await addCropPestBoth(selectedCropId, { name_en: pestNameEn.trim()||undefined, name_ta: pestNameTa.trim()||undefined, description_en: pestDescEn.trim()||undefined, description_ta: pestDescTa.trim()||undefined, management_en: pestMgmtEn.trim()||undefined, management_ta: pestMgmtTa.trim()||undefined }); if (pestId) { if (pestPendingImageUri) { const up = await uploadImage(pestPendingImageUri); await addCropPestImage(Number(pestId), up.url, pestImgCaption.trim()||undefined, pestImgCaptionTa.trim()||undefined, up.publicId); } const ps = await listCropPests(selectedCropId, 'en') as any[]; setPestsEn(ps); setPestNameEn(''); setPestNameTa(''); setPestDescEn(''); setPestDescTa(''); setPestMgmtEn(''); setPestMgmtTa(''); setPestImgCaption(''); setPestImgCaptionTa(''); setPestPendingImageUri(null); Alert.alert('Saved','Pest added'); } }}>
              <Ionicons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Diseases */}
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginTop: 12 }}>
            <Text style={{ color: '#2d5016', fontWeight: '700' }}>Diseases</Text>
            <View style={{ flexDirection:'row', alignItems:'center', gap: 8 }}>
              <TouchableOpacity onPress={()=> setSavedDiseasesVisible(true)} style={[styles.masterBtn, { paddingVertical: 6, paddingHorizontal: 10 }]}>
                <Ionicons name="albums" size={16} color="#4caf50" />
                <Text style={styles.masterBtnText}>Saved Diseases</Text>
              </TouchableOpacity>
              <View style={styles.segmented}>
                <TouchableOpacity onPress={()=> setDiseaseLang('en')} style={[styles.segment, diseaseLang==='en' && styles.segmentActive]}>
                  <Text style={[styles.segmentText, diseaseLang==='en' && styles.segmentTextActive]}>EN</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={()=> setDiseaseLang('ta')} style={[styles.segment, diseaseLang==='ta' && styles.segmentActive]}>
                  <Text style={[styles.segmentText, diseaseLang==='ta' && styles.segmentTextActive]}>TA</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
            <TouchableOpacity style={styles.addBtn} onPress={async ()=>{ if (!selectedCropId) { Alert.alert('Error','Select a crop'); return; } if (!diseaseNameEn.trim() && !diseaseNameTa.trim()) { Alert.alert('Error','Enter disease name in EN or TA'); return; } const diseaseId = await addCropDiseaseBoth(selectedCropId, { name_en: diseaseNameEn.trim()||undefined, name_ta: diseaseNameTa.trim()||undefined, description_en: diseaseDescEn.trim()||undefined, description_ta: diseaseDescTa.trim()||undefined, management_en: diseaseMgmtEn.trim()||undefined, management_ta: diseaseMgmtTa.trim()||undefined }); if (diseaseId) { if (diseasePendingImageUri) { const up = await uploadImage(diseasePendingImageUri); await addCropDiseaseImage(Number(diseaseId), up.url, diseaseImgCaption.trim()||undefined, diseaseImgCaptionTa.trim()||undefined, up.publicId); } const ds = await listCropDiseases(selectedCropId, 'en') as any[]; setDiseasesEn(ds); setDiseaseNameEn(''); setDiseaseNameTa(''); setDiseaseDescEn(''); setDiseaseDescTa(''); setDiseaseMgmtEn(''); setDiseaseMgmtTa(''); setDiseaseImgCaption(''); setDiseaseImgCaptionTa(''); setDiseasePendingImageUri(null); Alert.alert('Saved','Disease added'); } }}>
              <Ionicons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Saved Pests */}
        <Modal visible={savedPestsVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=> setSavedPestsVisible(false)}>
          <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff' }} />
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setSavedPestsVisible(false)}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Saved Pests</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
            {pestsEn.length === 0 ? (
              <Text style={{ color:'#666' }}>No pests saved for this crop.</Text>
            ) : (
              <>
                {pestsEn.map(p => {
                  const thumb = (pestImages[p.id] && pestImages[p.id][0]?.image) || null;
                  const isEditing = editingPestId === p.id;
                  return (
                    <View key={p.id} style={styles.savedCard}>
                      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
                        <View style={{ flexDirection:'row', alignItems:'center', gap: 10, flex: 1, paddingRight: 8 }}>
                          <Image source={thumb ? { uri: thumb } : require('../assets/images/icon.png')} style={{ width: 48, height: 48, borderRadius: 8 }} />
                          <Text style={{ fontWeight: '700', flex:1, color:'#2d5016' }} numberOfLines={2}>{p.name_ta || p.name}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems:'center', gap: 8 }}>
                          <TouchableOpacity accessibilityLabel="Add Image" onPress={async ()=>{ const perm = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (perm.status !== 'granted') { Alert.alert('Permission required', 'Allow photo library access'); return; } const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images }); if (!r.canceled) { const up = await uploadImage(r.assets[0].uri); await addCropPestImage(Number(p.id), up.url, undefined, undefined, up.publicId); const imgs = await listCropPestImages(Number(p.id)); setPestImages(prev=> ({...prev, [p.id]: imgs as any[]})); } }} style={styles.actionChip}>
                            <Ionicons name="image" size={16} color="#4caf50" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={()=> setEditingPestId(isEditing? null : p.id)} style={styles.actionChip}>
                            <Ionicons name={isEditing? 'checkmark' : 'create'} size={16} color="#4caf50" />
                          </TouchableOpacity>
                          <TouchableOpacity accessibilityLabel="Delete Pest" onPress={async ()=>{ Alert.alert('Delete Pest', 'Are you sure you want to delete this pest entirely?', [ { text:'Cancel', style:'cancel' }, { text:'Delete', style:'destructive', onPress: async ()=> { await deleteCropPest(Number(p.id)); const ps = await listCropPests(Number(selectedCropId), 'en') as any[]; setPestsEn(ps); setPestImages(prev=> { const n = {...prev}; delete n[p.id]; return n; }); Alert.alert('Deleted','Pest removed'); } } ]); }} style={[styles.actionChip, styles.actionChipDanger]}>
                            <Ionicons name="trash" size={16} color="#d32f2f" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      {isEditing && (
                        <View style={{ marginTop: 8, gap: 8 }}>
                          <TextInput style={styles.input} placeholder="Name (EN)" value={p.name || ''} onChangeText={(v)=> setPestsEn(prev=> prev.map(x=> x.id===p.id?{...x,name:v}:x))} />
                          <TextInput style={[styles.input, { minHeight: 80, textAlignVertical:'top' }]} multiline placeholder="Description (EN)" value={p.description || ''} onChangeText={(v)=> setPestsEn(prev=> prev.map(x=> x.id===p.id?{...x,description:v}:x))} />
                          <TextInput style={[styles.input, { minHeight: 80, textAlignVertical:'top' }]} multiline placeholder="Management (EN)" value={p.management || ''} onChangeText={(v)=> setPestsEn(prev=> prev.map(x=> x.id===p.id?{...x,management:v}:x))} />
                          <View style={{ flexDirection:'row', gap:8 }}>
                            <TouchableOpacity style={styles.savePrimaryBtn} onPress={async ()=>{ const ok = await updateCropPest(Number(p.id), { name: p.name, description: p.description, management: p.management }); if (ok) { setEditingPestId(null); Alert.alert('Saved','Pest updated'); } else { Alert.alert('Error','Failed to update'); } }}>
                              <Ionicons name="save" size={18} color="#fff" /><Text style={{ color:'#fff', fontWeight:'700' }}>Save</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.masterBtn} onPress={()=> setEditingPestId(null)}>
                              <Ionicons name="close" size={18} color="#4caf50" /><Text style={styles.masterBtnText}>Done</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </>
            )}
          </ScrollView>
          <SafeAreaView edges={['bottom']} style={{ backgroundColor:'#fff' }} />
        </Modal>

        {/* Saved Diseases */}
        <Modal visible={savedDiseasesVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=> setSavedDiseasesVisible(false)}>
          <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff' }} />
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setSavedDiseasesVisible(false)}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Saved Diseases</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
            {diseasesEn.length === 0 ? (
              <Text style={{ color:'#666' }}>No diseases saved for this crop.</Text>
            ) : (
              <>
                {diseasesEn.map(d => {
                  const thumb = (diseaseImages[d.id] && diseaseImages[d.id][0]?.image) || null;
                  const isEditing = editingDiseaseId === d.id;
                  return (
                    <View key={d.id} style={styles.savedCard}>
                      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
                        <View style={{ flexDirection:'row', alignItems:'center', gap: 10, flex: 1, paddingRight: 8 }}>
                          <Image source={thumb ? { uri: thumb } : require('../assets/images/icon.png')} style={{ width: 48, height: 48, borderRadius: 8 }} />
                          <Text style={{ fontWeight: '700', flex:1, color:'#2d5016' }} numberOfLines={2}>{d.name_ta || d.name}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems:'center', gap: 8 }}>
                          <TouchableOpacity accessibilityLabel="Add Image" onPress={async ()=>{ const perm = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (perm.status !== 'granted') { Alert.alert('Permission required', 'Allow photo library access'); return; } const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images }); if (!r.canceled) { const up = await uploadImage(r.assets[0].uri); await addCropDiseaseImage(Number(d.id), up.url, undefined, undefined, up.publicId); const imgs = await listCropDiseaseImages(Number(d.id)); setDiseaseImages(prev=> ({...prev, [d.id]: imgs as any[]})); } }} style={styles.actionChip}>
                            <Ionicons name="image" size={16} color="#4caf50" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={()=> setEditingDiseaseId(isEditing? null : d.id)} style={styles.actionChip}>
                            <Ionicons name={isEditing? 'checkmark' : 'create'} size={16} color="#4caf50" />
                          </TouchableOpacity>
                          <TouchableOpacity accessibilityLabel="Delete Disease" onPress={async ()=>{ Alert.alert('Delete Disease', 'Are you sure you want to delete this disease entirely?', [ { text:'Cancel', style:'cancel' }, { text:'Delete', style:'destructive', onPress: async ()=> { await deleteCropDisease(Number(d.id)); const ds = await listCropDiseases(Number(selectedCropId), 'en') as any[]; setDiseasesEn(ds); setDiseaseImages(prev=> { const n = {...prev}; delete n[d.id]; return n; }); Alert.alert('Deleted','Disease removed'); } } ]); }} style={[styles.actionChip, styles.actionChipDanger]}>
                            <Ionicons name="trash" size={16} color="#d32f2f" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      {isEditing && (
                        <View style={{ marginTop: 8, gap: 8 }}>
                          <TextInput style={styles.input} placeholder="Name (EN)" value={d.name || ''} onChangeText={(v)=> setDiseasesEn(prev=> prev.map(x=> x.id===d.id?{...x,name:v}:x))} />
                          <TextInput style={[styles.input, { minHeight: 80, textAlignVertical:'top' }]} multiline placeholder="Description (EN)" value={d.description || ''} onChangeText={(v)=> setDiseasesEn(prev=> prev.map(x=> x.id===d.id?{...x,description:v}:x))} />
                          <TextInput style={[styles.input, { minHeight: 80, textAlignVertical:'top' }]} multiline placeholder="Management (EN)" value={d.management || ''} onChangeText={(v)=> setDiseasesEn(prev=> prev.map(x=> x.id===d.id?{...x,management:v}:x))} />
                          <View style={{ flexDirection:'row', gap:8 }}>
                            <TouchableOpacity style={styles.savePrimaryBtn} onPress={async ()=>{ const ok = await updateCropDisease(Number(d.id), { name: d.name, description: d.description, management: d.management }); if (ok) { setEditingDiseaseId(null); Alert.alert('Saved','Disease updated'); } else { Alert.alert('Error','Failed to update'); } }}>
                              <Ionicons name="save" size={18} color="#fff" /><Text style={{ color:'#fff', fontWeight:'700' }}>Save</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.masterBtn} onPress={()=> setEditingDiseaseId(null)}>
                              <Ionicons name="close" size={18} color="#4caf50" /><Text style={styles.masterBtnText}>Done</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </>
            )}
          </ScrollView>
          <SafeAreaView edges={['bottom']} style={{ backgroundColor:'#fff' }} />
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:'#fff' },
  header: { backgroundColor:'#4caf50', paddingHorizontal:12, paddingVertical:10, flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  headerTitle: { color:'#fff', fontSize:18, fontWeight:'700' },
  row: { flexDirection:'row', alignItems:'center', gap:8, marginTop:8 },
  input: { backgroundColor:'#f9f9f9', borderWidth:1, borderColor:'#e0e0e0', borderRadius:8, padding:12, marginTop:8, marginBottom:10 },
  imagePicker: { flexDirection:'row', alignItems:'center', gap:8, borderWidth:2, borderStyle:'dashed', borderColor:'#4caf50', padding:14, borderRadius:10, justifyContent:'center', marginTop:8, marginBottom:8 },
  savePrimaryBtn: { backgroundColor:'#4caf50', paddingVertical:16, borderRadius:10, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:10, marginTop:8 },
  masterBtn: { backgroundColor:'#f1f8f4', borderWidth:1, borderColor:'#c8e6c9', paddingVertical:10, paddingHorizontal:12, borderRadius:10, flexDirection:'row', alignItems:'center', gap:8 },
  masterBtnText: { color:'#2d5016', fontWeight:'700' },
  segmented: { flexDirection:'row', borderWidth:1, borderColor:'#c8e6c9', borderRadius:12, overflow:'hidden' },
  segment: { paddingVertical:4, paddingHorizontal:12, backgroundColor:'#f1f8f4' },
  segmentActive: { backgroundColor:'#4caf50' },
  segmentText: { color:'#4caf50', fontWeight:'700' },
  segmentTextActive: { color:'#fff', fontWeight:'800' },
  addBtn: { backgroundColor:'#4caf50', padding: 14, borderRadius: 8, alignItems:'center', justifyContent:'center' },
  savedCard: { padding:12, borderWidth:1, borderColor:'#c8e6c9', borderRadius:12, backgroundColor:'#fff', marginBottom:12 },
  actionChip: { flexDirection:'row', alignItems:'center', gap:8, paddingVertical:10, paddingHorizontal:14, borderRadius:14, backgroundColor:'#f1f8f4', borderWidth:1, borderColor:'#c8e6c9' },
  actionChipDanger: { backgroundColor:'#fdecea', borderColor:'#f8d7da' },
});
