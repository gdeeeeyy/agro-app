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
import PlantAnalysis from "../../components/PlantAnalysis";
import { UserContext } from "../../context/UserContext";
import { savePlant } from "../../lib/database";
import { analyzePlantImage } from "../../lib/gemini";

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [plantName, setPlantName] = useState<string>("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useContext(UserContext);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setResult(null);
    }
  };

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
      Alert.alert("Error", "Login required to save analysis.");
      return;
    }

    setLoading(true);
    try {
      const base64 = await uriToBase64(image);
      const geminiResponse = await analyzePlantImage(base64, plantName);

      setResult(geminiResponse);
      await savePlant(user.id, plantName, image, JSON.stringify(geminiResponse));

      Alert.alert("Success", "Analysis saved.");
      setImage(null);
      setPlantName("");
    } catch (error) {
      console.error("Analysis error:", error);
      Alert.alert("Error", "Analysis failed. Please try again.");
    }
    setLoading(false);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Plant Doctor</Text>
        <Text style={styles.headerSubtitle}>Identify and save plant information</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.inputSection}>
          <Text style={styles.label}>Plant Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter plant name"
            value={plantName}
            onChangeText={setPlantName}
          />
        </View>

        <TouchableOpacity style={styles.pickButton} onPress={pickImage}>
          <Text style={styles.pickButtonText}>
            {image ? "Change Image" : "Pick Image"}
          </Text>
        </TouchableOpacity>

        {image && <Image source={{ uri: image }} style={styles.image} />}

        <TouchableOpacity
          style={[
            styles.analyzeButton,
            (!image || !plantName || loading) && styles.analyzeButtonDisabled,
          ]}
          onPress={analyzeAndSave}
          disabled={!image || !plantName || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.analyzeButtonText}>Analyze and Save</Text>
          )}
        </TouchableOpacity>

        {result && !result.error && <PlantAnalysis data={result} />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    backgroundColor: "#4caf50",
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 32, fontWeight: "700", color: "#fff", marginBottom: 4 },
  headerSubtitle: { fontSize: 16, color: "#e8f5e9" },
  container: { flexGrow: 1, padding: 20 },
  inputSection: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 8 },
  input: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  pickButton: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#4caf50",
    borderStyle: "dashed",
    marginBottom: 20,
  },
  pickButtonText: { fontSize: 16, fontWeight: "600", color: "#4caf50" },
  image: { width: "100%", height: 300, borderRadius: 12, marginBottom: 20 },
  analyzeButton: {
    backgroundColor: "#4caf50",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  analyzeButtonDisabled: { backgroundColor: "#a5d6a7" },
  analyzeButtonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
});
