import * as ImagePicker from "expo-image-picker";
import React, { useContext, useState, useRef, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  ActionSheetIOS,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import PlantAnalysis from "../../components/PlantAnalysis";
import { UserContext } from "../../context/UserContext";
import { savePlant, listImprovedArticles } from "../../lib/database";
import { analyzePlantImage } from "../../lib/ai";
import { useLanguage } from "../../context/LanguageContext";
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';


export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const { currentLanguage, t } = useLanguage();
  const [plantName, setPlantName] = useState<string>("");
  const [plantNote, setPlantNote] = useState<string>("");
  const [pickerCrops, setPickerCrops] = useState<any[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [othersOpen, setOthersOpen] = useState(false);
  const [othersName, setOthersName] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useContext(UserContext);

  const isFirstFocus = useRef(true);

  const clearResults = useCallback(() => {
    setResult(null);
    setImage(null);
    setPlantName('');
    setPlantNote('');
  }, []);

  const handleClearResults = useCallback(() => {
    Alert.alert(
      currentLanguage === 'ta' ? 'முடிவுகளை அழி' : 'Clear Results',
      currentLanguage === 'ta' ? 'முடிவுகளை அழித்து மீண்டும் பரிசோதனையை தொடங்க வேண்டுமா?' : 'Do you want to clear results and restart the diagnosis?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: currentLanguage === 'ta' ? 'ஆம்' : 'Yes',
          style: 'destructive',
          onPress: clearResults,
        },
      ]
    );
  }, [currentLanguage, t, clearResults]);


  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        t('permissions.cameraRequiredTitle'),
        t('permissions.cameraRequiredMessage')
      );
      return false;
    }
    return true;
  };

  const takePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    const pickerResult = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!pickerResult.canceled) {
      setImage(pickerResult.assets[0].uri);
      setResult(null);
    }
  };

  const pickImageFromGallery = async () => {
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!pickerResult.canceled) {
      setImage(pickerResult.assets[0].uri);
      setResult(null);
    }
  };

  // Convert URI → base64
  const uriToBase64 = async (uri: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = (reader.result as string).split(",")[1];
        resolve(base64data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const analyzeAndSave = async () => {
    if (!image || !plantName) {
      Alert.alert(t('scanner.error'), t('scanner.inputRequired'));
      return;
    }

    if (!user) {
      Alert.alert(t('scanner.error'), t('scanner.loginRequired'));
      return;
    }

    setLoading(true);
    try {
      const base64 = await uriToBase64(image);
      const augmentedName = plantNote ? `${plantName} (Note: ${plantNote})` : plantName;
      
      // Perform AI analysis using the new Groq module
      const aiResponse = await analyzePlantImage(base64, augmentedName, currentLanguage);

      // Immediately update result and stop loading so UI renders right away
      setResult(aiResponse);
      setLoading(false);
      setImage(null);
      setPlantName("");
      setPlantNote("");

      // Continue background tasks after UI has updated
      savePlant(user.id, plantName, image, JSON.stringify(aiResponse)).catch(err => 
        console.error("Save plant error:", err)
      );
    } catch (error) {
      console.error("Analysis error:", error);
      Alert.alert(t('scanner.error'), t('scanner.failed'));
      setLoading(false);
    }
  };

  React.useEffect(() => {
    (async () => {
      try {
        const lang = currentLanguage === 'ta' ? 'ta' : 'en';
        const agro = await listImprovedArticles('agronomy', lang) as any[];
        const hort = await listImprovedArticles('horticulture', lang) as any[];
        const all = [...(Array.isArray(agro) ? agro : []), ...(Array.isArray(hort) ? hort : [])];
        const normalized = all.map((a: any) => ({
          id: a.id,
          name: lang === 'ta' && a.heading_ta ? a.heading_ta : a.heading_en,
        })).filter((a: any) => a.name);
        setPickerCrops(normalized);
      } catch {
        setPickerCrops([]);
      }
    })();
  }, [currentLanguage]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.wrapper}>
        <AppHeader />

        {/* Loading overlay for Diagnose */}
        <Modal
          visible={loading}
          transparent
          animationType="fade"
          onRequestClose={() => {}}
        >
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color="#4caf50" />
              <Text style={styles.loadingText}>{t('scanner.analyzing') || 'Analyzing...'}</Text>
            </View>
          </View>
        </Modal>

        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* 1. First ask user to take / pick a photo - only show if no results */}
        {!result && (
        <View style={styles.imagePickerSection}>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.actionButton} onPress={async () => {
              if (Platform.OS === 'ios') {
                ActionSheetIOS.showActionSheetWithOptions({ options: ['Cancel', t('scanner.takePhoto'), t('scanner.gallery')], cancelButtonIndex: 0 }, async (idx) => {
                  if (idx === 1) await takePhoto();
                  if (idx === 2) await pickImageFromGallery();
                });
              } else {
                Alert.alert(t('scanner.chooseSource'), undefined, [
                  { text: t('scanner.takePhoto'), onPress: takePhoto },
                  { text: t('scanner.gallery'), onPress: pickImageFromGallery },
                  { text: t('common.cancel'), style: 'cancel' },
                ]);
              }
            }}>
              <Ionicons name="image" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>{currentLanguage === 'ta' ? 'பரிசோதி' : 'Diagnose'}</Text>
            </TouchableOpacity>
          </View>
        </View>
        )}

        {image && <Image source={{ uri: image }} style={styles.image} />}

        {/* 2. After photo is present, show crop name + note inputs */}
        {image && (
        <View style={styles.inputSection}>
          <Text style={styles.label}>{t('scanner.plantName')}</Text>
          <TouchableOpacity
            style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
            onPress={() => setPickerVisible(true)}
          >
            <Text style={{ color: plantName ? '#333' : '#999' }}>{plantName || t('scanner.selectFromMasters')}</Text>
            <Ionicons name="chevron-down" size={18} color="#666" />
          </TouchableOpacity>
          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            placeholder={t('scanner.optionalNote')}
            value={plantNote}
            onChangeText={setPlantNote}
            placeholderTextColor="#999"
          />
        </View>
        )}

        {(!image || !plantName) ? null : (
          <TouchableOpacity
            style={[styles.analyzeButton, loading ? styles.analyzeButtonDisabled : null]}
            onPress={analyzeAndSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.analyzeButtonText}>{currentLanguage === 'ta' ? 'ஆய்வு செய்க' : t('scanner.analyzeSave')}</Text>
            )}
          </TouchableOpacity>
        )}

        {result && !result.error && (
          <View style={{ marginTop: 10 }}>
            <PlantAnalysis data={result} />
            <TouchableOpacity 
              style={[styles.actionButton, { marginTop: 20, backgroundColor: '#4caf50' }]} 
              onPress={clearResults}
            >
              <Ionicons name="add-circle" size={24} color="#fff" />
              <Text style={[styles.actionButtonText, { marginLeft: 8 }]}>
                {currentLanguage === 'ta' ? 'புதிய பரிசோதனை' : 'New Diagnosis'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        </ScrollView>
        <View style={{ height: 10 }} />
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#f5f5f5' }} />

      {/* Plant picker modal */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>{t('scanner.plantName')}</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {pickerCrops.map((c:any) => (
                <TouchableOpacity key={c.id} style={styles.sheetRow} onPress={() => { setPlantName(c.name); setPickerVisible(false); setOthersOpen(false); }}>
                  <Ionicons name="leaf" size={20} color="#4caf50" />
                  <Text style={styles.sheetText}>{c.name}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[styles.sheetRow, { justifyContent: 'space-between' }]} onPress={() => setOthersOpen(o => !o)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Ionicons name="ellipsis-horizontal-circle" size={20} color="#4caf50" />
                  <Text style={styles.sheetText}>{t('scanner.others')}</Text>
                </View>
                <Ionicons name={othersOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#666" />
              </TouchableOpacity>
              {othersOpen && (
                <View style={{ paddingHorizontal: 16, gap: 8 }}>
                  <TextInput value={othersName} onChangeText={setOthersName} placeholder={t('scanner.enterPlantName')} placeholderTextColor="#999" style={{ borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 12, backgroundColor: '#fff' }} />
                  <TouchableOpacity onPress={() => { if (othersName.trim()) { setPlantName(othersName.trim()); setPickerVisible(false); } }} style={{ backgroundColor: '#4caf50', padding: 12, borderRadius: 8, alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>{t('scanner.useThisName')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
            <TouchableOpacity style={[styles.sheetRow, { justifyContent: 'center' }]} onPress={() => setPickerVisible(false)}>
              <Text style={[styles.sheetText, { color: '#f44336' }]}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}


const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  container: {
    flexGrow: 1,
    padding: 20,
  },
  inputSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  imagePickerSection: {
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#4caf50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    width: '100%',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  image: {
    width: "100%",
    height: 300,
    borderRadius: 12,
    marginBottom: 20,
  },
  analyzeButton: {
    backgroundColor: "#4caf50",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%'
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  sheetText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  analyzeButtonDisabled: {
    backgroundColor: "#a5d6a7",
  },
  analyzeButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    elevation: 4,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '700',
  },
});
