import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Alert, ScrollView, Image, Modal, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAllCrops, addCrop, upsertCropGuide, listCropPests, addCropPestBoth, addCropPestImage, listCropDiseases, addCropDiseaseBoth, addCropDiseaseImage, getCropGuide, updateCropPest, updateCropDisease, deleteCropPestImage, deleteCropDiseaseImage, deleteCropPest, deleteCropDisease, deleteCrop, deleteCropGuide, listCropPestImages, listCropDiseaseImages, listAdmins, setAdminRole, deleteAdmin } from '../lib/database';
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
  const [guideLang, setGuideLang] = useState<'en'|'ta'>('en');
  const [pestLang, setPestLang] = useState<'en'|'ta'>('en');
  const [diseaseLang, setDiseaseLang] = useState<'en'|'ta'>('en');
  const [guideEditableEn, setGuideEditableEn] = useState(true);
  const [guideEditableTa, setGuideEditableTa] = useState(true);

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

  // Pest image modal state
  const [imgModalVisible, setImgModalVisible] = useState(false);
  const [imgModalPestId, setImgModalPestId] = useState<number | null>(null);
  const [imgModalImage, setImgModalImage] = useState<any | null>(null);

  // Disease image modal state
  const [disImgModalVisible, setDisImgModalVisible] = useState(false);
  const [disImgModalDiseaseId, setDisImgModalDiseaseId] = useState<number | null>(null);
  const [disImgModalImage, setDisImgModalImage] = useState<any | null>(null);

  // Saved dashboards visibility
  const [savedPestsVisible, setSavedPestsVisible] = useState(false);
  const [savedDiseasesVisible, setSavedDiseasesVisible] = useState(false);

  // Admin manage state (master only)
  const [adminManageVisible, setAdminManageVisible] = useState(false);
  const [admins, setAdmins] = useState<any[]>([]);
  const [newAdminNumber, setNewAdminNumber] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminFullName, setNewAdminFullName] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<1|2>(1);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [adminsFilter, setAdminsFilter] = useState('');
  const [adminCount, setAdminCount] = useState<number | null>(null);

  useEffect(() => { (async ()=>{ const all = await getAllCrops() as any[]; setCrops(all); if (all[0]) setSelectedCropId(Number(all[0].id)); })(); }, []);

  useEffect(() => {
    (async () => {
      if (!selectedCropId) return;
      // load existing guides
      const en = await getCropGuide(selectedCropId, 'en');
      const ta = await getCropGuide(selectedCropId, 'ta');
      const enText = (en as any)?.cultivation_guide || '';
      const taText = (ta as any)?.cultivation_guide || '';
      setGuideTextEn(enText);
      setGuideTextTa(taText);
      setGuideEditableEn(enText ? false : true);
      setGuideEditableTa(taText ? false : true);
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
            <Text style={styles.masterBtnText}>Products</Text>
          </TouchableOpacity>
          {user?.is_admin === 2 && (
            <TouchableOpacity style={styles.adminTile} onPress={async ()=> { setAdminManageVisible(true); setAdminsLoading(true); try { const rows = await listAdmins(); setAdmins(rows as any[]); setAdminCount(Array.isArray(rows)? rows.length : 0); } finally { setAdminsLoading(false); } }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
                <View style={{ width:36, height:36, borderRadius:8, backgroundColor:'#eaf6ec', alignItems:'center', justifyContent:'center' }}>
                  <Ionicons name="shield-checkmark" size={20} color="#4caf50" />
                </View>
                <View>
                  <Text style={styles.adminTileTitle}>Add/Manage Admins</Text>
                  <Text style={styles.adminTileSub}>{adminCount!=null? `${adminCount} admin${adminCount===1?'':'s'}` : 'Create vendors, promote to master'}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#2d5016" />
            </TouchableOpacity>
          )}
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

          {/* Crop Details */}
          <View style={{ marginTop: 16 }}>
            <Text style={{ color:'#2d5016', fontWeight:'700', fontSize: 16 }}>Crop Details</Text>
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

              {/* Cultivation guide - toggled by EN/TA */}
              <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginTop: 8 }}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                  <Text style={{ color: '#2d5016', fontWeight: '700' }}>Cultivation Guide</Text>
                  {!(guideLang==='en'?guideEditableEn:guideEditableTa) && (
                    <TouchableOpacity onPress={()=> guideLang==='en'? setGuideEditableEn(true) : setGuideEditableTa(true)} accessibilityLabel="Edit Guide">
                      <Ionicons name="create" size={16} color="#4caf50" />
                    </TouchableOpacity>
                  )}
                </View>
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
              {/* Pests (inline hidden; manage via Saved Pests) */}
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
              <Text style={{ color:'#666', marginTop: 6 }}>Manage pests in Saved Pests</Text>
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

              {/* Diseases list + add */}
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
              <Text style={{ color:'#666', marginTop: 6 }}>Manage diseases in Saved Diseases</Text>
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

            </>
          )}

        </ScrollView>

        {/* Pest Image Action Modal */}
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
                  const target = pestsEn.find(x=> Number(x.id) === Number(imgModalPestId));
                  if (!target || !(target as any).name_ta || !String((target as any).name_ta).trim()) { Alert.alert('Add Tamil details first', 'Please add the Tamil name for this pest before attaching images.'); return; }
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

        {/* Disease Image Action Modal */}
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

        {/* Saved Pests Dashboard */}
        <Modal visible={savedPestsVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=> setSavedPestsVisible(false)}>
          <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff' }} />
          {Platform.OS === 'android' ? <View style={{ height: 20, backgroundColor: '#4caf50' }} /> : null}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setSavedPestsVisible(false)}>
              <Ionicons name="close" size={24} color="#fff" />
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
                          {pestImages[p.id].map((img: any, i: number) => (
                            <View key={img.id} style={{ width: 92 }}>
                              <TouchableOpacity onPress={()=> { setImgModalPestId(Number(p.id)); setImgModalImage(img); setImgModalVisible(true); }}>
                                <Image source={{ uri: img.image }} style={{ width: 92, height: 92, borderRadius: 8 }} />
                              </TouchableOpacity>
                              {(pestLang==='ta' ? img.caption_ta : img.caption) ? (
                                <Text style={{ fontSize:11, color:'#555', marginTop: 4 }} numberOfLines={2}>{pestLang==='ta' ? img.caption_ta : img.caption}</Text>
                              ) : null}
                            </View>
                          ))}
                        </ScrollView>
                      ) : null}
                    </View>
                  );
                })}
              </>
            )}
          </ScrollView>
          <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#fff' }} />
        </Modal>

        {/* Saved Diseases Dashboard */}
        <Modal visible={savedDiseasesVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=> setSavedDiseasesVisible(false)}>
          <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff' }} />
          {Platform.OS === 'android' ? <View style={{ height: 20, backgroundColor: '#4caf50' }} /> : null}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setSavedDiseasesVisible(false)}>
              <Ionicons name="close" size={24} color="#fff" />
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
                          {diseaseImages[d.id].map((img: any, i: number) => (
                            <View key={img.id} style={{ width: 92 }}>
                              <TouchableOpacity onPress={()=> { setDisImgModalDiseaseId(Number(d.id)); setDisImgModalImage(img); setDisImgModalVisible(true); }}>
                                <Image source={{ uri: img.image }} style={{ width: 92, height: 92, borderRadius: 8 }} />
                              </TouchableOpacity>
                              {(diseaseLang==='ta' ? img.caption_ta : img.caption) ? (
                                <Text style={{ fontSize:11, color:'#555', marginTop: 4 }} numberOfLines={2}>{diseaseLang==='ta' ? img.caption_ta : img.caption}</Text>
                              ) : null}
                            </View>
                          ))}
                        </ScrollView>
                      ) : null}
                    </View>
                  );
                })}
              </>
            )}
          </ScrollView>
          <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#fff' }} />
        </Modal>

        <View style={{ height: 10 }} />
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#fff' }} />
      </Modal>

      {/* Manage Admins (Master only) - top-level so it opens from Masters home */}
      <Modal visible={adminManageVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=> setAdminManageVisible(false)}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff' }} />
        {Platform.OS === 'android' ? <View style={{ height: 20, backgroundColor: '#4caf50' }} /> : null}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setAdminManageVisible(false)}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Admins</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding:16, paddingBottom: 28 }}>
          <TextInput style={[styles.input, { marginBottom: 14 }]} placeholder="Search by name or number" placeholderTextColor="#999" value={adminsFilter} onChangeText={setAdminsFilter} />
          {adminsLoading ? (
            <View style={{ alignItems:'center', padding: 20 }}>
              <ActivityIndicator color="#4caf50" />
            </View>
          ) : (
          <>
            <View style={{ gap: 12 }}>
            {admins.filter((a:any)=> {
              const q = adminsFilter.toLowerCase();
              if (!q) return true;
              return String(a.full_name||'').toLowerCase().includes(q) || String(a.number||'').toLowerCase().includes(q);
            }).map((a)=> (
              <View key={a.id} style={{ padding:12, borderWidth:1, borderColor:'#e0e0e0', borderRadius:10, backgroundColor:'#fff', marginBottom:12 }}>
                  <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
                    <View style={{ flex:1 }}>
                      <Text style={{ fontWeight:'700', color:'#2d5016' }}>{a.full_name || 'Admin'}</Text>
                      <Text style={{ color:'#666' }}>{a.number}</Text>
                    </View>
                    <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                      <Text style={[styles.rolePill, a.is_admin===2 ? styles.rolePillMaster : styles.rolePillVendor]}>{a.is_admin===2 ? 'MASTER' : 'VENDOR'}</Text>
                      <TouchableOpacity onPress={async ()=>{ const ok = await deleteAdmin(Number(a.id)); if (ok) { setAdmins(prev=> { const n = prev.filter(x=> x.id!==a.id); setAdminCount(n.length); return n; }); Alert.alert('Deleted','Admin removed'); } }} style={{ padding:8, backgroundColor:'#fdecea', borderRadius:8 }}>
                        <Ionicons name="trash" size={18} color="#d32f2f" />
                      </TouchableOpacity>
                    </View>
                  </View>
                <View style={[styles.segmented, { marginTop:10, alignSelf:'flex-start' }]}>
                    <TouchableOpacity onPress={async ()=>{ await setAdminRole(Number(a.id), 2); setAdmins(prev=> { const next = prev.map(x=> x.id===a.id?{...x,is_admin:2}:x); setAdminCount(next.length); return next; }); }} style={[styles.segment, a.is_admin===2 && styles.segmentActive]}>
                    <Text style={[styles.segmentText, a.is_admin===2 && styles.segmentTextActive]}>Master</Text>
                  </TouchableOpacity>
                    <TouchableOpacity onPress={async ()=>{ await setAdminRole(Number(a.id), 1); setAdmins(prev=> { const next = prev.map(x=> x.id===a.id?{...x,is_admin:1}:x); setAdminCount(next.length); return next; }); }} style={[styles.segment, a.is_admin===1 && styles.segmentActive]}>
                    <Text style={[styles.segmentText, a.is_admin===1 && styles.segmentTextActive]}>Vendor</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            </View>
          </>
          )}

          <View style={{ height: 16 }} />
          <Text style={{ color:'#2d5016', fontWeight:'700', marginBottom: 8 }}>Create Admin</Text>
          <View style={{ gap: 10 }}>
            <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#999" value={newAdminFullName} onChangeText={setNewAdminFullName} />
            <TextInput style={styles.input} placeholder="Phone Number" placeholderTextColor="#999" value={newAdminNumber} onChangeText={setNewAdminNumber} keyboardType="number-pad" />
            <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#999" value={newAdminPassword} onChangeText={setNewAdminPassword} secureTextEntry />
          </View>
          <View style={[styles.segmented, { alignSelf:'flex-start', marginTop: 10, marginBottom: 12 }]}>
            <TouchableOpacity onPress={()=> setNewAdminRole(2)} style={[styles.segment, newAdminRole===2 && styles.segmentActive]}>
              <Text style={[styles.segmentText, newAdminRole===2 && styles.segmentTextActive]}>Master</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={()=> setNewAdminRole(1)} style={[styles.segment, newAdminRole===1 && styles.segmentActive]}>
              <Text style={[styles.segmentText, newAdminRole===1 && styles.segmentTextActive]}>Vendor</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.savePrimaryBtn} onPress={async ()=> {
            if (!newAdminNumber || !newAdminPassword || !newAdminFullName) { Alert.alert('Error','Fill all fields'); return; }
            const ok = await (await import('../lib/createAdmin')).createAdminCustom(newAdminNumber, newAdminPassword, newAdminFullName, newAdminRole);
            if (ok) { Alert.alert('Saved','Admin created'); const rows = await listAdmins(); setAdmins(rows as any[]); setAdminCount(Array.isArray(rows)? rows.length : 0); setNewAdminNumber(''); setNewAdminPassword(''); setNewAdminFullName(''); }
            else { Alert.alert('Error','Failed to create admin'); }
          }}>
            <Ionicons name="save" size={18} color="#fff" />
            <Text style={{ color:'#fff', fontWeight:'700' }}>Create</Text>
          </TouchableOpacity>
        </ScrollView>
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
  segmented: { flexDirection:'row', borderWidth:1, borderColor:'#c8e6c9', borderRadius:12, overflow:'hidden' },
  segment: { paddingVertical:4, paddingHorizontal:12, backgroundColor:'#f1f8f4' },
  segmentActive: { backgroundColor:'#4caf50' },
  segmentText: { color:'#4caf50', fontWeight:'700' },
  segmentTextActive: { color:'#fff', fontWeight:'800' },
  actionChip: { flexDirection:'row', alignItems:'center', gap:6, paddingVertical:6, paddingHorizontal:10, borderRadius:12, backgroundColor:'#f1f8f4', borderWidth:1, borderColor:'#c8e6c9' },
  actionChipDanger: { backgroundColor:'#fdecea', borderColor:'#f8d7da' },
  actionChipText: { color:'#2d5016', fontWeight:'700' },
  adminTile: { backgroundColor:'#f1f8f4', borderWidth:1, borderColor:'#c8e6c9', padding:14, borderRadius:12, flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  adminTileTitle: { color:'#2d5016', fontWeight:'800' },
  adminTileSub: { color:'#4e7c35', fontWeight:'600', fontSize:12 },
  rolePill: { paddingVertical:4, paddingHorizontal:8, borderRadius:10, fontSize:10, fontWeight:'800' },
  rolePillMaster: { backgroundColor:'#eaf6ec', color:'#2d5016' },
  rolePillVendor: { backgroundColor:'#fff3cd', color:'#7a5c00' },
});
