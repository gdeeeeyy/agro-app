import React, { useContext, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
} from 'react-native';
import { UserContext } from '../../context/UserContext';
import { getAllPlants, getAllKeywords } from '../../lib/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import { resetDatabase } from '../../lib/resetDatabase';

// (async () => {
//   await resetDatabase();
//   // database.ts will recreate tables automatically
// })();

export default function Home() {
  const { user } = useContext(UserContext);
  const { t } = useLanguage();
  const [plants, setPlants] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [locationName, setLocationName] = useState<string>('');
  const [weather, setWeather] = useState<{ temp?: number; condition?: string }>({});
  const [cropModalVisible, setCropModalVisible] = useState(false);
  const [allCrops, setAllCrops] = useState<string[]>([]);
  const [selectedCrops, setSelectedCrops] = useState<string[]>([]);

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
        const keywords = await getAllKeywords() as any[];
        setAllCrops(keywords.map(k => k.name));
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
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`;
        const res = await fetch(url).then(r => r.json()).catch(() => null);
        const temp = res?.current?.temperature_2m;
        setWeather({ temp, condition: '' });
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
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image source={require('../../assets/images/icon.png')} style={styles.logo} />
            <View>
              <Text style={styles.headerTitle}>{locationName ? `${locationName}${weather.temp !== undefined ? ` • ${Math.round(weather.temp)}°C` : ''}` : t('home.title')}</Text>
              <Text style={styles.headerSubtitle}>{t('home.subtitle')}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={() => router.push('/(tabs)/orders')}>
              <Ionicons name="receipt" size={26} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
              <Ionicons name="person-circle" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={{ backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#2d5016' }}>Crop Doctor</Text>
          <TouchableOpacity onPress={() => setCropModalVisible(true)} style={{ backgroundColor: '#4caf50', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>Add Crops</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {selectedCrops.slice(0,5).map(crop => (
            <TouchableOpacity key={crop} onPress={() => router.push(`/crop/${encodeURIComponent(crop)}`)} style={{ paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#f1f8f4', borderRadius: 20, borderWidth: 1, borderColor: '#4caf50' }}>
              <Text style={{ color: '#2d5016', fontWeight: '600' }}>{crop}</Text>
            </TouchableOpacity>
          ))}
          {selectedCrops.length === 0 && (
            <Text style={{ color: '#666' }}>Select up to 5 crops from admin-added list</Text>
          )}
        </View>
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' }}>
            <Text style={{ fontSize: 18, fontWeight: '700' }}>Select Crops (max 5)</Text>
            <TouchableOpacity onPress={() => setCropModalVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1, padding: 16 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {allCrops.map(name => {
                const active = selectedCrops.includes(name);
                return (
                  <TouchableOpacity key={name} onPress={() => {
                    let next = active ? selectedCrops.filter(c => c !== name) : [...selectedCrops, name];
                    if (next.length > 5) next = next.slice(0,5);
                    setSelectedCrops(next);
                    AsyncStorage.setItem('@agro_crops', JSON.stringify(next)).catch(()=>{});
                  }} style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, borderWidth: 2, borderColor: active ? '#4caf50' : '#e0e0e0', backgroundColor: active ? '#f1f8f4' : '#f9f9f9' }}>
                    <Text style={{ color: active ? '#4caf50' : '#333', fontWeight: '600' }}>{name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#e0e0e0' }}>
            <TouchableOpacity onPress={() => setCropModalVisible(false)} style={{ backgroundColor: '#4caf50', padding: 16, borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 12,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#e8f5e9',
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
