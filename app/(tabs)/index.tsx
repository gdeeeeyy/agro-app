import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLanguage } from '../../context/LanguageContext';
import {
  Image,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  InteractionManager,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';
import { getAllCrops, addScanPlant, getCropGuide, listCropPests, listCropDiseases, listCropPestImages, listCropDiseaseImages, getNotifications } from '../../lib/database';
import { initNotifications, notifyNewServerNotifications, registerPushToken } from '../../lib/systemNotify';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useContext } from 'react';
import { UserContext } from '../../context/UserContext';
// import { resetDatabase } from '../../lib/resetDatabase';

// (async () => {
//   await resetDatabase();
//   // database.ts will recreate tables automatically
// })();

function getWeatherLabelFromCode(code?: number) {
  if (code === undefined || code === null) return '';
  if (code === 0) return 'Sunny';
  if ([1,2].includes(code)) return 'Partly cloudy';
  if (code === 3) return 'Cloudy';
  if ([45,48].includes(code)) return 'Fog';
  if (code>=51 && code<=57) return 'Drizzle';
  if ((code>=61 && code<=67) || [80,81,82].includes(code)) return 'Rain';
  if ((code>=71 && code<=77) || [85,86].includes(code)) return 'Snow';
  if ([95,96,97,98,99].includes(code)) return 'Thunder';
  return 'Cloudy';
}
function getWeatherIconFromCode(code?: number): keyof typeof Ionicons.glyphMap {
  if (code === 0) return 'sunny';
  if ([1,2].includes(code||-1)) return 'partly-sunny';
  if (code === 3) return 'cloudy';
  if ((code||0)>=51 && (code||0)<=67) return 'rainy';
  if ((code||0)>=71 && (code||0)<=77) return 'snow';
  if ([80,81,82].includes(code||-1)) return 'rainy';
  if ([95,96,97,98,99].includes(code||-1)) return 'thunderstorm';
  return 'cloudy';
}

