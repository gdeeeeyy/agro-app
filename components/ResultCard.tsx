import React from "react";
import { ScrollView, Text, View } from "react-native";

interface Props {
  result: string | null;
}

export default function ResultCard({ result }: Props) {
  if (!result) return null;

  return (
    <View
      style={{
        backgroundColor: "#f8f8f8",
        borderRadius: 12,
        marginVertical: 10,
        padding: 15,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 3,
      }}
    >
      <Text style={{ fontWeight: "bold", marginBottom: 6, fontSize: 16 }}>
        Result
      </Text>
      <ScrollView style={{ maxHeight: 400 }}>
        <Text style={{ fontFamily: "monospace", color: "#333" }}>{result}</Text>
      </ScrollView>
    </View>
  );
}
