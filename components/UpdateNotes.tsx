import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function UpdateNotes({ context }: { context?: string }) {
  const [visible, setVisible] = React.useState(true);
  if (!visible) return null;
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Updates {context ? `– ${context}` : ''}</Text>
        <TouchableOpacity onPress={() => setVisible(false)}>
          <Ionicons name="close" size={18} color="#333" />
        </TouchableOpacity>
      </View>
      <ScrollView style={{ maxHeight: 220 }} contentContainerStyle={{ paddingBottom: 6 }}>
        <Text style={styles.section}>Products page</Text>
        <View style={styles.bullets}>
          <Text style={styles.bullet}>• Product cards: everything stays inside the card. Top-right shows a chevron; card displays:</Text>
          <Text style={styles.subBullet}>◦ Image</Text>
          <Text style={styles.subBullet}>◦ Name</Text>
          <Text style={styles.subBullet}>◦ Price with unit, e.g. ₹1000/500 gms</Text>
          <Text style={styles.subBullet}>◦ Stock line</Text>
          <Text style={styles.subBullet}>◦ Smaller quantity controller and a cart button inside the card</Text>
          <Text style={styles.bullet}>• Android quantity input is tuned for Redmi Note 8 Pro:</Text>
          <Text style={styles.subBullet}>◦ Proper height/lineHeight, centered text, higher contrast, no underline, bold digits, platform-specific sizing to avoid clipping.</Text>
        </View>
        <Text style={[styles.section, { marginTop: 8 }]}>Add products page (Admin)</Text>
        <View style={styles.bullets}>
          <Text style={styles.bullet}>• Reworked the form to match “Master – Store Products”:</Text>
          <Text style={styles.subBullet}>◦ Seller Name</Text>
          <Text style={styles.subBullet}>◦ English Name</Text>
          <Text style={styles.subBullet}>◦ Tamil Name</Text>
          <Text style={styles.subBullet}>◦ Description (EN/TA)</Text>
          <Text style={styles.subBullet}>◦ Log details row with Pack Size, Unit (gms/kg/mL/Litres/Nos), Price, Quantity</Text>
          <Text style={styles.subBullet}>◦ You can still attach an image and Save</Text>
          <Text style={styles.bullet}>• Data mapping:</Text>
          <Text style={styles.subBullet}>◦ unit is saved as “{'<'}pack_size{'>'} {'<'}pack_unit{'>'}” (e.g., “500 gms”)</Text>
          <Text style={styles.subBullet}>◦ cost_per_unit is the price you enter</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: '#f1f8f4',
    borderWidth: 1,
    borderColor: '#c8e6c9',
    borderRadius: 10,
    padding: 10,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  title: { color: '#2d5016', fontWeight: '700' },
  section: { color: '#2d5016', fontWeight: '700', marginBottom: 4 },
  bullets: { gap: 2 },
  bullet: { color: '#334' },
  subBullet: { color: '#334', marginLeft: 10 },
});