import React, { useContext, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLanguage } from '../../context/LanguageContext';
import {
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';
import { UserContext } from '../../context/UserContext';
import { getAllPlants, getAllCrops, addCrop, upsertCropGuide, getCropGuide } from '../../lib/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import { resetDatabase } from '../../lib/resetDatabase';

// (async () => {
//   await resetDatabase();
//   // database.ts will recreate tables automatically
// })();

export default function Home() {
  const { user } = useContext(UserContext);
  const { t, currentLanguage } = useLanguage();
  const isAdmin = user?.is_admin === 1;
  const [plants, setPlants] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [locationName, setLocationName] = useState<string>('');
  const [weather, setWeather] = useState<{ temp?: number; condition?: string }>({});
  const [hourly, setHourly] = useState<Array<{ time: string; temp: number; desc?: string; icon?: string }>>([]);
  const [cropModalVisible, setCropModalVisible] = useState(false);
  const [allCrops, setAllCrops] = useState<any[]>([]);
  const [selectedCrops, setSelectedCrops] = useState<number[]>([]);
  const [newCropName, setNewCropName] = useState('');
  const [newCropNameTa, setNewCropNameTa] = useState('');
  const [newCropImage, setNewCropImage] = useState<string | null>(null);
  const [cultivationGuide, setCultivationGuide] = useState('');
  const [pestManagement, setPestManagement] = useState('');
  const [diseaseManagement, setDiseaseManagement] = useState('');
  const [guideModalVisible, setGuideModalVisible] = useState(false);
  const [guideLoading, setGuideLoading] = useState(false);
  const [guideCrop, setGuideCrop] = useState<any | null>(null);
  const [guideData, setGuideData] = useState<any | null>(null);

  const loadPlants = async () => {
    if (!user) return;
    const allPlants = await getAllPlants(user.id);
    setPlants(allPlants);
  };

  useEffect(() => {
    loadPlants();
  }, [user]);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('@agro_crops');
        if (saved) setSelectedCrops(JSON.parse(saved));
        const crops = await getAllCrops() as any[];
        setAllCrops(crops);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        // eslint-disable-next-line import/no-unresolved
        const Location = await import('expo-location');
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = loc.coords;
        const rev = await Location.reverseGeocodeAsync({ latitude, longitude });
        const place = rev?.[0];
        const city = [place?.city, place?.subregion, place?.region].filter(Boolean)[0];
        setLocationName(city || `${latitude.toFixed(2)},${longitude.toFixed(2)}`);

        // Current temp via OpenWeather (fallback to 3h forecast first entry)
        const OW_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;
        if (OW_KEY) {
          // Use One Call API for true hourly forecast
          const ow = await fetch(`https://api.openweathermap.org/data/2.5/onecall?lat=${latitude}&lon=${longitude}&exclude=minutely,daily,alerts&units=metric&appid=${OW_KEY}`)
            .then(r => r.json()).catch(()=>null);
          const current = ow?.current;
          if (current) setWeather({ temp: Math.round(current.temp), condition: current.weather?.[0]?.main || '' });

          // Build hourly forecast for the rest of today (hourly granularity)
          const tz = Number(ow?.timezone_offset || 0); // seconds
          const nowLocal = new Date((Math.floor(Date.now()/1000) + tz) * 1000);
          const y = nowLocal.getFullYear(), m = nowLocal.getMonth(), d = nowLocal.getDate();
          let items: Array<{ time: string; temp: number; desc?: string; icon?: string }> = [];
          (ow?.hourly || []).slice(0, 24).forEach((it: any) => {
            const dtLocal = new Date((it.dt + tz) * 1000);
            if (dtLocal.getFullYear()===y && dtLocal.getMonth()===m && dtLocal.getDate()===d) {
              const hh = dtLocal.getHours().toString().padStart(2,'0');
              const desc = String(it.weather?.[0]?.description || '').replace(/\b\w/g, c => c.toUpperCase());
              items.push({ time: `${hh}:00`, temp: Math.round(it.temp), desc, icon: it.weather?.[0]?.icon });
            }
          });
          // If timezone filtering yielded nothing, show next 24 hours from now
          if (items.length === 0 && Array.isArray(ow?.hourly)) {
            items = (ow.hourly as any[]).slice(0, 24).map((it: any) => {
              const dtLocal = new Date((it.dt + tz) * 1000);
              const hh = dtLocal.getHours().toString().padStart(2,'0');
              const desc = String(it.weather?.[0]?.description || '').replace(/\b\w/g, c => c.toUpperCase());
              return { time: `${hh}:00`, temp: Math.round(it.temp), desc, icon: it.weather?.[0]?.icon };
            });
          }
          setHourly(items);
        } else {
          // fallback: Open-Meteo current temp
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m`;
          const res = await fetch(url).then(r => r.json()).catch(() => null);
          const temp = res?.current?.temperature_2m;
          setWeather({ temp, condition: '' });
          setHourly([]);
        }
      } catch {}
    })();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPlants();
    setRefreshing(false);
  };

  const renderPlant = ({ item }: { item: any }) => {
    let parsedResult = null;
    try {
      parsedResult = JSON.parse(item.result);
    } catch (e) {}

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardDate}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        {item.imageUri && (
          <Image source={{ uri: item.imageUri }} style={styles.cardImage} />
        )}
        {parsedResult && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultLabel}>{t('orders.status')}:</Text>
            <Text style={styles.resultValue}>{parsedResult.disease_status || 'N/A'}</Text>

            {parsedResult.disease_name && (
              <>
                <Text style={styles.resultLabel}>{t('analysis.diseaseOrPest')}</Text>
                <Text style={styles.resultValue}>{parsedResult.disease_name}</Text>
              </>
            )}

            {parsedResult.severity && (
              <>
                <Text style={styles.resultLabel}>{t('analysis.severity')}</Text>
                <Text style={styles.resultValue}>{parsedResult.severity}</Text>
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader />

      {/* Weather card */}
      <View style={{ backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#2d5016' }}>{locationName || 'Your location'}</Text>
        {weather?.temp !== undefined && (
          <Text style={{ marginTop: 4, fontSize: 16, color: '#333' }}>{Math.round(weather.temp)}°C now</Text>
        )}
        {hourly.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ gap: 10 }}>
            {hourly.map((h, idx) => (
              <View key={`${h.time}-${idx}`} style={{ paddingVertical: 8, paddingHorizontal: 10, backgroundColor: '#f6faf6', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, minWidth: 80, alignItems: 'center' }}>
                <Text style={{ color: '#2d5016', fontWeight: '700' }}>{h.time}</Text>
                <Text style={{ color: '#333', marginTop: 2 }}>{h.temp}°C</Text>
                {!!h.desc && <Text style={{ color: '#666', fontSize: 12 }} numberOfLines={1}>{h.desc}</Text>}
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Crop Doctor */}
      <View style={{ backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#2d5016' }}>Crop Doctor</Text>
          <TouchableOpacity onPress={() => setCropModalVisible(true)} style={{ backgroundColor: '#4caf50', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>Manage Crops</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }} contentContainerStyle={{ gap: 12, paddingRight: 12 }}>
          {selectedCrops.map(id => {
            const crop = allCrops.find((c:any) => Number(c.id) === Number(id));
            if (!crop) return null;
            return (
              <View key={id} style={{ width: 160, backgroundColor: '#f9f9f9', borderRadius: 12, borderWidth: 1, borderColor: '#e0e0e0', overflow: 'hidden' }}>
                <TouchableOpacity onPress={async () => {
                  setGuideLoading(true); setGuideModalVisible(true); setGuideCrop(crop);
                  const data = await getCropGuide(Number(crop.id), (currentLanguage === 'ta' ? 'ta' : 'en') as any);
                  setGuideData(data); setGuideLoading(false);
                }}>
                  <Image source={crop.image ? { uri: crop.image } : require('../../assets/images/icon.png')} style={{ width: '100%', height: 100 }} />
                  <View style={{ padding: 10 }}>
                    <Text style={{ color: '#2d5016', fontWeight: '700' }} numberOfLines={1}>{currentLanguage==='ta' && crop.name_ta ? crop.name_ta : crop.name}</Text>
                    <Text style={{ color: '#666', fontSize: 12 }} numberOfLines={2}>Cultivation • Pest • Disease</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  const next = selectedCrops.filter(c => Number(c) !== Number(id));
                  setSelectedCrops(next);
                  AsyncStorage.setItem('@agro_crops', JSON.stringify(next)).catch(()=>{});
                }} style={{ position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 12, padding: 4 }}>
                  <Ionicons name="trash" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            );
          })}
          {selectedCrops.length === 0 && (
            <Text style={{ color: '#666' }}>Tap Manage to add crops from list</Text>
          )}
        </ScrollView>
      </View>

      {plants.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🌱</Text>
          <Text style={styles.emptyText}>{t('home.noRecentScans')}</Text>
          <Text style={styles.emptySubtext}>
            {t('home.getStarted')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={plants}
          renderItem={renderPlant}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
      {/* Crop selection modal */}
      <Modal visible={cropModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff' }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' }}>
          <Text style={{ fontSize: 18, fontWeight: '700' }}>Manage Crops</Text>
            <TouchableOpacity onPress={() => setCropModalVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16 }}>
            {/* Admin add-new-crop moved to Masters */}
              <TextInput
                placeholder="Name (English)"
                placeholderTextColor="#999"
                value={newCropName}
                onChangeText={setNewCropName}
                style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 12, marginBottom: 8 }}
              />
              <TextInput
                placeholder="Name (Tamil)"
                placeholderTextColor="#999"
                value={newCropNameTa}
                onChangeText={setNewCropNameTa}
                style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 12, marginBottom: 8 }}
              />
              {newCropImage ? (
                <Image source={{ uri: newCropImage }} style={{ width: '100%', height: 120, borderRadius: 8, marginBottom: 8 }} />
              ) : null}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <TouchableOpacity
                  onPress={async () => {
                    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] as any, quality: 0.9 });
                    if (!res.canceled) setNewCropImage(res.assets[0].uri);
                  }}
                  style={{ flex: 1, backgroundColor: '#e8f5e9', borderRadius: 8, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#c8e6c9' }}
                >
                  <Text style={{ color: '#2d5016', fontWeight: '600' }}>Pick Image</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setNewCropImage(null); }}
                  style={{ width: 90, backgroundColor: '#ffe0e0', borderRadius: 8, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#ffcccc' }}
                >
                  <Text style={{ color: '#c62828', fontWeight: '600' }}>Clear</Text>
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 14, fontWeight: '700', marginBottom: 6, color: '#2d5016' }}>Cultivation Guide</Text>
              <TextInput
                placeholder="Add cultivation steps, soil, watering, etc."
                placeholderTextColor="#999"
                value={cultivationGuide}
                onChangeText={setCultivationGuide}
                multiline
                numberOfLines={4}
                style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 12, marginBottom: 8, minHeight: 100, textAlignVertical: 'top' }}
              />

              <Text style={{ fontSize: 14, fontWeight: '700', marginBottom: 6, color: '#2d5016' }}>Pest Management</Text>
              <TextInput
                placeholder="Common pests and controls"
                placeholderTextColor="#999"
                value={pestManagement}
                onChangeText={setPestManagement}
                multiline
                numberOfLines={3}
                style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 12, marginBottom: 8, minHeight: 80, textAlignVertical: 'top' }}
              />

              <Text style={{ fontSize: 14, fontWeight: '700', marginBottom: 6, color: '#2d5016' }}>Disease Management</Text>
              <TextInput
                placeholder="Common diseases and remedies"
                placeholderTextColor="#999"
                value={diseaseManagement}
                onChangeText={setDiseaseManagement}
                multiline
                numberOfLines={3}
                style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 12, marginBottom: 12, minHeight: 80, textAlignVertical: 'top' }}
              />

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={async () => {
                    if (!newCropName.trim()) { Alert.alert('Error', 'Please enter crop name'); return; }
                    const id = await addCrop({ name: newCropName.trim(), name_ta: newCropNameTa.trim() || undefined, image: newCropImage || undefined });
                    if (id) {
                      // Save English guide content
                      await upsertCropGuide(Number(id), 'en', {
                        cultivation_guide: cultivationGuide.trim() || undefined,
                        pest_management: pestManagement.trim() || undefined,
                        disease_management: diseaseManagement.trim() || undefined,
                      });
                      setNewCropName(''); setNewCropNameTa(''); setNewCropImage(null);
                      setCultivationGuide(''); setPestManagement(''); setDiseaseManagement('');
                      const crops = await getAllCrops() as any[]; setAllCrops(crops);
                      Alert.alert('Success', 'Crop added');
                    } else {
                      Alert.alert('Error', 'Failed to add crop');
                    }
                  }}
                  style={{ flex: 1, backgroundColor: '#4caf50', borderRadius: 8, padding: 12, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Save Crop</Text>
                </TouchableOpacity>
              </View>

            <View>
              <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8, color: '#2d5016' }}>Select Crops</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {allCrops.map((crop:any) => {
                  const active = selectedCrops.includes(Number(crop.id));
                  return (
                    <TouchableOpacity key={crop.id} onPress={() => {
                      const next = active ? selectedCrops.filter(c => c !== Number(crop.id)) : [...selectedCrops, Number(crop.id)];
                      setSelectedCrops(next);
                      AsyncStorage.setItem('@agro_crops', JSON.stringify(next)).catch(()=>{});
                    }} style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, borderWidth: 2, borderColor: active ? '#4caf50' : '#e0e0e0', backgroundColor: active ? '#f1f8f4' : '#f9f9f9' }}>
                      <Text style={{ color: active ? '#4caf50' : '#333', fontWeight: '600' }}>{crop.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>
          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#e0e0e0' }}>
            <TouchableOpacity onPress={() => setCropModalVisible(false)} style={{ backgroundColor: '#4caf50', padding: 16, borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: 10 }} />
          <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#fff' }} />
        </View>
      </Modal>

    {/* Crop Guide Modal */}
    <Modal visible={guideModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setGuideModalVisible(false)}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff' }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' }}>
          <Text style={{ fontSize: 18, fontWeight: '700' }}>{guideCrop ? (currentLanguage==='ta' && guideCrop.name_ta ? guideCrop.name_ta : guideCrop.name) : 'Crop Guide'}</Text>
        <TouchableOpacity onPress={() => setGuideModalVisible(false)}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 20, gap: 12 }}>
        {guideLoading ? (
          <Text>Loading...</Text>
        ) : guideData ? (
          <>
            {guideCrop?.image && (
              <Image source={{ uri: guideCrop.image }} style={{ width: '100%', height: 180, borderRadius: 12 }} />
            )}
            {!!guideData.cultivation_guide && (
              <View style={{ backgroundColor: '#f9f9f9', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e0e0e0' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#2d5016', marginBottom: 6 }}>Cultivation Guide</Text>
                <Text style={{ color: '#333', lineHeight: 20 }}>{guideData.cultivation_guide}</Text>
              </View>
            )}
            {!!guideData.pest_management && (
              <View style={{ backgroundColor: '#f9f9f9', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e0e0e0' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#2d5016', marginBottom: 6 }}>Pest Management</Text>
                <Text style={{ color: '#333', lineHeight: 20 }}>{guideData.pest_management}</Text>
              </View>
            )}
            {!!guideData.disease_management && (
              <View style={{ backgroundColor: '#f9f9f9', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e0e0e0' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#2d5016', marginBottom: 6 }}>Disease Management</Text>
                <Text style={{ color: '#333', lineHeight: 20 }}>{guideData.disease_management}</Text>
              </View>
            )}
            <TouchableOpacity onPress={() => {
              if (!guideCrop) return;
              const next = selectedCrops.filter(c => Number(c) !== Number(guideCrop.id));
              setSelectedCrops(next);
              AsyncStorage.setItem('@agro_crops', JSON.stringify(next)).catch(()=>{});
              setGuideModalVisible(false);
            }} style={{ backgroundColor: '#f44336', padding: 14, borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Remove from My Crops</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text>No guide available.</Text>
        )}
      </ScrollView>
      <View style={{ height: 10 }} />
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#fff' }} />
    </Modal>

    <View style={{ height: 10 }} />
    <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#f5f5f5' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4caf50',
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  logo: {
    width: 36,
    height: 36,
    marginRight: 10,
    borderRadius: 8,
    transform: [{ scale: 1.2 }],
    overflow: 'hidden',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    display: 'none',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2d5016',
  },
  cardDate: {
    fontSize: 14,
    color: '#999',
  },
  cardImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  resultContainer: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 8,
  },
  resultValue: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
