import axios from "axios";

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

export async function analyzePlantImage(base64Image: string, plantName: string, language: 'en' | 'ta' = 'en') {
  if (!apiKey) throw new Error("Missing Gemini API key");

  const base64Raw = base64Image.split(",")[1] ?? base64Image;

  const prompts = {
    en: `
You are a plant disease and pest identification assistant.
The plant is: ${plantName}.
Analyze the image and return:
1. Disease or pest
2. Short description
3. 3–5 keywords
Respond strictly in JSON:
{ "plant": "${plantName}", "disease_or_pest": "...", "description": "...", "keywords": ["..."] }
`,
    ta: `
நீங்கள் ஒரு தாவர நோய் மற்றும் பூச்சி அடையாள உதவியாளர்.
தாவரம்: ${plantName}.
படத்தை ஆய்வு செய்து பின்வருவனவற்றை வழங்கவும்:
1. நோய் அல்லது பூச்சி
2. சுருக்கமான விளக்கம்
3. 3-5 முக்கிய வார்த்தைகள்
கண்டிப்பாக JSON வடிவத்தில் பதிலளிக்கவும் (தமிழில்):
{ "plant": "${plantName}", "disease_or_pest": "...", "description": "...", "keywords": ["..."] }
அனைத்து மதிப்புகளும் தமிழில் இருக்க வேண்டும்.
`
  };

  const prompt = prompts[language];

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "image/jpeg", data: base64Raw } },
        ],
      },
    ],
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const res = await axios.post(url, payload, {
      headers: { "Content-Type": "application/json" },
    });

    const textOutput = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOutput) throw new Error("No response from Gemini API");

    // ✅ Extract JSON object from text
    const jsonMatch = textOutput.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("No JSON found in Gemini response:", textOutput);
      return { plant: plantName, disease_or_pest: "Unknown", description: textOutput, keywords: [] };
    }

    try {
      return JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.warn("Failed to parse extracted JSON:", jsonMatch[0]);
      return { plant: plantName, disease_or_pest: "Unknown", description: textOutput, keywords: [] };
    }
  } catch (err: any) {
    console.error("Gemini API error:", err.response?.data || err.message);
    throw err;
  }
}
