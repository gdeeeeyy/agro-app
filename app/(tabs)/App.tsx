import * as ImagePicker from "expo-image-picker";
import React, { useContext, useState } from "react";
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
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import PlantAnalysis from "../../components/PlantAnalysis";
import { UserContext } from "../../context/UserContext";
import { savePlant, findProductsByKeywords, getRelatedProductsByName, listImprovedArticles } from "../../lib/database";
import { analyzePlantImage } from "../../lib/gemini";
import ProductCard from "../../components/ProductCard";
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
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [disclaimerVisible, setDisclaimerVisible] = useState(true);
  const { user } = useContext(UserContext);

  // Function to extract relevant keywords from analysis
  const extractKeywordsFromAnalysis = (analysis: any, plantName: string): string[] => {
    const keywords: string[] = [];
    
    // Add plant name as primary keyword
    keywords.push(plantName.toLowerCase());
    
    // Extract disease-related keywords
    if (analysis.disease_name) {
      keywords.push(analysis.disease_name.toLowerCase());
    }
    
    // Extract treatment-related keywords
    if (analysis.treatment) {
      const treatmentWords = analysis.treatment.toLowerCase()
        .split(/[,\s]+/)
        .filter((word: string) => word.length > 3)
        .slice(0, 3); // Take top 3 treatment words
      keywords.push(...treatmentWords);
    }
    
    // Extract severity-related keywords
    if (analysis.severity) {
      keywords.push(analysis.severity.toLowerCase());
    }
    
    // Add common agricultural terms based on analysis
    if (analysis.disease_name && analysis.disease_name.toLowerCase().includes('fungal')) {
      keywords.push('fungicide', 'antifungal');
    }
    if (analysis.disease_name && analysis.disease_name.toLowerCase().includes('bacterial')) {
      keywords.push('antibacterial', 'bactericide');
    }
    if (analysis.disease_name && analysis.disease_name.toLowerCase().includes('pest')) {
      keywords.push('pesticide', 'insecticide');
    }
    
    // Remove duplicates and return
    return [...new Set(keywords)].filter(keyword => keyword.length > 2);
  };

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

    const result = await ImagePicker.launchCameraAsync({
mediaTypes: ['images'] as any,
      quality: 1,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setResult(null);
      setRecommendedProducts([]);
    }
  };

const pickImageFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
mediaTypes: ['images'] as any,
      quality: 1,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setResult(null);
      setRecommendedProducts([]);
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
      const geminiResponse = await analyzePlantImage(base64, augmentedName, currentLanguage);

      setResult(geminiResponse);

      await savePlant(user.id, plantName, image, JSON.stringify(geminiResponse));

      // Extract keywords from the analysis for better product matching
      const analysisKeywords = extractKeywordsFromAnalysis(geminiResponse, plantName);
      const products = await findProductsByKeywords(analysisKeywords, 5);

      // Also fetch related products based on the top matched product name
      let related: any[] = [];
      if (products.length > 0) {
        const top = products[0] as any;
        const topName = currentLanguage === 'ta' ? (top.name_ta || top.name) : top.name;
        related = await getRelatedProductsByName(topName, products.map((p: any) => p.id), 3);
      }
      // Merge and dedupe by product id
      const map: Record<string, any> = {};
      [...products, ...related].forEach((p: any) => { map[p.id] = p; });
      const combined = Object.values(map);
      setRecommendedProducts(combined);

      Alert.alert(t('scanner.success'), t('scanner.successSaved'));
      setImage(null);
      setPlantName("");
    } catch (error) {
      console.error("Analysis error:", error);
      Alert.alert(t('scanner.error'), t('scanner.failed'));
    }
    setLoading(false);
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

        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* 1. First ask user to take / pick a photo */}
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
              <Text style={styles.actionButtonText}>Diagnose</Text>
            </TouchableOpacity>
          </View>
        </View>

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

        {(!image || !plantName || loading) ? null : (
          <TouchableOpacity
            style={styles.analyzeButton}
            onPress={analyzeAndSave}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.analyzeButtonText}>{t('scanner.analyzeSave')}</Text>
            )}
          </TouchableOpacity>
        )}

        {result && !result.error && <PlantAnalysis data={result} />}


        {recommendedProducts.length > 0 && (
          <View style={styles.recommendationsSection}>
            <Text style={styles.recommendationsTitle}>{t('scan.recommendations')}</Text>
            <Text style={styles.recommendationsSubtitle}>
              {currentLanguage === 'ta' ? 'உங்கள் தாவர ஆய்வின் அடிப்படையில்' : 'Based on your plant analysis'}
            </Text>
            {recommendedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </View>
        )}
        </ScrollView>
        <View style={{ height: 10 }} />
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#f5f5f5' }} />

      {/* Sample disclaimer popup */}
      <Modal
        visible={disclaimerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDisclaimerVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setDisclaimerVisible(false)}>
          <View style={styles.disclaimerOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.disclaimerCard}>
                <Text style={styles.disclaimerTitle}>Disclaimer</Text>
                <Text style={styles.disclaimerText}>
                  This plant diagnosis is AI-generated and should be used as a guide only.
                  Always consult a qualified agronomist or expert before taking critical decisions.
                </Text>
                <TouchableOpacity
                  style={styles.disclaimerButton}
                  onPress={() => setDisclaimerVisible(false)}
                >
                  <Text style={styles.disclaimerButtonText}>OK, I Understand</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

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
  topRight: {
    position: 'absolute',
    top: 8,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 0,
  },
  wrapper: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#4caf50",
    position: 'relative',
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 12,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  logo: {
    width: 36,
    height: 36,
    marginRight: 12,
    borderRadius: 8,
    transform: [{ scale: 1.2 }],
    overflow: 'hidden',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#e8f5e9",
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
  recommendationsSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  recommendationsTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#2d5016",
    marginBottom: 8,
  },
  recommendationsSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  disclaimerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  disclaimerCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    elevation: 4,
  },
  disclaimerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d5016',
    marginBottom: 8,
  },
  disclaimerText: {
    fontSize: 14,
    color: '#444',
    marginBottom: 16,
  },
  disclaimerButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#4caf50',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  disclaimerButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
