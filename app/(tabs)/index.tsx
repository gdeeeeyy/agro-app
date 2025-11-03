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
import { getAllPlants } from '../../lib/database';
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
  const [dateLabel, setDateLabel] = useState<string>('');
  const [timeLabel, setTimeLabel] = useState<string>('');

  const loadPlants = async () => {
    if (!user) return;
    const allPlants = await getAllPlants(user.id);
    setPlants(allPlants);
  };

  useEffect(() => {
    loadPlants();
  }, [user]);


  // Keep header time real-time (updates every 30s)
  useEffect(() => {
    const tick = () => {
      const nowFmt = new Date();
      setDateLabel(nowFmt.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }));
      setTimeLabel(nowFmt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
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

        // Open-Meteo hourly forecast for today (no API key)
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,precipitation,weather_code&timezone=auto`;
        const res = await fetch(url).then(r => r.json()).catch(() => null);
        const times: string[] = res?.hourly?.time || [];
        const temps: number[] = res?.hourly?.temperature_2m || [];
        const precs: number[] = res?.hourly?.precipitation || [];
        // API may return weather_code or weathercode depending on version
        const codes: number[] = res?.hourly?.weather_code || res?.hourly?.weathercode || [];

        const nowFmt = new Date();
        setDateLabel(nowFmt.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }));
        setTimeLabel(nowFmt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));

        const codeToText = (c: number) => {
          const map: Record<number, string> = {
            0: 'Clear', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Cloudy',
            45: 'Fog', 48: 'Fog', 51: 'Drizzle', 53: 'Drizzle', 55: 'Drizzle',
            56: 'Freezing Drizzle', 57: 'Freezing Drizzle',
            61: 'Light Rain', 63: 'Rain', 65: 'Heavy Rain',
            66: 'Freezing Rain', 67: 'Freezing Rain',
            71: 'Light Snow', 73: 'Snow', 75: 'Heavy Snow', 77: 'Snow Grains',
            80: 'Rain Showers', 81: 'Rain Showers', 82: 'Heavy Showers',
            85: 'Snow Showers', 86: 'Snow Showers',
            95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm'
          };
          return map[c] || '—';
        };

        // Build list for today only
        const now = new Date();
        const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
        const items: Array<{ time: string; temp: number; desc?: string; icon?: string }> = [];
        const nowDt = new Date();
        for (let i = 0; i < times.length; i++) {
          const dt = new Date(times[i]);
          if (dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d && dt >= nowDt) {
            const hh = dt.getHours().toString().padStart(2, '0');
            const desc = codeToText(Number(codes[i] ?? -1));
            items.push({ time: `${hh}:00`, temp: Math.round(Number(temps[i] ?? 0)), desc });
          }
        }
        setHourly(items);

        // Set current temperature/condition from the closest hour
        if (items.length > 0) {
          const idx = (() => {
            let best = 0; let bestDiff = Infinity;
            for (let i = 0; i < times.length; i++) {
              const dt = new Date(times[i]).getTime();
              const diff = Math.abs(dt - Date.now());
              if (diff < bestDiff) { best = i; bestDiff = diff; }
            }
            return best;
          })();
          setWeather({ temp: Math.round(Number(temps[idx] ?? items[0].temp)), condition: codeToText(Number(codes[idx] ?? -1)) });
        } else {
          setWeather({ temp: undefined, condition: '' });
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            {dateLabel ? (
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#2d5016' }}>{dateLabel}</Text>
            ) : null}
            {timeLabel ? (
              <Text style={{ fontSize: 16, color: '#2d5016', marginTop: 2 }}>{timeLabel}</Text>
            ) : null}
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#2d5016', marginTop: 6 }} numberOfLines={1}>{locationName || 'Your location'}</Text>
          </View>
          {weather?.temp !== undefined && (
            <View style={{ alignItems: 'flex-end', minWidth: 80 }}>
              <Text style={{ fontSize: 28, fontWeight: '800', color: '#2d5016' }}>{Math.round(weather.temp)}°C</Text>
              {!!weather?.condition && (
                <Text style={{ color: '#666', marginTop: 2 }}>{weather.condition}</Text>
              )}
            </View>
          )}
        </View>
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
