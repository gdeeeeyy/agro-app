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
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import PlantAnalysis from "../../components/PlantAnalysis";
import { UserContext } from "../../context/UserContext";
import { savePlant, findProductsByKeywords } from "../../lib/database";
import { analyzePlantImage } from "../../lib/gemini";
import ProductCard from "../../components/ProductCard";


export default function App() {
  const [image, setImage] = useState<string | null>(null);
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
        'Permission Required',
        'Camera permission is required to take photos. Please enable it in your device settings.'
      );
      return false;
    }
    return true;
  };

  const takePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      Alert.alert("Error", "Please enter a plant name and select an image.");
      return;
    }

    if (!user) {
      Alert.alert("Error", "You must be logged in to analyze plants.");
      return;
    }

    setLoading(true);
    try {
      const base64 = await uriToBase64(image);
      const geminiResponse = await analyzePlantImage(base64, plantName);

      setResult(geminiResponse);

      await savePlant(user.id, plantName, image, JSON.stringify(geminiResponse));

      // Extract keywords from the analysis for better product matching
      const analysisKeywords = extractKeywordsFromAnalysis(geminiResponse, plantName);
      const products = await findProductsByKeywords(analysisKeywords);
      setRecommendedProducts(products);

      Alert.alert("Success", "Plant analysis saved successfully!");
      setImage(null);
      setPlantName("");
    } catch (error) {
      console.error("Analysis error:", error);
      Alert.alert("Error", "Failed to analyze image. Please try again.");
    }
    setLoading(false);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Image source={require('../../assets/images/icon.png')} style={styles.logo} />
          <Text style={styles.headerTitle}>Agriismart Scanner</Text>
        </View>
        <Text style={styles.headerSubtitle}>Faith of the Farmers - AI Plant Analysis</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.inputSection}>
          <Text style={styles.label}>Plant Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Tomato, Rose, Wheat"
            value={plantName}
            onChangeText={setPlantName}
          />
        </View>

        <View style={styles.imagePickerSection}>
          <Text style={styles.label}>Choose Image Source</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cameraButton} onPress={takePhoto}>
              <Ionicons name="camera" size={32} color="#4caf50" />
              <Text style={styles.cameraButtonText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.galleryButton} onPress={pickImageFromGallery}>
              <Ionicons name="images" size={32} color="#4caf50" />
              <Text style={styles.galleryButtonText}>Gallery</Text>
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
            <Text style={styles.analyzeButtonText}>Analyze & Save</Text>
          )}
        </TouchableOpacity>

        {result && !result.error && <PlantAnalysis data={result} />}

        {recommendedProducts.length > 0 && (
          <View style={styles.recommendationsSection}>
            <Text style={styles.recommendationsTitle}>Recommended Products</Text>
            <Text style={styles.recommendationsSubtitle}>
              Based on your plant analysis
            </Text>
            {recommendedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#4caf50",
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
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
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  cameraButton: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#4caf50",
    borderStyle: "solid",
  },
  cameraButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4caf50",
    marginTop: 8,
  },
  galleryButton: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#4caf50",
    borderStyle: "solid",
  },
  galleryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4caf50",
    marginTop: 8,
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
