export function formatGeminiResult(jsonString: string) {
  try {
    const data = JSON.parse(jsonString);
    return {
      plant: data.plant || "Unknown",
      disease_or_pest: data.disease_or_pest || "N/A",
      description: data.description || "",
      keywords: data.keywords || [],
    };
  } catch (err) {
    console.error("Failed to parse Gemini output", err);
    return null;
  }
}
