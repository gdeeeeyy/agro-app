import React from 'react';
import { Stack } from 'expo-router';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function CropGuide() {
  return (
    <Stack.Screen options={{ headerShown: true, title: 'Crop Guide' }} />,
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Cultivation Guide</Text>
        <Text style={styles.section}>Pest Management</Text>
        <Text style={styles.paragraph}>No content yet. Admin can add guidance here.</Text>
        <Text style={styles.section}>Disease Management</Text>
        <Text style={styles.paragraph}>No content yet. Admin can add guidance here.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#2d5016', marginBottom: 12 },
  section: { fontSize: 18, fontWeight: '600', marginTop: 12, color: '#333' },
  paragraph: { fontSize: 14, color: '#555', marginTop: 6, lineHeight: 20 },
});
