import axios from "axios";
import Constants from 'expo-constants';

// Get backend API URL from config
const API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'https://agro-app-6hlq.onrender.com';

export async function analyzePlantImage(base64Image: string, plantName: string, language: 'en' | 'ta' = 'en') {
  // Call backend API instead of Gemini directly (API key stays server-side)
  const maxRetries = 3;
  let attempt = 0;
  let lastErr: any = null;

  while (attempt < maxRetries) {
    try {
      const res = await axios.post(`${API_URL}/analyze-plant`, {
        base64Image,
        plantName,
        language
      }, {
        headers: { "Content-Type": "application/json" },
        timeout: 30000, // 30s timeout for AI analysis
      });

      return res.data;
    } catch (err: any) {
      lastErr = err;
      const status = err?.response?.status;
      const retriable = status === 429 || status === 503 || err?.code === 'ECONNABORTED' || err?.message?.includes('Network request failed');
      if (!retriable || attempt === maxRetries - 1) {
        console.error("Plant analysis API error:", err.response?.data || err.message);
        return { plant: plantName, disease_or_pest: "Service unavailable", description: "AI service temporarily unavailable (try again later)", keywords: [] };
      }
      const backoff = 1000 * Math.pow(2, attempt);
      await new Promise(r => setTimeout(r, backoff));
      attempt++;
    }
  }

  return { plant: plantName, disease_or_pest: "Service unavailable", description: String(lastErr?.message || 'Unknown error'), keywords: [] };
}
