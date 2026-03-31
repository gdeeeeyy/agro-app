import Config from "./config";
import axios from "axios";

// Get backend API URL from config
const API_URL = Config.API_URL;

/**
 * Highly optimized plant analysis using Groq AI via the backend.
 * Groq's high throughput allows for faster response times compared to previous Gemini implementation.
 */
export async function analyzePlantImage(base64Image: string, plantName: string, language: 'en' | 'ta' = 'en') {
  // Call backend API instead of Groq directly (API key stays server-side)
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
        console.error("Plant analysis API error (Groq):", err.response?.data || err.message);
        return { 
          plant: plantName, 
          disease_or_pest: "Service busy", 
          description: "AI analysis is currently under heavy load (Groq). Please try again in a few moments.", 
          keywords: [] 
        };
      }
      const backoff = 1000 * Math.pow(2, attempt);
      await new Promise(r => setTimeout(r, backoff));
      attempt++;
    }
  }

  return { 
    plant: plantName, 
    disease_or_pest: "Connection issue", 
    description: String(lastErr?.message || 'The AI service is temporarily unreachable.'), 
    keywords: [] 
  };
}
