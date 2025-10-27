import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLanguage } from "../context/LanguageContext";

interface PlantAnalysisProps {
  data: {
    plant: string;
    disease_or_pest: string;
    description: string;
    keywords: string[];
  };
}

export default function PlantAnalysis({ data }: PlantAnalysisProps) {
  const { t } = useLanguage();
  return (
    <View style={styles.card}>
      <Text style={styles.title}>🌿 {data.plant}</Text>

      <View style={styles.section}>
        <Text style={styles.label}>{t('analysis.diseaseOrPest')}</Text>
        <Text style={styles.value}>{data.disease_or_pest}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>{t('analysis.description')}</Text>
        <Text style={styles.value}>{data.description}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>{t('analysis.keywords')}</Text>
        <View style={styles.keywordContainer}>
          {data.keywords.map((kw, index) => (
            <View key={index} style={styles.keywordChip}>
              <Text style={styles.keywordText}>{kw}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 15,
    marginVertical: 10,
    borderRadius: 12,
    backgroundColor: "#f0f8ff",
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
    color: "#2e7d32",
  },
  section: {
    marginBottom: 8,
  },
  label: {
    fontWeight: "600",
    fontSize: 14,
    color: "#555",
  },
  value: {
    fontSize: 16,
    marginTop: 2,
    color: "#000",
  },
  keywordContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 5,
  },
  keywordChip: {
    backgroundColor: "#a5d6a7",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  keywordText: {
    fontSize: 12,
    color: "#1b5e20",
    fontWeight: "600",
  },
});
