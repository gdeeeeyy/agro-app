import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import PlantAnalysis from "../../components/PlantAnalysis"; // ✅ Import component
import { getAllPlants, savePlant } from "../../lib/database";
import { analyzePlantImage } from "../../lib/gemini";

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [plantName, setPlantName] = useState<string>("");
  const [result, setResult] = useState<any>(null); // ✅ Store parsed JSON
  const [loading, setLoading] = useState(false);
  const [savedPlants, setSavedPlants] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const all = await getAllPlants();
      setSavedPlants(all);
    })();
  }, []);

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
      setResult({ error: "❌ Please enter a plant name and select an image." });
      return;
    }

    setLoading(true);
    try {
      const base64 = await uriToBase64(image);

      // ✅ Directly get JSON from Gemini
      const geminiResponse = await analyzePlantImage(base64, plantName);

      setResult(geminiResponse);

      await savePlant(plantName, image, JSON.stringify(geminiResponse));
      const all = await getAllPlants();
      setSavedPlants(all);
    } catch (error) {
      console.error("Analysis error:", error);
      setResult({ error: "❌ Error analyzing image" });
    }
    setLoading(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>🌿 Plant Disease Analyzer</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter Plant Name"
        value={plantName}
        onChangeText={setPlantName}
      />

      <Button title="Pick an Image" onPress={pickImage} />
      {image && <Image source={{ uri: image }} style={styles.image} />}

      <Button
        title="Analyze & Save"
        onPress={analyzeAndSave}
        disabled={!image || !plantName || loading}
      />

      {loading && <ActivityIndicator size="large" color="#00aa00" style={{ marginTop: 20 }} />}

      {/* ✅ Display structured result */}
      {result && !result.error && <PlantAnalysis data={result} />}
      {result?.error && <Text style={styles.result}>{result.error}</Text>}

      {savedPlants.length > 0 && (
        <View style={{ marginTop: 30, width: "100%" }}>
          <Text style={styles.subtitle}>🪴 Saved Plants:</Text>
          {savedPlants.map((p) => (
            <View key={p.id} style={styles.card}>
              <Text style={styles.cardTitle}>{p.name}</Text>
              {p.imageUri && <Image source={{ uri: p.imageUri }} style={styles.cardImage} />}
              <Text style={styles.cardText}>{p.result}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  title: { fontSize: 22, fontWeight: "600", marginBottom: 20 },
  subtitle: { fontSize: 18, fontWeight: "500", marginBottom: 10 },
  input: {
    width: "80%",
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 20,
  },
  image: { width: 300, height: 300, marginVertical: 20, borderRadius: 10 },
  result: { marginTop: 20, fontSize: 16, textAlign: "center" },
  card: { backgroundColor: "#f0f0f0", borderRadius: 10, padding: 10, marginVertical: 8, width: "100%" },
  cardTitle: { fontWeight: "bold", fontSize: 16, marginBottom: 5 },
  cardText: { fontSize: 14 },
  cardImage: { width: "100%", height: 150, borderRadius: 10, marginBottom: 10 },
});