export default function Home() {
  const { t, currentLanguage } = useLanguage();
  const { user } = useContext(UserContext);

  // Crop Doctor selection
  const [cropModalVisible, setCropModalVisible] = useState(false);
  const [allCrops, setAllCrops] = useState<any[]>([]);
  const [selectedCrops, setSelectedCrops] = useState<number[]>([]);
  const [newScannerCropName, setNewScannerCropName] = useState('');
  const [newScannerCropNameTa, setNewScannerCropNameTa] = useState('');

  // Weather state
  const [weather, setWeather] = useState<{ temperature: number; humidity?: number; wind?: number } | null>(null);
  // Notifications
  const [notifVisible, setNotifVisible] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const loadNotifications = async () => {
    try {
      const rows = await getNotifications(user?.id || undefined);
      setNotifications(rows as any[]);
      // Also surface as system notifications for new rows
      await notifyNewServerNotifications(user?.id || null, rows as any[]);
    } catch {}
  };
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [locationLabel, setLocationLabel] = useState<string>('');
  const [hourly, setHourly] = useState<Array<{ time: string; temperature: number; code?: number }>>([]);

  const fetchWeather = async () => {
    try {
      setWeatherLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setWeather(null);
        setLocationLabel('Location permission not granted');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced } as any);
      const lat = loc.coords.latitude;
      const lon = loc.coords.longitude;
      // reverse geocode for location label (may be approximate based on network/GPS)
      try {
        const place = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
        if (place && place[0]) {
          const p = place[0];
          const label = [p.city || p.subregion || p.district, p.region, p.country]
            .filter(Boolean)
            .join(', ');
          setLocationLabel(label || 'Approximate location');
        } else {
          setLocationLabel('Approximate location');
        }
      } catch {
        setLocationLabel('Approximate location');
      }
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&hourly=temperature_2m,weather_code&timezone=auto`;
      const res = await fetch(url);
      const data: any = await res.json();
      const cur = data?.current || {};
      setWeather({
        temperature: typeof cur.temperature_2m === 'number' ? cur.temperature_2m : NaN,
      });
      // hourly starting from now
      // Only remaining hours for today (local time)
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`; // YYYY-MM-DD
      const hourStr = `${dateStr}T${pad(now.getHours())}`; // YYYY-MM-DDTHH
      const h = data?.hourly || {};
      const times: string[] = h.time || [];
      const list = times
        .map((t: string, idx: number) => ({
          time: t,
          temperature: typeof h.temperature_2m?.[idx] === 'number' ? h.temperature_2m[idx] : NaN,
          code: h.weather_code?.[idx],
        }))
        .filter((row: any) => String(row.time).slice(0,10) === dateStr && String(row.time).slice(0,13) >= hourStr);
      setHourly(list);
    } catch {
      setWeather(null);
      setLocationLabel('Weather unavailable');
    } finally {
      setWeatherLoading(false);
    }
  };
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('@agro_crops');
        if (saved) setSelectedCrops(JSON.parse(saved));
        const crops = await getAllCrops() as any[];
        setAllCrops(crops);
        // Prepare notifications permission early
        await initNotifications();
      } catch {}
    })();
  }, []);

  // Register push token when user changes
  useEffect(() => {
    (async () => {
      await registerPushToken(user?.id || null);
    })();
  }, [user?.id]);

  // Kick off weather fetch once
  useEffect(() => {
    fetchWeather();
  }, []);

  // Periodically refresh notifications to raise system notifs
  useEffect(() => {
    let t: any;
    (async () => {
      await loadNotifications();
      t = setInterval(loadNotifications, 30000);
    })();
    return () => { if (t) clearInterval(t); };
  }, [user?.id]);

  // Prefetch guides and counts for selected crops so cards can show content
  useEffect(() => {
    (async () => {
      const lang = currentLanguage === 'ta' ? 'ta' : 'en';
      const entries = await Promise.all(selectedCrops.map(async (id) => {
        try { const g = await getCropGuide(Number(id), lang); return [Number(id), (g as any)?.cultivation_guide || null] as const; }
        catch { return [Number(id), null] as const; }
      }));
      const map: Record<number, string | null> = {};
      entries.forEach(([id, v]) => { map[id] = v; });
      setGuideCache(map);

      const countEntries = await Promise.all(selectedCrops.map(async (id) => {
        try {
          const [p, d] = await Promise.all([listCropPests(Number(id), lang) as any, listCropDiseases(Number(id), lang) as any]);
          return [Number(id), (p?.length || 0), (d?.length || 0)] as const;
        } catch { return [Number(id), 0, 0] as const; }
      }));
      const pc: Record<number, number> = {}; const dc: Record<number, number> = {};
      countEntries.forEach(([id, pcount, dcount]) => { pc[id] = pcount; dc[id] = dcount; });
      setPestCountCache(pc); setDiseaseCountCache(dc);
    })();
  }, [selectedCrops, currentLanguage]);

  // (Removed weather and scans)

  // Bottom sheet state
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetCropId, setSheetCropId] = useState<number | null>(null);
  const [sheetCrop, setSheetCrop] = useState<any | null>(null);
  const [sheetGuide, setSheetGuide] = useState<string | null>(null);
  const [guideCache, setGuideCache] = useState<Record<number, string | null>>({});
  const [pestCountCache, setPestCountCache] = useState<Record<number, number>>({});
  const [diseaseCountCache, setDiseaseCountCache] = useState<Record<number, number>>({});
  const [sheetPests, setSheetPests] = useState<any[]>([]);
  const [sheetDiseases, setSheetDiseases] = useState<any[]>([]);
  const [sheetPestImages, setSheetPestImages] = useState<Record<number, any[]>>({});
  const [sheetDiseaseImages, setSheetDiseaseImages] = useState<Record<number, any[]>>({});
  const [sheetLoading, setSheetLoading] = useState(false);
  const [viewImg, setViewImg] = useState<{ uri: string; caption?: string } | null>(null);

  // Agricultural News (India)
  const [news, setNews] = useState<Array<{ title: string; link: string; pubDate?: string }>>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  const decodeHtml = (input: string) => {
    if (!input) return '';
    return input
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
  };


  const fetchNews = async () => {
    try {
      setNewsLoading(true);
      // Google News RSS for agriculture, switch to Tamil when app language is Tamil
      const lang = currentLanguage === 'ta' ? 'ta' : 'en';
      const query = currentLanguage === 'ta' ? 'விவசாயம்' : 'agriculture';
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${lang}-IN&gl=IN&ceid=IN:${lang}`;
      const res = await fetch(url);
      const xml = await res.text();
      const items: Array<{ title: string; link: string; pubDate?: string; image?: string }> = [];
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let m: RegExpExecArray | null;
      while ((m = itemRegex.exec(xml)) !== null) {
        const block = m[1];
        const get = (tag: string) => {
          const r = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
          const mm = r.exec(block);
          const raw = mm ? mm[1] : '';
          const unCdata = raw.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');
          return decodeHtml(unCdata);
        };
        const title = get('title');
        const link = get('link');
        const pubDate = get('pubDate');
        if (title && link) items.push({ title, link, pubDate });
        if (items.length >= 12) break;
      }
      setNews(items);
    } catch {
      setNews([]);
    } finally {
      setNewsLoading(false);
    }
  };
  useEffect(() => { fetchNews(); }, [currentLanguage]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 16 }}>
      <AppHeader />

      {/* Weather */}
      <View style={{ backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#2d5016' }}>{t('home.weatherTitle')}</Text>
          <View style={{ flexDirection:'row', alignItems:'center' }}>
            <TouchableOpacity onPress={fetchWeather} style={{ paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 }}>
              <Ionicons name="refresh" size={18} color="#2d5016" />
            </TouchableOpacity>
          </View>
        </View>
        {weatherLoading ? (
          <Text style={{ color: '#666', marginTop: 8 }}>{t('common.loading')}</Text>
        ) : weather ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent:'space-between', marginTop: 8 }}>
              <View style={{ flex:1 }}>
                <Text style={{ color: '#666', fontSize: 12 }}>{new Date().toLocaleDateString()}</Text>
                {locationLabel ? <Text style={{ color: '#333', fontWeight:'700', marginTop: 2 }} numberOfLines={1}>{locationLabel}</Text> : null}
              </View>
              <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                <Ionicons name={getWeatherIconFromCode(hourly?.[0]?.code)} size={28} color="#2d5016" />
                <View style={{ alignItems:'flex-end' }}>
                  <Text style={{ fontSize: 28, fontWeight: '800', color: '#2d5016' }}>
                    {isNaN(Number(weather.temperature)) ? '--' : Math.round(Number(weather.temperature))}°C
                  </Text>
                  <Text style={{ color: '#333', fontSize: 12, fontWeight: '600' }}>{getWeatherLabelFromCode(hourly?.[0]?.code)}</Text>
                </View>
              </View>
            </View>
            {hourly.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }} contentContainerStyle={{ gap: 12, paddingRight: 12 }}>
                {hourly.map((h, idx) => (
                  <View key={idx} style={{ padding: 10, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, backgroundColor: '#f9f9f9', minWidth: 90, alignItems: 'center' }}>
                    <Text style={{ color: '#666', fontSize: 12 }}>{new Date(h.time).toLocaleTimeString([], { hour: 'numeric' })}</Text>
                    <Ionicons name={getWeatherIconFromCode(h.code)} size={20} color="#2d5016" style={{ marginTop: 2 }} />
                    <Text style={{ color: '#333', fontWeight: '600', marginTop: 4 }}>{getWeatherLabelFromCode(h.code)}</Text>
                    <Text style={{ color: '#2d5016', fontSize: 16, fontWeight: '700' }}>{isNaN(Number(h.temperature)) ? '--' : Math.round(Number(h.temperature))}°</Text>
                  </View>
                ))}
              </ScrollView>
            ) : null}
          </>
        ) : (
          <Text style={{ color: '#666', marginTop: 8 }}>{t('weather.enableLocation')}</Text>
        )}
      </View>

      {/* Improved Technologies entry point */}
      <View style={{ backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#2d5016' }}>Improved Technologies</Text>
        </View>
        <Text style={{ marginTop: 8, color: '#666', fontSize: 14 }}>
          Bilingual improved practices for agronomy, horticulture, animal husbandry and post-harvest technologies.
        </Text>
        <TouchableOpacity
          style={{ marginTop: 12, alignSelf: 'flex-start', backgroundColor: '#4caf50', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 20 }}
          onPress={() => router.push('/improved-technologies')}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>View Improved Technologies</Text>
        </TouchableOpacity>
      </View>

      {/* Highlights */}
      <View style={{ backgroundColor:'#fff', padding:16, borderBottomWidth:1, borderBottomColor:'#e0e0e0' }}>
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
          <Text style={{ fontSize:20, fontWeight:'700', color:'#2d5016' }}>Highlights</Text>
          <TouchableOpacity onPress={fetchNews} style={{ paddingHorizontal:8, paddingVertical:6, borderRadius:8 }}>
            <Ionicons name="refresh" size={18} color="#2d5016" />
          </TouchableOpacity>
        </View>
        <Text style={{ color:'#666', fontSize:12, marginTop:4 }}>
          Covering agricultural farming, animal rearing, and agricultural value added products.
        </Text>
        {newsLoading ? (
          <Text style={{ color:'#666', marginTop:8 }}>Loading...</Text>
        ) : news.length === 0 ? (
          <Text style={{ color:'#666', marginTop:8 }}>No highlights available</Text>
        ) : (
          <View style={{ marginTop: 12 }}>
            {news.slice(0,10).map((n, idx) => (
              <TouchableOpacity key={idx} onPress={()=> Linking.openURL(n.link)} style={{ marginBottom: 12, borderWidth:1, borderColor:'#e0e0e0', borderRadius:12, backgroundColor:'#fff', overflow:'hidden' }}>
                <View style={{ padding: 12 }}>
                  <Text style={{ color:'#2d5016', fontWeight:'800', fontSize: 16 }} numberOfLines={3}>{n.title}</Text>
                  {n.pubDate ? <Text style={{ color:'#999', fontSize:12, marginTop:4 }}>{new Date(n.pubDate).toLocaleString()}</Text> : null}
                  <Text style={{ color:'#1e88e5', fontSize:12, marginTop:6 }}>Read full story</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Crop selection modal */}
      <Modal visible={cropModalVisible} transparent animationType="fade" onRequestClose={() => setCropModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '92%', maxHeight: '70%', backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' }}>
              <Text style={{ fontSize: 18, fontWeight: '700' }}>{t('home.manageCrops')}</Text>
              <TouchableOpacity onPress={() => setCropModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8, color: '#2d5016' }}>{t('home.selectCrops')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {allCrops.map((crop:any) => {
                  const active = selectedCrops.includes(Number(crop.id));
                  return (
                    <TouchableOpacity key={crop.id} onPress={() => {
                      const next = active
                        ? selectedCrops.filter(c => Number(c) !== Number(crop.id))
                        : [...selectedCrops, Number(crop.id)];
                      setSelectedCrops(next);
                      AsyncStorage.setItem('@agro_crops', JSON.stringify(next)).catch(()=>{});
                    }} style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, borderWidth: 2, borderColor: active ? '#4caf50' : '#e0e0e0', backgroundColor: active ? '#f1f8f4' : '#f9f9f9' }}>
                      <Text style={{ color: active ? '#4caf50' : '#333', fontWeight: '600' }}>{crop.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#e0e0e0' }}>
              <TouchableOpacity onPress={() => setCropModalVisible(false)} style={{ backgroundColor: '#4caf50', padding: 14, borderRadius: 12, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{t('common.done')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: 10 }} />
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#f5f5f5' }} />

      {/* Crop guide bottom sheet (transparent so home stays visible) */}
      <Modal visible={sheetVisible} transparent animationType="slide" onRequestClose={() => setSheetVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-end' }}>
          <View style={{ maxHeight: '85%', backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden' }}>
            <View style={{ backgroundColor: '#4caf50', paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <TouchableOpacity onPress={() => setSheetVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>{currentLanguage==='ta' ? 'பயிர் வழிகாட்டி' : 'Crop Guide'}</Text>
              <View style={{ width: 24 }} />
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
              {sheetCrop && (
                <View>
                  <Image source={sheetCrop.image ? { uri: sheetCrop.image } : require('../../assets/images/icon.png')} style={{ width: '100%', height: 220 }} />
                  <View style={{ padding: 16 }}>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: '#2d5016' }}>{currentLanguage==='ta' && sheetCrop.name_ta ? sheetCrop.name_ta : sheetCrop.name}</Text>
                    <View style={styles.guideBox}>
                      <Text style={styles.guideLabel}>{t('guide.cultivationTitle')}</Text>
                      <Text style={{ marginTop: 6, color: '#333' }}>{sheetGuide || 'No cultivation guide yet.'}</Text>
                    </View>

                    {/* Pests */}
                    {sheetPests.length ? (
                      <View style={styles.guideBox}>
                        <Text style={styles.guideLabel}>Pests</Text>
                        {sheetPests.map((p:any) => (
                          <View key={p.id} style={styles.guideItem}>
                            <Text style={{ fontWeight:'700', color:'#2d5016' }}>{p.name_ta && currentLanguage==='ta' ? p.name_ta : p.name}</Text>
                            {p.description || p.description_ta ? (
                              <>
                                <Text style={[styles.guideLabel, { marginTop:6 }]}>{t('guide.description')}</Text>
                                <Text style={{ color:'#333', marginTop:2 }}>{currentLanguage==='ta' && p.description_ta ? p.description_ta : p.description}</Text>
                              </>
                            ) : null}
                            {Array.isArray(sheetPestImages[p.id]) && sheetPestImages[p.id].length ? (
                              <>
                                <Text style={[styles.guideLabel, { marginTop:6 }]}>{t('guide.images')}</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }} contentContainerStyle={{ gap: 10, paddingRight: 6 }}>
                                  {sheetPestImages[p.id].map((img:any) => (
                                    <TouchableOpacity key={img.id} onPress={()=> setViewImg({ uri: img.image, caption: currentLanguage==='ta' && img.caption_ta ? img.caption_ta : img.caption })}>
                                      <Image source={{ uri: img.image }} style={{ width: 92, height: 92, borderRadius: 8 }} />
                                    </TouchableOpacity>
                                  ))}
                                </ScrollView>
                              </>
                            ) : null}
                            {p.management || p.management_ta ? (
                              <>
                                <Text style={[styles.guideLabel, { marginTop:6 }]}>{t('guide.management')}</Text>
                                <Text style={{ color:'#333', marginTop:2 }}>{currentLanguage==='ta' && p.management_ta ? p.management_ta : p.management}</Text>
                              </>
                            ) : null}
                          </View>
                        ))}
                      </View>
                    ) : null}

                    {/* Diseases */}
                    {sheetDiseases.length ? (
                      <View style={styles.guideBox}>
                        <Text style={styles.guideLabel}>Diseases</Text>
                        {sheetDiseases.map((d:any) => (
                          <View key={d.id} style={styles.guideItem}>
                            <Text style={{ fontWeight:'700', color:'#2d5016' }}>{currentLanguage==='ta' && d.name_ta ? d.name_ta : d.name}</Text>
                            {d.description || d.description_ta ? (
                              <>
                                <Text style={[styles.guideLabel, { marginTop:6 }]}>{t('guide.description')}</Text>
                                <Text style={{ color:'#333', marginTop:2 }}>{currentLanguage==='ta' && d.description_ta ? d.description_ta : d.description}</Text>
                              </>
                            ) : null}
                            {Array.isArray(sheetDiseaseImages[d.id]) && sheetDiseaseImages[d.id].length ? (
                              <>
                                <Text style={[styles.guideLabel, { marginTop:6 }]}>{t('guide.images')}</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }} contentContainerStyle={{ gap: 10, paddingRight: 6 }}>
                                  {sheetDiseaseImages[d.id].map((img:any) => (
                                    <TouchableOpacity key={img.id} onPress={()=> setViewImg({ uri: img.image, caption: currentLanguage==='ta' && img.caption_ta ? img.caption_ta : img.caption })}>
                                      <Image source={{ uri: img.image }} style={{ width: 92, height: 92, borderRadius: 8 }} />
                                    </TouchableOpacity>
                                  ))}
                                </ScrollView>
                              </>
                            ) : null}
                            {d.management || d.management_ta ? (
                              <>
                                <Text style={[styles.guideLabel, { marginTop:6 }]}>{t('guide.management')}</Text>
                                <Text style={{ color:'#333', marginTop:2 }}>{currentLanguage==='ta' && d.management_ta ? d.management_ta : d.management}</Text>
                              </>
                            ) : null}
                          </View>
                        ))}
                      </View>
                    ) : null}

                  </View>
                </View>
              )}
              <SafeAreaView edges={['bottom']} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Image viewer for guide photos */}
      <Modal visible={!!viewImg} transparent animationType="fade" onRequestClose={() => setViewImg(null)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'center', alignItems:'center', padding:16 }}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setViewImg(null)} />
          {viewImg && (
            <View style={{ width:'92%', backgroundColor:'#fff', borderRadius:12, padding:12 }}>
              <Image source={{ uri: viewImg.uri }} style={{ width:'100%', height:320, borderRadius:8, backgroundColor:'#000' }} resizeMode="contain" />
              {viewImg.caption ? (
                <Text style={{ color:'#333', marginTop:8 }}>{viewImg.caption}</Text>
              ) : null}
              <View style={{ alignItems:'flex-end', marginTop:8 }}>
                <TouchableOpacity onPress={() => setViewImg(null)} style={{ paddingVertical:8, paddingHorizontal:12 }}>
                  <Text style={{ color:'#2d5016', fontWeight:'700' }}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* Notifications modal */}
      <Modal visible={notifVisible} transparent animationType="fade" onShow={loadNotifications} onRequestClose={() => setNotifVisible(false)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.3)', justifyContent:'center', alignItems:'center' }}>
          <View style={{ width:'92%', maxHeight:'70%', backgroundColor:'#fff', borderRadius:16, overflow:'hidden' }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:16, borderBottomWidth:1, borderBottomColor:'#e0e0e0' }}>
              <Text style={{ fontSize: 18, fontWeight:'700', color:'#333' }}>Notifications</Text>
              <TouchableOpacity onPress={() => setNotifVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding:16 }}>
              {notifications.length === 0 ? (
                <Text style={{ color:'#666' }}>No notifications yet</Text>
              ) : notifications.map((n:any)=> (
                <View key={n.id} style={{ paddingVertical:10, borderBottomWidth:1, borderBottomColor:'#f0f0f0' }}>
                  <Text style={{ fontWeight:'700', color:'#2d5016' }}>{currentLanguage==='ta' && n.title_ta ? n.title_ta : n.title}</Text>
                  <Text style={{ color:'#333', marginTop:4 }}>{currentLanguage==='ta' && n.message_ta ? n.message_ta : n.message}</Text>
                  <Text style={{ color:'#999', fontSize:12, marginTop:2 }}>{new Date(n.created_at || Date.now()).toLocaleString()}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  guideBox: { borderWidth: 1, borderColor: '#e7efe2', backgroundColor: '#f7fbf4', borderRadius: 10, padding: 12, marginTop: 10 },
  guideLabel: { color: '#99a598', fontWeight: '700' },
  guideItem: { marginTop: 8, padding: 10, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e7efe2' },
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
