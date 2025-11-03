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
  Pressable,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
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
  const placeholderImage = 'https://via.placeholder.com/800x600?text=Agri+Product';
  const productImage = product.image || placeholderImage;

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

  const SCREEN_H = Dimensions.get('window').height;
  const INITIAL_Y = Math.round(SCREEN_H * 0.35);
  const sheetTranslateY = React.useRef(new Animated.Value(INITIAL_Y)).current;
  const currentOffsetRef = React.useRef(INITIAL_Y);

  const animateTo = (to: number) => {
    currentOffsetRef.current = to;
    Animated.timing(sheetTranslateY, { toValue: to, duration: 180, useNativeDriver: true }).start();
  };

  const openDetails = () => {
    sheetTranslateY.setValue(INITIAL_Y);
    currentOffsetRef.current = INITIAL_Y;
    setDetailsVisible(true);
  };
  const closeDetails = () => setDetailsVisible(false);

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        const next = Math.max(0, currentOffsetRef.current + gesture.dy);
        sheetTranslateY.setValue(next);
      },
      onPanResponderRelease: (_, gesture) => {
        const releasePos = Math.max(0, currentOffsetRef.current + gesture.dy);
        // Snap logic: close, half, or expanded
        if (releasePos > INITIAL_Y + 120) {
          closeDetails();
          return;
        }
        if (releasePos < INITIAL_Y / 2) {
          animateTo(0); // expand
        } else {
          animateTo(INITIAL_Y); // half
        }
      },
    })
  ).current;

  const Unit = (product as any).unit || 'units';

  return (
    <TouchableOpacity style={[styles.card, compact && styles.cardCompact]} onPress={onPress || openDetails}>
      {!listOnlyDescription && (
        <Image source={{ uri: productImage }} style={[styles.image, compact && styles.imageCompact]} />
      )}
      
      <View style={[styles.content, compact && styles.contentCompact]}>
        
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
          <View style={{ flexGrow: 1 }}>
            <Text style={[styles.name, compact && styles.nameCompact]} numberOfLines={2}>
              {(currentLanguage === 'ta' && (product as any).name_ta) ? (product as any).name_ta : product.name}
            </Text>
            <Text style={[styles.price, compact && styles.priceCompact]}>₹{product.cost_per_unit}</Text>
            <Text style={styles.stock} numberOfLines={1}>
              {product.stock_available > 0 
                ? `Stock: ${product.stock_available} ${Unit}`
                : t('store.outOfStock')}
            </Text>
            <View style={styles.bottomRow}>
              <View style={styles.inlineQuantity}>
                <TouchableOpacity
                  style={[styles.qtyBtn, compact && styles.qtyBtnCompact]}
                  onPress={() => setSelectedQuantity(q => Math.max(1, q - 1))}
                  disabled={product.stock_available <= 0}
                >
                  <Ionicons name="remove" size={14} color="#4caf50" />
                </TouchableOpacity>
                <TextInput
                  style={[styles.qtyInput, compact && styles.qtyInputCompact]}
                  value={String(selectedQuantity)}
                  onChangeText={(txt) => {
                    const n = parseInt(txt) || 1;
                    setSelectedQuantity(Math.max(1, Math.min(product.stock_available, n)));
                  }}
                  keyboardType="numeric"
                  underlineColorAndroid="transparent"
                  placeholderTextColor="#777"
                  selectionColor="#4caf50"
                  allowFontScaling={false}
                />
                <TouchableOpacity
                  style={[styles.qtyBtn, compact && styles.qtyBtnCompact]}
                  onPress={() => setSelectedQuantity(q => Math.min(product.stock_available, q + 1))}
                  disabled={product.stock_available <= 0}
                >
                  <Ionicons name="add" size={14} color="#4caf50" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.fabAdd, compact && styles.fabAddCompact, product.stock_available <= 0 && styles.addButtonDisabled]}
                onPress={handleAddToCart}
                disabled={product.stock_available <= 0}
              >
                <Ionicons name="add" size={22} color={product.stock_available <= 0 ? '#999' : '#fff'} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <Modal
        visible={detailsVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeDetails}
      >
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.backdrop} onPress={closeDetails} />
          <Animated.View
            style={[
              styles.bottomSheet,
              { transform: [{ translateY: sheetTranslateY }] },
            ]}
            {...panResponder.panHandlers}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.modalTitle} numberOfLines={2}>
                {(currentLanguage === 'ta' && (product as any).name_ta) ? (product as any).name_ta : product.name}
              </Text>
              <TouchableOpacity onPress={closeDetails}>
                <Ionicons name="close" size={22} color="#333" />
              </TouchableOpacity>
            </View>
            <Image source={{ uri: productImage }} style={styles.fullImage} resizeMode="contain" />
            <ScrollView style={styles.descScroll} contentContainerStyle={styles.descScrollContent}>
              <Text style={styles.fullDetails}>
                {(currentLanguage === 'ta' && (product as any).details_ta) ? (product as any).details_ta : product.details}
              </Text>
            </ScrollView>
            <View style={{ height: 10 }} />
          </Animated.View>
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
    height: 190,
    resizeMode: 'cover',
    backgroundColor: '#eef2e6',
  },
  imageCompact: {
    height: undefined,
    aspectRatio: 1.2,
  },
  content: {
    padding: 12,
    gap: 6,
  },
  contentCompact: {
    padding: 12,
    gap: 6,
    flex: 1,
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d5016',
    marginBottom: 4,
  },
  nameCompact: {
    fontSize: 14,
    marginBottom: 4,
  },
  cardCompact: {
    width: '48%',
    minHeight: 0,
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
  divider: { height: 0 },
  topRow: {},
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  price: { fontSize: 16, fontWeight: '700', color: '#2d5016', marginBottom: 2 },
  priceCompact: { fontSize: 14 },
  stock: { fontSize: 12, color: '#666', marginTop: 2 },
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
  fabAddCompact: { width: 34, height: 34, borderRadius: 17 },
  qtyBtnCompact: { width: 24, height: 24, borderRadius: 12 },
  qtyInputCompact: { width: 46, height: 30, fontSize: 15, lineHeight: 20, ...Platform.select({ android: { height: 32, lineHeight: 20 } }) },
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
  fullModalContainer: { paddingBottom: 24 },
  fullImage: { width: '100%', height: 360, borderRadius: 8, backgroundColor: '#000' },
  fullModalContent: { padding: 16 },
  fullDetails: { fontSize: 14, color: '#333', lineHeight: 20 },
  descScroll: { maxHeight: 240 },
  descScrollContent: { paddingBottom: 8 },
  sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  bottomSheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, maxHeight: '90%' },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyInput: {
    width: 54,
    height: 34,
    borderWidth: 1,
    borderColor: '#bdbdbd',
    borderRadius: 6,
    textAlign: 'center',
    textAlignVertical: 'center',
    paddingVertical: 0,
    paddingTop: 0,
    paddingBottom: 0,
    lineHeight: 22,
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    backgroundColor: '#fff',
    ...Platform.select({ android: { height: 36, lineHeight: 22 } }),
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
