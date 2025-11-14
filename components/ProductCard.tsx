import React, { useEffect, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { getProductVariants } from '../lib/database';

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
  horizontal?: boolean;
}

export default function ProductCard({ product, onPress, listOnlyDescription, compact = false, horizontal = false }: ProductCardProps) {
  const { addItem } = useCart();
  const { t, currentLanguage } = useLanguage();
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [variants, setVariants] = useState<any[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<number | undefined>(undefined);
  const [unitOpen, setUnitOpen] = useState(false);
  const placeholderImage = 'https://via.placeholder.com/800x600?text=Agri+Product';
  const productImage = product.image || placeholderImage;

  const parseVariantLabel = (label?: string): { quantity?: string; unit?: string } => {
    if (!label || typeof label !== 'string') return {};
    const m = label.trim().match(/^([0-9]+(?:\.[0-9]+)?)\s*([A-Za-z]+)/);
    if (!m) return {};
    return { quantity: m[1], unit: m[2] };
  };

  const fetchVariants = async () => {
    try {
      const vs = await getProductVariants(product.id) as any[];
      setVariants(vs);
      if (vs && vs.length) {
        // Keep current selection if still valid; otherwise select first
        const stillExists = vs.find(v => Number(v.id) === Number(selectedVariantId));
        if (!stillExists) setSelectedVariantId(Number(vs[0].id));
      } else {
        setSelectedVariantId(undefined);
      }
    } catch {}
  };

  useEffect(() => {
    fetchVariants();
  }, [product.id]);

  // Ensure latest variants are visible when opening the product details
  useEffect(() => {
    if (detailsVisible) fetchVariants();
  }, [detailsVisible]);

  const selectedVariant = variants.find(v => Number(v.id) === Number(selectedVariantId));
  const minVariant = variants.reduce((acc: any, v: any) => acc && acc.price <= v.price ? acc : v, variants[0]);
  const serverMinPrice = (product as any).min_price != null ? Number((product as any).min_price) : undefined;
  const serverMinLabel = (product as any).min_label as string | undefined;
  const selParsed = parseVariantLabel(selectedVariant?.label);
  const minParsed = parseVariantLabel(minVariant?.label);
  const serverParsed = parseVariantLabel(serverMinLabel);
  const displayPrice = selectedVariant ? Number(selectedVariant.price)
    : (variants.length ? Number(minVariant?.price) : (serverMinPrice ?? Number(product.cost_per_unit)));
  const displayLabel = selectedVariant ? (selParsed.quantity && selParsed.unit ? `${selParsed.quantity} ${selParsed.unit}` : (selectedVariant?.label || ''))
    : (variants.length ? (minParsed.quantity && minParsed.unit ? `${minParsed.quantity} ${minParsed.unit}` : (minVariant?.label || ''))
       : (serverParsed.quantity && serverParsed.unit ? `${serverParsed.quantity} ${serverParsed.unit}` : (serverMinLabel || '')));

  const doAddToCart = async (qty: number, variantId?: number) => {
    const success = await addItem(product.id, qty, variantId);
    if (success) Alert.alert(t('common.success'), t('store.addedToCart'));
    else Alert.alert(t('common.error'), t('store.addToCartError'));
  };

  const handleAddToCart = async () => {
    // If variants exist, require inline selector (no popup)
    if (variants.length > 0) {
      if (!selectedVariantId) { setUnitOpen(true); return; }
      if (product.stock_available <= 0) { Alert.alert(t('store.outOfStock'), t('store.outOfStock')); return; }
      if (selectedQuantity <= 0 || selectedQuantity > product.stock_available) { Alert.alert(t('common.error'), t('cart.invalidQuantity')); return; }
      await doAddToCart(selectedQuantity, Number(selectedVariantId));
      return;
    }
    if (product.stock_available <= 0) { Alert.alert(t('store.outOfStock'), t('store.outOfStock')); return; }
    if (selectedQuantity <= 0 || selectedQuantity > product.stock_available) { Alert.alert(t('common.error'), t('cart.invalidQuantity')); return; }
    await doAddToCart(selectedQuantity, undefined);
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
    <TouchableOpacity style={[styles.card, horizontal ? styles.cardHorizontal : null, compact && styles.cardCompact]} onPress={onPress || openDetails}>
      {!listOnlyDescription && (
        <Image source={{ uri: productImage }} style={[horizontal ? styles.imageSquareSmall : styles.image, compact && !horizontal && styles.imageCompact]} />
      )}
      
      <View style={[horizontal ? styles.contentRight : styles.content, compact && styles.contentCompact]}>
        {horizontal ? null : (
          !compact && !listOnlyDescription ? (
            <Text style={styles.plantUsed} numberOfLines={1}>
              {t('product.plant')}: {(currentLanguage === 'ta' && (product as any).plant_used_ta) ? (product as any).plant_used_ta : product.plant_used}
            </Text>
          ) : null
        )}
        
        {variants.length > 0 && !horizontal && (
          <View style={styles.unitContainer}>
            <TouchableOpacity style={styles.unitSelector} onPress={()=> setUnitOpen(v=>!v)}>
<Text style={styles.unitSelectorText}>
                {selectedVariant ? `Rs. ${selectedVariant.price} / ${selParsed.quantity && selParsed.unit ? `${selParsed.quantity} ${selParsed.unit}` : (selectedVariant.label || '')}` : 'Select unit'}
              </Text>
              <Ionicons name={unitOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#4caf50" />
            </TouchableOpacity>
            {unitOpen && (
              <ScrollView style={styles.unitDropdownScroll} contentContainerStyle={styles.unitDropdownContent}>
                {variants.map(v => {
                  const p = parseVariantLabel(v.label);
                  const qtyUnit = p.quantity && p.unit ? `${p.quantity} ${p.unit}` : String(v.label || '');
                  return (
                    <TouchableOpacity key={v.id} style={styles.unitItem} onPress={()=> { setSelectedVariantId(Number(v.id)); setUnitOpen(false); }}>
<Text style={styles.unitItemText}>Rs. {v.price} / {qtyUnit}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}
        
        {listOnlyDescription ? null : (
          <View style={{ flexGrow: 1 }}>
            <Text style={[styles.name, compact && styles.nameCompact]} numberOfLines={horizontal ? 1 : 2}>
              {(currentLanguage === 'ta' && (product as any).name_ta) ? (product as any).name_ta : product.name}
            </Text>
            {(product as any).seller_name ? (
              <Text style={styles.sellerTag} numberOfLines={1}>Seller: {(product as any).seller_name}</Text>
            ) : null}
            {horizontal && variants.length > 0 && (
              <View style={styles.unitContainer}>
                <TouchableOpacity style={styles.unitSelector} onPress={()=> setUnitOpen(v=>!v)}>
<Text style={styles.unitSelectorText}>
                    {selectedVariant ? `Rs. ${selectedVariant.price} / ${selParsed.quantity && selParsed.unit ? `${selParsed.quantity} ${selParsed.unit}` : (selectedVariant.label || '')}` : 'Select unit'}
                  </Text>
                  <Ionicons name={unitOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#4caf50" />
                </TouchableOpacity>
                {unitOpen && (
                  <ScrollView style={styles.unitDropdownScroll} contentContainerStyle={styles.unitDropdownContent}>
                    {variants.map(v => {
                      const p = parseVariantLabel(v.label);
                      const qtyUnit = p.quantity && p.unit ? `${p.quantity} ${p.unit}` : String(v.label || '');
                      return (
                        <TouchableOpacity key={v.id} style={styles.unitItem} onPress={()=> { setSelectedVariantId(Number(v.id)); setUnitOpen(false); }}>
<Text style={styles.unitItemText}>Rs. {v.price} / {qtyUnit}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            )}
            <View style={styles.bottomRow}>
              {/* Quantity control (left) */}
              <View style={styles.qtyPill}>
                <TouchableOpacity onPress={() => setSelectedQuantity(q => Math.max(1, q - 1))}>
                  <Ionicons name="remove" size={16} color="#2d5016" />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{selectedQuantity}</Text>
                <TouchableOpacity onPress={() => setSelectedQuantity(q => Math.min(product.stock_available, q + 1))}>
                  <Ionicons name="add" size={16} color="#2d5016" />
                </TouchableOpacity>
              </View>
              {/* Add button (right) */}
              <TouchableOpacity
                style={[styles.fabAdd, compact && styles.fabAddCompact, product.stock_available <= 0 && styles.addButtonDisabled]}
                onPress={handleAddToCart}
                disabled={product.stock_available <= 0}
              >
                <Ionicons name="add" size={20} color={product.stock_available <= 0 ? '#999' : '#fff'} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <Modal
        visible={detailsVisible}
        animationType="fade"
        transparent
        onRequestClose={closeDetails}
      >
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.3)', justifyContent:'center', alignItems:'center', padding:16 }}>
          <View style={{ width:'92%', maxHeight:'80%', backgroundColor:'#fff', borderRadius:16, overflow:'hidden' }}>
            <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:12, borderBottomWidth:1, borderBottomColor:'#e0e0e0' }}>
              <Text style={[styles.modalTitle, { marginBottom: 0 }]} numberOfLines={2}>
                {(currentLanguage === 'ta' && (product as any).name_ta) ? (product as any).name_ta : product.name}
              </Text>
              <TouchableOpacity onPress={closeDetails}>
                <Ionicons name="close" size={22} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 16 }}>
              <Image source={{ uri: productImage }} style={{ width:'100%', height: 180, borderRadius: 12, backgroundColor:'#eef2e6' }} resizeMode="cover" />

              {(product as any).seller_name ? (
                <Text style={[styles.sellerTag, { marginTop: 8 }]}>Seller: {(product as any).seller_name}</Text>
              ) : null}

              <Text style={{ fontSize: 14, color:'#333', marginTop: 12 }}>
                {(currentLanguage === 'ta' && (product as any).details_ta) ? (product as any).details_ta : product.details}
              </Text>

              {variants.length > 0 && (
                <View style={{ marginTop: 12 }}>
                  <TouchableOpacity style={styles.unitSelector} onPress={()=> setUnitOpen(v=>!v)}>
<Text style={styles.unitSelectorText}>
                      {selectedVariant ? `Rs. ${selectedVariant.price} / ${selParsed.quantity && selParsed.unit ? `${selParsed.quantity} ${selParsed.unit}` : (selectedVariant.label || '')}` : 'Select unit'}
                    </Text>
                    <Ionicons name={unitOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#4caf50" />
                  </TouchableOpacity>
                  {unitOpen && (
                    <ScrollView style={styles.unitDropdownScroll} contentContainerStyle={styles.unitDropdownContent}>
                      {variants.map(v => {
                        const p = parseVariantLabel(v.label);
                        const qtyUnit = p.quantity && p.unit ? `${p.quantity} ${p.unit}` : String(v.label || '');
                        return (
                          <TouchableOpacity key={v.id} style={styles.unitItem} onPress={()=> { setSelectedVariantId(Number(v.id)); setUnitOpen(false); }}>
<Text style={styles.unitItemText}>Rs. {v.price} / {qtyUnit}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              )}

              <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop: 16 }}>
                <View style={[styles.qtyPill, { paddingHorizontal: 16, height: 44, borderRadius: 12 }]}>
                  <TouchableOpacity onPress={() => setSelectedQuantity(q => Math.max(1, q - 1))}>
                    <Ionicons name="remove" size={18} color="#2d5016" />
                  </TouchableOpacity>
                  <Text style={[styles.qtyText, { fontSize: 18 }]}>{selectedQuantity}</Text>
                  <TouchableOpacity onPress={() => setSelectedQuantity(q => Math.min(product.stock_available, q + 1))}>
                    <Ionicons name="add" size={18} color="#2d5016" />
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
            </ScrollView>
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
    minHeight: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  cardHorizontal: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 12,
    paddingVertical: 10,
    minHeight: 120,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    resizeMode: 'cover',
    backgroundColor: '#eef2e6',
  },
  imageSquareSmall: {
    width: 88,
    height: 88,
    resizeMode: 'cover',
    backgroundColor: '#eef2e6',
    marginRight: 12,
    borderRadius: 12,
  },
  imageCompact: {
    height: undefined,
    aspectRatio: 1,
  },
  content: {
    padding: 12,
    gap: 6,
  },
  contentRight: {
    flex: 1,
    paddingVertical: 10,
    paddingRight: 12,
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
    minHeight: 280,
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
  descLine: { fontSize: 12, color: '#4e7c35', fontWeight: '600', marginBottom: 2 },
  priceCompact: { fontSize: 14 },
  stock: { display: 'none' },
  sellerTag: { fontStyle: 'italic', color: '#5e7a47', fontWeight: '600' },
  fabAdd: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  qtyInputCompact: { display: 'none' },
  qtyPill: { flexDirection:'row', alignItems:'center', gap: 12, backgroundColor:'#eaf6ef', paddingHorizontal: 12, height: 36, borderRadius: 10 },
  qtyText: { fontSize: 16, fontWeight:'700', color:'#2d5016' },
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
  fullImageSquare: { width: '100%', aspectRatio: 1, borderRadius: 8, backgroundColor: '#eef2e6' },
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
  inlineQuantity: { display: 'none', flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 12 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  qtyInput: { width: 54, height: 34, borderWidth: 1, borderColor: '#bdbdbd', borderRadius: 6, textAlign: 'center', textAlignVertical: 'center', fontSize: 16, fontWeight: '700', color: '#111', backgroundColor: '#fff', ...Platform.select({ android: { height: 36, lineHeight: 22 } }) },
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
  unitContainer: { marginTop: 6 },
  unitSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#c8e6c9', backgroundColor:'#f1f8f4', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  unitSelectorText: { color:'#2d5016', fontWeight:'700' },
  unitDropdownScroll: { borderWidth:1, borderColor:'#e0e0e0', borderRadius:8, backgroundColor:'#fff', marginTop:6, maxHeight: 200 },
  unitDropdownContent: { paddingVertical: 0 },
  unitItem: { padding:10, borderBottomWidth:1, borderBottomColor:'#f3f3f3' },
  unitItemText: { color:'#333' },
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
  addPrimaryButton: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
