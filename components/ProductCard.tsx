import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';

interface Product {
  id: number;
  name: string;
  plant_used: string;
  keywords: string;
  details: string;
  image?: string;
  stock_available: number;
  cost_per_unit: number;
}

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
  listOnlyDescription?: boolean;
  compact?: boolean;
}

export default function ProductCard({ product, onPress, listOnlyDescription, compact = false }: ProductCardProps) {
  const { addItem } = useCart();
  const { t, currentLanguage } = useLanguage();
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const handleAddToCart = async () => {
    if (product.stock_available <= 0) {
      Alert.alert(t('store.outOfStock'), t('store.outOfStock'));
      return;
    }
    if (selectedQuantity <= 0 || selectedQuantity > product.stock_available) {
      Alert.alert(t('common.error'), t('cart.invalidQuantity'));
      return;
    }
    const success = await addItem(product.id, selectedQuantity);
    if (success) {
      Alert.alert(t('common.success'), t('store.addedToCart'));
    } else {
      Alert.alert(t('common.error'), t('store.addToCartError'));
    }
  };

  const [detailsVisible, setDetailsVisible] = useState(false);

  const openDetails = () => setDetailsVisible(true);
  const closeDetails = () => setDetailsVisible(false);

  const Unit = (product as any).unit || 'units';

  return (
    <TouchableOpacity style={[styles.card, compact && styles.cardCompact]} onPress={onPress || openDetails}>
      {!listOnlyDescription && product.image && (
        <Image source={{ uri: product.image }} style={[styles.image, compact && styles.imageCompact]} />
      )}
      
      <View style={[styles.content, compact && styles.contentCompact]}>
        {!listOnlyDescription && (
          <Text style={[styles.name, compact && styles.nameCompact]} numberOfLines={2}>
            {(currentLanguage === 'ta' && (product as any).name_ta) ? (product as any).name_ta : product.name}
          </Text>
        )}
        
        {!compact && !listOnlyDescription ? (
          <Text style={styles.plantUsed} numberOfLines={1}>
            {t('product.plant')}: {(currentLanguage === 'ta' && (product as any).plant_used_ta) ? (product as any).plant_used_ta : product.plant_used}
          </Text>
        ) : null}
        
        {!compact && (
          <Text style={styles.details} numberOfLines={listOnlyDescription ? 6 : 3}>
            {(currentLanguage === 'ta' && (product as any).details_ta) ? (product as any).details_ta : product.details}
          </Text>
        )}
        
        {listOnlyDescription ? null : (
          <>
            {/* Divider */}
            <View style={styles.divider} />
            {/* Name and Price row */}
            <View style={styles.topRow}>
              <Text style={[styles.name, compact && styles.nameCompact]} numberOfLines={1}>
                {(currentLanguage === 'ta' && (product as any).name_ta) ? (product as any).name_ta : product.name}
              </Text>
              <Text style={styles.price}>₹{product.cost_per_unit} / {Unit}</Text>
            </View>
            {/* Stock */}
            <Text style={styles.stock} numberOfLines={1}>
              {product.stock_available > 0 
                ? `Stock: ${product.stock_available} ${Unit}`
                : t('store.outOfStock')}
            </Text>
            {/* Bottom row with qty and big add button */}
            <View style={styles.bottomRow}>
              <View style={styles.inlineQuantity}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => setSelectedQuantity(q => Math.max(1, q - 1))}
                  disabled={product.stock_available <= 0}
                >
                  <Ionicons name="remove" size={16} color="#4caf50" />
                </TouchableOpacity>
                <TextInput
                  style={styles.qtyInput}
                  value={String(selectedQuantity)}
                  onChangeText={(txt) => {
                    const n = parseInt(txt) || 1;
                    setSelectedQuantity(Math.max(1, Math.min(product.stock_available, n)));
                  }}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => setSelectedQuantity(q => Math.min(product.stock_available, q + 1))}
                  disabled={product.stock_available <= 0}
                >
                  <Ionicons name="add" size={16} color="#4caf50" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.fabAdd, product.stock_available <= 0 && styles.addButtonDisabled]}
                onPress={handleAddToCart}
                disabled={product.stock_available <= 0}
              >
                <Ionicons name="add" size={22} color={product.stock_available <= 0 ? '#999' : '#fff'} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <Modal
        visible={detailsVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeDetails}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 500 }] }>
            <Text style={styles.modalTitle}>{(currentLanguage === 'ta' && (product as any).name_ta) ? (product as any).name_ta : product.name}</Text>
            <Text style={[styles.modalStock, { marginBottom: 8 }]}>₹{product.cost_per_unit} / {Unit}</Text>
            <ScrollView style={{ maxHeight: 220 }}>
              <Text style={styles.details}>{(currentLanguage === 'ta' && (product as any).details_ta) ? (product as any).details_ta : product.details}</Text>
            </ScrollView>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
              <TouchableOpacity style={styles.cancelButton} onPress={closeDetails}>
                <Text style={styles.cancelButtonText}>{t('common.close')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  imageCompact: {
    height: 110,
  },
  content: {
    padding: 16,
  },
  contentCompact: {
    padding: 10,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d5016',
    marginBottom: 8,
  },
  nameCompact: {
    fontSize: 14,
    marginBottom: 6,
  },
  cardCompact: {
    width: '48%',
  },
  plantUsed: {
    fontSize: 14,
    color: '#4caf50',
    fontWeight: '500',
    marginBottom: 8,
  },
  details: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  divider: { height: 1, backgroundColor: '#eee', marginTop: 8, marginBottom: 8 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  price: { fontSize: 16, fontWeight: '700', color: '#2d5016' },
  stock: { fontSize: 12, color: '#666', marginTop: 4 },
  fabAdd: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4caf50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    backgroundColor: '#4caf50',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2d5016',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalProductName: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalStock: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  inlineQuantity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 12,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyInput: {
    width: 48,
    height: 32,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityInput: {
    width: 80,
    height: 40,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 16,
    backgroundColor: '#f9f9f9',
  },
  modalTotal: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4caf50',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#4caf50',
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
