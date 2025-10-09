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
import PlantAnalysis from "../../components/PlantAnalysis";
import { UserContext } from "../../context/UserContext";
import { savePlant } from "../../lib/database";
import { analyzePlantImage } from "../../lib/gemini";
import { useTranslation } from 'react-i18next';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [plantName, setPlantName] = useState<string>("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const { user } = useContext(UserContext);
  const { t, i18n } = useTranslation();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const handleImageSourceSelection = () => {
    setShowSourceModal(true);
  };

  const pickImageFromGallery = async () => {
    setShowSourceModal(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setResult(null);
    }
  };

  const openCamera = async () => {
    setShowSourceModal(false);
    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();
      if (!permission.granted) {
        Alert.alert(t('errors.cameraPermission'));
        return;
      }
    }
    setShowCamera(true);
  };

  const cameraRef = React.useRef<any>(null);

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      setImage(photo.uri);
      setResult(null);
      setShowCamera(false);
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
      Alert.alert(t('errors.selectImage'), t('errors.selectImage'));
      return;
    }

    if (!user) {
      Alert.alert("Error", "Login required to save analysis.");
      return;
    }

    setLoading(true);
    try {
      const base64 = await uriToBase64(image);
      const geminiResponse = await analyzePlantImage(base64, plantName, i18n.language);

      setResult(geminiResponse);
      await savePlant(user.id, plantName, image, JSON.stringify(geminiResponse));

      Alert.alert("Success", "Analysis saved.");
      setImage(null);
      setPlantName("");
    } catch (error) {
      console.error("Analysis error:", error);
      Alert.alert(t('errors.analysisError'), t('errors.analysisError'));
    }
    setLoading(false);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('home.title')}</Text>
        <Text style={styles.headerSubtitle}>{t('home.subtitle')}</Text>
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

        <TouchableOpacity style={styles.pickButton} onPress={handleImageSourceSelection}>
          <Text style={styles.pickButtonText}>
            {image ? "Change Image" : t('home.uploadImage')}
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
            <Text style={styles.analyzeButtonText}>{t('home.analyze')}</Text>
          )}
        </TouchableOpacity>

        {result && !result.error && <PlantAnalysis data={result} />}
      </ScrollView>

      <Modal visible={showSourceModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('home.chooseSource')}</Text>

            <TouchableOpacity style={styles.modalButton} onPress={openCamera}>
              <Text style={styles.modalButtonText}>{t('home.camera')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalButton} onPress={pickImageFromGallery}>
              <Text style={styles.modalButtonText}>{t('home.gallery')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.modalCancelButton]}
              onPress={() => setShowSourceModal(false)}
            >
              <Text style={styles.modalCancelButtonText}>{t('home.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {showCamera && (
        <Modal visible={showCamera} animationType="slide">
          <View style={styles.cameraContainer}>
            <CameraView
              style={styles.camera}
              facing="back"
              ref={cameraRef}
            >
              <View style={styles.cameraControls}>
                <TouchableOpacity
                  style={styles.captureButton}
                  onPress={takePicture}
                >
                  <View style={styles.captureButtonInner} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.closeCameraButton}
                  onPress={() => setShowCamera(false)}
                >
                  <Text style={styles.closeCameraButtonText}>{t('home.cancel')}</Text>
                </TouchableOpacity>
              </View>
            </CameraView>
          </View>
        </Modal>
      )}
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#4caf50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalCancelButton: {
    backgroundColor: '#f5f5f5',
  },
  modalCancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4caf50',
  },
  closeCameraButton: {
    backgroundColor: '#d32f2f',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  closeCameraButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
