import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Alert, ScrollView, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { addScanPlant, deleteScanPlant, getScanPlants, getAllCrops, addCrop, upsertCropGuide, listCropPests, addCropPest, addCropPestImage, listCropDiseases, addCropDisease, addCropDiseaseImage } from '../lib/database';
import { UserContext } from '../context/UserContext';

import * as ImagePicker from 'expo-image-picker';

export default function Masters() {
  const { user } = useContext(UserContext);
  const isAdmin = user?.is_admin === 1;
  const [plants, setPlants] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [nameTa, setNameTa] = useState('');

  // Crop guide management
  const [crops, setCrops] = useState<any[]>([]);
  const [selectedCropId, setSelectedCropId] = useState<number | null>(null);
  const [lang, setLang] = useState<'en'|'ta'>('en');
  const [guideText, setGuideText] = useState('');
  const [pests, setPests] = useState<any[]>([]);
  const [diseases, setDiseases] = useState<any[]>([]);
  const [pestName, setPestName] = useState('');
  const [pestDesc, setPestDesc] = useState('');
  const [pestMgmt, setPestMgmt] = useState('');
  const [pestImgCaption, setPestImgCaption] = useState('');
  const [pestImgCaptionTa, setPestImgCaptionTa] = useState('');
  const [diseaseName, setDiseaseName] = useState('');
  const [diseaseDesc, setDiseaseDesc] = useState('');
  const [diseaseMgmt, setDiseaseMgmt] = useState('');
  const [diseaseImgCaption, setDiseaseImgCaption] = useState('');
  const [diseaseImgCaptionTa, setDiseaseImgCaptionTa] = useState('');
  const [guideModalVisible, setGuideModalVisible] = useState(false);
  const [lastPestId, setLastPestId] = useState<number | null>(null);
  const [lastDiseaseId, setLastDiseaseId] = useState<number | null>(null);
  // New crop inputs
  const [newCropNameEn, setNewCropNameEn] = useState('');
  const [newCropNameTa, setNewCropNameTa] = useState('');
  const [newCropImage, setNewCropImage] = useState<string | null>(null);
  // Optional preselect images before creating pest/disease
  const [pestPendingImageUri, setPestPendingImageUri] = useState<string | null>(null);
  const [diseasePendingImageUri, setDiseasePendingImageUri] = useState<string | null>(null);

  const load = async () => {
    const rows = await getScanPlants() as any[];
    setPlants(rows);
  };

  useEffect(() => { load(); (async () => { const all = await getAllCrops() as any[]; setCrops(all); if (all[0]) setSelectedCropId(Number(all[0].id)); })(); }, []);

  useEffect(() => {
    (async () => {
      if (!selectedCropId) return;
      const ps = await listCropPests(selectedCropId, lang) as any[];
      const ds = await listCropDiseases(selectedCropId, lang) as any[];
      setPests(ps); setDiseases(ds);
    })();
  }, [selectedCropId, lang]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Masters</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Scanner Plants</Text>
        {isAdmin ? (
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Plant name (EN)"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Name (TA)"
              value={nameTa}
              onChangeText={setNameTa}
            />
            <TouchableOpacity
              style={styles.addBtn}
              onPress={async () => {
                if (!name.trim()) { Alert.alert('Error', 'Enter name'); return; }
                const id = await addScanPlant(name.trim(), nameTa.trim() || undefined);
                if (id) { setName(''); setNameTa(''); load(); }
              }}
            >
              <Ionicons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : null}
        <FlatList
          data={plants}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View style={styles.plantRow}>
              <Text style={{ flex: 1, color: '#2d5016', fontWeight: '600' }}>{item.name}</Text>
              {item.name_ta ? <Text style={{ flex: 1, color: '#666' }}>{item.name_ta}</Text> : null}
              {isAdmin && (
                <TouchableOpacity onPress={async () => { await deleteScanPlant(item.id); load(); }}>
                  <Ionicons name="trash" size={18} color="#f44336" />
                </TouchableOpacity>
              )}
            </View>
          )}
          ListEmptyComponent={<Text style={{ color: '#666' }}>No plants yet</Text>}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Masters</Text>
        <View style={{ gap: 10 }}>
          <TouchableOpacity style={styles.masterBtn} onPress={() => setGuideModalVisible(true)}>
            <Ionicons name="book" size={18} color="#4caf50" />
            <Text style={styles.masterBtnText}>Crop Guide Manager</Text>
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

      {/* Crop Guide Manager Modal */}
      <Modal visible={guideModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setGuideModalVisible(false)}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff' }} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setGuideModalVisible(false)}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Crop Guide Manager</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16 }}>
          {/* Crop Name Manager */}
          <View style={{ gap: 12 }}>
            <Text style={{ color: '#2d5016', fontWeight: '700' }}>Crop Name Manager</Text>
            <TextInput style={[styles.input, { marginBottom: 12 }]} placeholder="Crop name (English)" placeholderTextColor="#999" value={newCropNameEn} onChangeText={setNewCropNameEn} />
            <TextInput style={[styles.input, { marginBottom: 12 }]} placeholder="பயிர் பெயர் (தமிழ்)" placeholderTextColor="#999" value={newCropNameTa} onChangeText={setNewCropNameTa} />
            <TouchableOpacity style={styles.imagePicker} onPress={async ()=>{ const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] as any }); if (!res.canceled) setNewCropImage(res.assets[0].uri); }}>
              <Ionicons name="camera" size={22} color="#4caf50" />
              <Text style={{ color: '#4caf50', fontWeight: '600' }}>{newCropImage ? 'Change Image' : 'Add Image (optional)'}</Text>
            </TouchableOpacity>
            {newCropImage && <Image source={{ uri: newCropImage }} style={{ width: '100%', height: 160, borderRadius: 8 }} />}
            <TouchableOpacity style={styles.savePrimaryBtn} onPress={async ()=>{
              if (!newCropNameEn.trim()) { Alert.alert('Error','Enter crop name'); return; }
              const id = await addCrop({ name: newCropNameEn.trim(), name_ta: newCropNameTa.trim() || undefined, image: newCropImage || undefined });
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

          {/* Working Crop selection for guide/pests/diseases */}
          {crops.length === 0 ? (
            <Text style={{ color: '#666' }}>Add crops first.</Text>
          ) : (
            <>
            <View style={[styles.row, { marginBottom: 8 }]}>
              <TouchableOpacity style={[styles.input, { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                onPress={() => { /* simple next-prev cycle */
                  const idx = crops.findIndex(c=> Number(c.id)===selectedCropId);
                  const next = crops[(idx+1)%crops.length]; setSelectedCropId(Number(next.id));
                }}>
                <Text>{(crops.find(c=>Number(c.id)===selectedCropId)||{}).name || 'Select Crop'}</Text>
                <Ionicons name="chevron-down" size={18} color="#666" />
              </TouchableOpacity>
              
              </View>
            
              <Text style={{ color: '#2d5016', fontWeight: '700', marginBottom: 6 }}>Cultivation Guide</Text>
              <TextInput style={[styles.input, { minHeight: 80 }]} multiline placeholder="Guide text" placeholderTextColor="#999" value={guideText} onChangeText={setGuideText} />
              <TouchableOpacity style={styles.masterBtn} onPress={async ()=>{ if(!selectedCropId) return; await upsertCropGuide(selectedCropId, lang, { cultivation_guide: guideText }); Alert.alert('Saved'); }}>
                <Ionicons name="save" size={18} color="#4caf50" /><Text style={styles.masterBtnText}>Save Guide</Text>
              </TouchableOpacity>

              <Text style={{ color: '#2d5016', fontWeight: '700', marginTop: 12 }}>Pests</Text>
              <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:8 }}>
                <Text style={{ color:'#666' }}>Language:</Text>
                <TouchableOpacity style={[styles.chip, lang==='en' && styles.chipActive]} onPress={()=> setLang('en')}><Text style={[styles.chipText, lang==='en' && styles.chipTextActive]}>EN</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.chip, lang==='ta' && styles.chipActive]} onPress={()=> setLang('ta')}><Text style={[styles.chipText, lang==='ta' && styles.chipTextActive]}>TA</Text></TouchableOpacity>
              </View>
              {pests.map(p => (
                <View key={p.id} style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
                  <Text style={{ fontWeight: '600' }}>{p.name}</Text>
                  {p.description ? <Text style={{ color: '#666' }}>{p.description}</Text> : null}
                </View>
              ))}
              <TextInput style={styles.input} placeholder="Pest name" placeholderTextColor="#999" value={pestName} onChangeText={setPestName} />
              <TextInput style={styles.input} placeholder="Description" placeholderTextColor="#999" value={pestDesc} onChangeText={setPestDesc} />
              <TextInput style={styles.input} placeholder="Management" placeholderTextColor="#999" value={pestMgmt} onChangeText={setPestMgmt} />
              <View style={styles.row}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Image caption (EN)" placeholderTextColor="#999" value={pestImgCaption} onChangeText={setPestImgCaption} />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="பட விளக்கம் (TA)" placeholderTextColor="#999" value={pestImgCaptionTa} onChangeText={setPestImgCaptionTa} />
                <TouchableOpacity style={[styles.masterBtn, { paddingVertical: 10 }]} onPress={async ()=>{ const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] as any }); if (!r.canceled) setPestPendingImageUri(r.assets[0].uri); }}>
                  <Ionicons name="image" size={18} color="#4caf50" />
                  <Text style={styles.masterBtnText}>{pestPendingImageUri ? 'Change' : 'Attach'} Image</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addBtn} onPress={async ()=>{
                  if(!selectedCropId || !pestName.trim()) { Alert.alert('Error','Name'); return; }
                  const pestId = await addCropPest(selectedCropId, lang, pestName.trim(), pestDesc.trim()||undefined, pestMgmt.trim()||undefined);
                  if (pestId) {
                    if (pestPendingImageUri) { await addCropPestImage(Number(pestId), pestPendingImageUri, pestImgCaption.trim()||undefined, pestImgCaptionTa.trim()||undefined); }
                    setLastPestId(Number(pestId));
                    setPestName(''); setPestDesc(''); setPestMgmt(''); setPestImgCaption(''); setPestImgCaptionTa('');
                    setPestPendingImageUri(null);
                    const ps = await listCropPests(selectedCropId, lang) as any[]; setPests(ps);
                  }
                }}>
                  <Ionicons name="add" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
              {lastPestId && (
                <TouchableOpacity style={[styles.masterBtn, { marginTop: 6 }]} onPress={async ()=>{ const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] as any }); if (!res.canceled) { await addCropPestImage(lastPestId, res.assets[0].uri, undefined, undefined); Alert.alert('Image added'); } }}>
                  <Ionicons name="images" size={18} color="#4caf50" />
                  <Text style={styles.masterBtnText}>Attach Another Pest Image</Text>
                </TouchableOpacity>
              )}

              <Text style={{ color: '#2d5016', fontWeight: '700', marginTop: 12 }}>Diseases</Text>
              <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:8 }}>
                <Text style={{ color:'#666' }}>Language:</Text>
                <TouchableOpacity style={[styles.chip, lang==='en' && styles.chipActive]} onPress={()=> setLang('en')}><Text style={[styles.chipText, lang==='en' && styles.chipTextActive]}>EN</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.chip, lang==='ta' && styles.chipActive]} onPress={()=> setLang('ta')}><Text style={[styles.chipText, lang==='ta' && styles.chipTextActive]}>TA</Text></TouchableOpacity>
              </View>
              {diseases.map(d => (
                <View key={d.id} style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
                  <Text style={{ fontWeight: '600' }}>{d.name}</Text>
                  {d.description ? <Text style={{ color: '#666' }}>{d.description}</Text> : null}
                </View>
              ))}
              <TextInput style={styles.input} placeholder="Disease name" placeholderTextColor="#999" value={diseaseName} onChangeText={setDiseaseName} />
              <TextInput style={styles.input} placeholder="Description" placeholderTextColor="#999" value={diseaseDesc} onChangeText={setDiseaseDesc} />
              <TextInput style={styles.input} placeholder="Management" placeholderTextColor="#999" value={diseaseMgmt} onChangeText={setDiseaseMgmt} />
              <View style={styles.row}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Image caption (EN)" placeholderTextColor="#999" value={diseaseImgCaption} onChangeText={setDiseaseImgCaption} />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="பட விளக்கம் (TA)" placeholderTextColor="#999" value={diseaseImgCaptionTa} onChangeText={setDiseaseImgCaptionTa} />
                <TouchableOpacity style={[styles.masterBtn, { paddingVertical: 10 }]} onPress={async ()=>{ const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] as any }); if (!r.canceled) setDiseasePendingImageUri(r.assets[0].uri); }}>
                  <Ionicons name="image" size={18} color="#4caf50" />
                  <Text style={styles.masterBtnText}>{diseasePendingImageUri ? 'Change' : 'Attach'} Image</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addBtn} onPress={async ()=>{
                  if(!selectedCropId || !diseaseName.trim()) { Alert.alert('Error','Name'); return; }
                  const diseaseId = await addCropDisease(selectedCropId, lang, diseaseName.trim(), diseaseDesc.trim()||undefined, diseaseMgmt.trim()||undefined);
                  if (diseaseId) {
                    if (diseasePendingImageUri) { await addCropDiseaseImage(Number(diseaseId), diseasePendingImageUri, diseaseImgCaption.trim()||undefined, diseaseImgCaptionTa.trim()||undefined); }
                    setLastDiseaseId(Number(diseaseId));
                    setDiseaseName(''); setDiseaseDesc(''); setDiseaseMgmt(''); setDiseaseImgCaption(''); setDiseaseImgCaptionTa('');
                    setDiseasePendingImageUri(null);
                    const ds = await listCropDiseases(selectedCropId, lang) as any[]; setDiseases(ds);
                  }
                }}>
                  <Ionicons name="add" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
              {lastDiseaseId && (
                <TouchableOpacity style={[styles.masterBtn, { marginTop: 6 }]} onPress={async ()=>{ const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] as any }); if (!res.canceled) { await addCropDiseaseImage(lastDiseaseId, res.assets[0].uri, undefined, undefined); Alert.alert('Image added'); } }}>
                  <Ionicons name="images" size={18} color="#4caf50" />
                  <Text style={styles.masterBtnText}>Attach Another Disease Image</Text>
                </TouchableOpacity>
              )}
            
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
