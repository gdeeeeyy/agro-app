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
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import PlantAnalysis from "../../components/PlantAnalysis";
import { UserContext } from "../../context/UserContext";
import { savePlant, findProductsByKeywords, getRelatedProductsByName } from "../../lib/database";
import { analyzePlantImage } from "../../lib/gemini";
import ProductCard from "../../components/ProductCard";
import { useLanguage } from "../../context/LanguageContext";
import { SafeAreaView } from 'react-native-safe-area-context';


export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const { currentLanguage, t } = useLanguage();
  const [plantName, setPlantName] = useState<string>("");
  const [result, setResult] = useState<any>(null);
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
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
      const geminiResponse = await analyzePlantImage(base64, plantName, currentLanguage);

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

  return (
    <View style={styles.wrapper}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#4caf50' }} />
      <View style={styles.header}>
        <View style={styles.topRight}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} accessibilityLabel="Open Profile">
            <Ionicons name="person-circle" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.brandRow}>
            <Image source={require('../../assets/images/icon.png')} style={styles.logo} />
          <Text style={[styles.headerTitle, { fontSize: 20 }]}>{t('scanner.headerTitle')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.inputSection}>
          <Text style={styles.label}>{t('scanner.plantName')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('scanner.placeholder')}
            value={plantName}
            onChangeText={setPlantName}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.imagePickerSection}>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.actionButton} onPress={takePhoto}>
              <Ionicons name="camera" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>{t('scanner.takePhoto')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={pickImageFromGallery}>
              <Ionicons name="images" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>{t('scanner.gallery')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {image && <Image source={{ uri: image }} style={styles.image} />}

        <TouchableOpacity
          style={[styles.analyzeButton, (!image || !plantName || loading) && styles.analyzeButtonDisabled]}
          onPress={analyzeAndSave}
          disabled={!image || !plantName || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.analyzeButtonText}>{t('scanner.analyzeSave')}</Text>
          )}
        </TouchableOpacity>

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
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#f5f5f5' }} />
    </View>
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
    paddingTop: 0,
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
    gap: 8,
    flex: 1,
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
});
