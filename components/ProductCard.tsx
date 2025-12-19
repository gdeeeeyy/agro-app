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
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { getProductReviews, getProductVariants } from '../lib/database';

interface Product {
  id: number;
  name: string;
  plant_used: string;
  keywords: string;
  details: string;
  name_ta?: string;
  plant_used_ta?: string;
  details_ta?: string;
  image?: string;
  unit?: string;
  stock_available: number;
  cost_per_unit: number;
  min_price?: number;
  min_label?: string;
  seller_name?: string;
  created_by?: number;
  creator_role?: number;
  status?: 'pending' | 'approved' | 'rejected';
  created_at?: string;
  updated_at?: string;
  // rating summary (populated by backend list endpoints)
  avg_rating?: number;
  rating_count?: number;
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
  
  // Type for product variant
  interface ProductVariant {
    id: number;
    label: string;
    price: number;
    stock_available: number;
  }
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<number | undefined>(undefined);
  const [unitOpen, setUnitOpen] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'reviews'>('details');
  
  interface Review {
    id: number;
    rating: number;
    review: string | null;
    full_name: string | null;
    created_at: string;
  }
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const placeholderImage = 'https://via.placeholder.com/800x600?text=Agri+Product';
  const productImage = product.image || placeholderImage;

  // Card-level rating summary (shown outside the popup)
  const cardRatingCount = Number((product as any).rating_count || 0);
  const cardAvgRating = Number((product as any).avg_rating || 0);

  const parseVariantLabel = (label?: string): { quantity?: string; unit?: string } => {
    if (!label || typeof label !== 'string') return {};
    const m = label.trim().match(/^([0-9]+(?:\.[0-9]+)?)\s*([A-Za-z]+)/);
    if (!m) return {};
    return { quantity: m[1], unit: m[2] };
  };

  const fetchVariants = async () => {
    try {
      const vs = (await getProductVariants(product.id)) as ProductVariant[];
      setVariants(vs || []);
      if (vs && vs.length) {
        // Keep current selection if still valid; otherwise select first
        const stillExists = vs.find(v => Number(v.id) === Number(selectedVariantId));
        if (!stillExists) {
          setSelectedVariantId(Number(vs[0].id));
        }
      } else {
        setSelectedVariantId(undefined);
      }
    } catch (error) {
      console.error('Error fetching variants:', error);
      setVariants([]);
      setSelectedVariantId(undefined);
      throw error; // Re-throw to allow error handling in the calling function
    }
  };

  useEffect(() => {
    fetchVariants();
  }, [product.id]);

  // Ensure latest variants are visible when opening the product details
  useEffect(() => {
    if (detailsVisible) fetchVariants();
  }, [detailsVisible]);

  const selectedVariant = variants.find(v => Number(v.id) === Number(selectedVariantId));
  const minVariant = variants.length > 0 
    ? variants.reduce((acc, v) => acc && acc.price <= v.price ? acc : v, variants[0])
    : null;
  const selectedVariantStock = selectedVariant ? Number(selectedVariant.stock_available ?? 0) : 0;
  const anyVariantInStock = variants.some(v => Number(v.stock_available ?? 0) > 0);
  const serverMinPrice = (product as any).min_price != null ? Number((product as any).min_price) : undefined;
  const serverMinLabel = (product as any).min_label as string | undefined;
  const selParsed = parseVariantLabel(selectedVariant?.label);
  const minParsed = parseVariantLabel(minVariant?.label);
  const serverParsed = parseVariantLabel(serverMinLabel);
  const displayPrice = selectedVariant 
    ? Number(selectedVariant.price)
    : (variants.length > 0 && minVariant 
        ? Number(minVariant.price) 
        : (serverMinPrice ?? Number(product.cost_per_unit)));
          
  const displayLabel = selectedVariant 
    ? (selParsed.quantity && selParsed.unit 
        ? `${selParsed.quantity} ${selParsed.unit}` 
        : (selectedVariant?.label || ''))
    : (variants.length > 0 && minVariant
        ? (minParsed.quantity && minParsed.unit 
            ? `${minParsed.quantity} ${minParsed.unit}` 
            : (minVariant?.label || ''))
        : (serverParsed.quantity && serverParsed.unit 
            ? `${serverParsed.quantity} ${serverParsed.unit}` 
            : (serverMinLabel || '')));

  const doAddToCart = async (qty: number, variantId?: number) => {
    try {
      if (qty <= 0) {
        Alert.alert(t('common.error'), t('cart.invalidQuantity'));
        return false;
      }
      const success = await addItem(product.id, qty, variantId);
      if (success) {
        Alert.alert(t('common.success'), t('store.addedToCart'));
        return true;
      } else {
        Alert.alert(t('common.error'), t('store.addToCartError'));
        return false;
      }
    } catch (error) {
      console.error('Error in doAddToCart:', error);
      Alert.alert(t('common.error'), t('common.errorOccurred'));
      return false;
    }
  };

  const handleAddToCart = async () => {
    try {
      setIsLoading(true);
      if (variants.length > 0) {
        if (!selectedVariantId) { setUnitOpen(true); return; }
        const sv = variants.find(v => Number(v.id) === Number(selectedVariantId));
        const vStock = Number(sv?.stock_available ?? 0);
        if (vStock <= 0) { 
          Alert.alert(t('store.outOfStock'), t('store.outOfStock')); 
          return; 
        }
        if (selectedQuantity <= 0 || selectedQuantity > vStock) { 
          Alert.alert(t('common.error'), t('cart.invalidQuantity')); 
          return; 
        }
        await doAddToCart(selectedQuantity, Number(selectedVariantId));
        return;
      }
      if (product.stock_available <= 0) { 
        Alert.alert(t('store.outOfStock'), t('store.outOfStock')); 
        return; 
      }
      if (selectedQuantity <= 0 || selectedQuantity > product.stock_available) { 
        Alert.alert(t('common.error'), t('cart.invalidQuantity')); 
        return; 
      }
      await doAddToCart(selectedQuantity, undefined);
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert(t('common.error'), t('common.errorOccurred'));
    } finally {
      setIsLoading(false);
    }
  };

  const openDetails = async () => {
    if (onPress) {
      onPress();
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Ensure we have variants loaded if needed
      if (variants.length === 0) {
        await fetchVariants();
      }
      
      if (variants.length > 0 && !selectedVariantId && variants[0]) {
        setSelectedVariantId(variants[0].id);
      }
      
      setDetailsVisible(true);
      
      // Fetch reviews when opening the details
      try {
        setReviewsLoading(true);
        const reviewsData = await getProductReviews(product.id);
        const validReviews = Array.isArray(reviewsData) ? reviewsData : [];
        setReviews(validReviews);
        
        // Calculate average rating
        if (validReviews.length > 0) {
          const totalRating = validReviews.reduce((sum, review) => sum + (review.rating || 0), 0);
          setAverageRating(Number((totalRating / validReviews.length).toFixed(1)));
        } else {
          setAverageRating(0);
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
        setReviews([]);
        setAverageRating(0);
      } finally {
        setReviewsLoading(false);
      }
    } catch (error) {
      console.error('Error opening product details:', error);
      Alert.alert(t('common.error'), t('common.errorLoadingProduct'));
    } finally {
      setIsLoading(false);
    }
  };
  const closeDetails = () => {
    setDetailsVisible(false);
    setActiveTab('details'); // Reset to details tab when closing
  };
  
  // Handle press based on props
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      openDetails();
    }
  };

  const SCREEN_H = Dimensions.get('window').height;
  const INITIAL_Y = Math.round(SCREEN_H * 0.35);
  const sheetTranslateY = React.useRef(new Animated.Value(INITIAL_Y)).current;
  const currentOffsetRef = React.useRef(INITIAL_Y);

  const animateTo = (to: number) => {
    currentOffsetRef.current = to;
    Animated.timing(sheetTranslateY, { toValue: to, duration: 180, useNativeDriver: true }).start();
  };

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

  return (
    <Pressable 
      style={[
        styles.card, 
        horizontal ? styles.cardHorizontal : null, 
        compact && styles.cardCompact
      ]} 
      onPress={handlePress}
    >
      {horizontal ? (
        <>
          <Image 
            source={{ uri: productImage }} 
            style={styles.imageSquareSmall} 
            resizeMode="cover"
          />
          <View style={styles.contentRight}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, styles.nameCompact]} numberOfLines={1}>
                {(currentLanguage === 'ta' && (product as any).name_ta) ? (product as any).name_ta : product.name}
              </Text>
              {cardRatingCount > 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                  {Array.from({ length: 5 }, (_, i) => {
                    const rating = cardAvgRating;
                    let icon = 'star-outline' as any;
                    if (i < Math.floor(rating)) icon = 'star';
                    else if (i < rating) icon = 'star-half';
                    return <Ionicons key={i} name={icon} size={12} color="#FFD700" style={{ marginRight: 1 }} />;
                  })}
                  <Text style={{ fontSize: 10, color: '#666', marginLeft: 2 }}>
                    {cardAvgRating.toFixed(1)} ({cardRatingCount})
                  </Text>
                </View>
              ) : null}
            </View>
            {variants.length > 0 && (
              <View style={styles.unitContainer}>
                <TouchableOpacity style={styles.unitSelector} onPress={(e:any)=> { e?.stopPropagation?.(); setUnitOpen(true); }}>
                  <Text style={styles.unitSelectorText}>
                    {selectedVariant ? `Rs. ${selectedVariant.price} / ${selParsed.quantity && selParsed.unit ? `${selParsed.quantity} ${selParsed.unit}` : (selectedVariant.label || '')}` : 'Select unit'}
                  </Text>
                  <Ionicons name={unitOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#4caf50" />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.bottomRow}>
              <View style={styles.qtyPill}>
                <TouchableOpacity onPress={(e:any)=> { e?.stopPropagation?.(); setSelectedQuantity(q => Math.max(1, q - 1)); }}>
                  <Ionicons name="remove" size={16} color="#2d5016" />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{selectedQuantity}</Text>
                <TouchableOpacity onPress={(e:any)=> { e?.stopPropagation?.(); setSelectedQuantity(q => q + 1); }}>
                  <Ionicons name="add" size={16} color="#2d5016" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[
                  styles.fabAdd,
                  compact && styles.fabAddCompact,
                  (variants.length === 0 && product.stock_available <= 0) && styles.addButtonDisabled
                ]}
                onPress={(e:any)=> { e?.stopPropagation?.(); handleAddToCart(); }}
                disabled={(variants.length === 0 && product.stock_available <= 0)}
              >
                <Text style={{color: (variants.length === 0 && product.stock_available <= 0) ? '#999' : '#fff', fontSize: 12, fontWeight: '600'}}>Add to cart</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      ) : (
        // Square layout: image and all content within the same square height
        <View style={styles.square}>
          <Image 
            source={{ uri: productImage }} 
            style={styles.squareImage} 
            resizeMode="cover"
          />
          <View style={styles.overlay}>
            <View style={{ flex: 1 }}>
              <Text style={styles.nameOverlay} numberOfLines={2}>
                {(currentLanguage === 'ta' && (product as any).name_ta) ? (product as any).name_ta : product.name}
              </Text>
              {cardRatingCount > 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                  {Array.from({ length: 5 }, (_, i) => {
                    const rating = cardAvgRating;
                    let icon = 'star-outline' as any;
                    if (i < Math.floor(rating)) icon = 'star';
                    else if (i < rating) icon = 'star-half';
                    return <Ionicons key={i} name={icon} size={12} color="#FFD700" style={{ marginRight: 1 }} />;
                  })}
                  <Text style={{ fontSize: 10, color: '#fff', marginLeft: 2, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0.5, height: 0.5 }, textShadowRadius: 1 }}>
                    {cardAvgRating.toFixed(1)}
                  </Text>
                </View>
              ) : null}
            </View>
            {variants.length > 0 && (
              <TouchableOpacity style={styles.unitSelector} onPress={(e:any)=> { e?.stopPropagation?.(); setUnitOpen(true); }}>
                <Text style={styles.unitSelectorText}>
                  {selectedVariant ? `Rs. ${selectedVariant.price} / ${selParsed.quantity && selParsed.unit ? `${selParsed.quantity} ${selParsed.unit}` : (selectedVariant.label || '')}` : 'Select unit'}
                </Text>
                <Ionicons name={unitOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#4caf50" />
              </TouchableOpacity>
            )}
            <View style={[styles.bottomRow, { marginTop: 6 }]}>
              <View style={[styles.qtyPill, { height: 30, paddingHorizontal: 10, borderRadius: 8, gap: 8, backgroundColor: '#f5f5f5' }]}>
                <TouchableOpacity 
                  onPress={(e:any)=> { e?.stopPropagation?.(); setSelectedQuantity(q => Math.max(1, q - 1)); }}
                  style={{ padding: 4 }}
                >
                  <Ionicons name="remove" size={14} color="#2d5016" />
                </TouchableOpacity>
                <Text style={[styles.qtyText, { fontSize: 14, minWidth: 20, textAlign: 'center' }]}>{selectedQuantity}</Text>
                <TouchableOpacity 
                  onPress={(e:any)=> { e?.stopPropagation?.(); setSelectedQuantity(q => q + 1); }}
                  style={{ padding: 4 }}
                >
                  <Ionicons name="add" size={14} color="#2d5016" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[
                  styles.fabAdd,
                  { 
                    minWidth: 80, 
                    height: 36, 
                    borderRadius: 18,
                    paddingHorizontal: 12,
                    justifyContent: 'center',
                    alignItems: 'center'
                  },
                  (variants.length === 0 && product.stock_available <= 0) && styles.addButtonDisabled,
                ]}
                onPress={(e:any)=> { e?.stopPropagation?.(); handleAddToCart(); }}
                disabled={(variants.length === 0 && product.stock_available <= 0)}
              >
                <Text style={{
                  color: (variants.length === 0 && product.stock_available <= 0) ? '#999' : '#fff', 
                  fontSize: 12, 
                  fontWeight: '600'
                }}>
                  Add to cart
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <Modal 
        visible={unitOpen} 
        transparent 
        animationType="fade" 
        onRequestClose={() => setUnitOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setUnitOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContainer}>
                <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:12, borderBottomWidth:1, borderBottomColor:'#e0e0e0' }}>
                  <Text style={{ fontWeight:'700', color:'#333' }}>Select unit</Text>
                </View>
                <ScrollView>
                  {variants.map(v => {
                    const p = parseVariantLabel(v.label);
                    const qtyUnit = p.quantity && p.unit ? `${p.quantity} ${p.unit}` : String(v.label || '');
                    const isSelected = Number(selectedVariantId) === Number(v.id);
                    return (
                      <TouchableOpacity
                        key={v.id}
                        style={styles.unitItem}
                        onPress={()=> { setSelectedVariantId(Number(v.id)); setUnitOpen(false); }}
                      >
                        <View style={{ flexDirection:'row', alignItems:'center' }}>
                          <Ionicons
                            name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                            size={18}
                            color={isSelected ? '#4caf50' : '#999'}
                            style={{ marginRight: 8 }}
                          />
                          <Text style={styles.unitItemText}>Rs. {v.price} / {qtyUnit}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={detailsVisible}
        animationType="slide"
        transparent
        onRequestClose={closeDetails}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={closeDetails}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Text style={styles.modalTitle} numberOfLines={2}>
                  {(currentLanguage === 'ta' && (product as any).name_ta) ? (product as any).name_ta : product.name}
                </Text>
                <TouchableOpacity onPress={closeDetails} style={{ paddingLeft: 12 }}>
                  <Ionicons name="close" size={22} color="#333" />
                </TouchableOpacity>
              </View>
              {reviews.length > 0 ? (
                <View style={styles.ratingContainer}>
                  {Array.from({ length: 5 }, (_, i) => {
                    const rating = averageRating;
                    let icon = 'star-outline' as any;
                    if (i < Math.floor(rating)) icon = 'star';
                    else if (i < rating) icon = 'star-half';
                    return <Ionicons key={i} name={icon} size={16} color="#FFD700" style={styles.starIcon} />;
                  })}
                  <Text style={styles.ratingText}>
                    {averageRating.toFixed(1)} ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.tabsContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'details' && styles.activeTab]}
                onPress={() => setActiveTab('details')}
              >
                <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>Details</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'reviews' && styles.activeTab]}
                onPress={() => setActiveTab('reviews')}
              >
                <Text style={[styles.tabText, activeTab === 'reviews' && styles.activeTabText]}>Reviews ({reviews.length})</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator
            >
              <View style={styles.contentContainer}>
                {activeTab === 'details' ? (
                  <>
                    <Image source={{ uri: productImage }} style={styles.productImage} resizeMode="cover" />

                    {(product as any).seller_name ? (
                      <Text style={styles.sellerTag}>Seller: {(product as any).seller_name}</Text>
                    ) : null}

                    <Text style={styles.productDescription}>
                      {(currentLanguage === 'ta' && (product as any).details_ta) ? (product as any).details_ta : product.details}
                    </Text>

                    {variants.length > 0 ? (
                      <View style={{ marginTop: 12 }}>
                        <Text style={{ fontWeight: '700', color: '#333', marginBottom: 8 }}>Available units</Text>
                        {variants.map(v => {
                          const p = parseVariantLabel(v.label);
                          const qtyUnit = p.quantity && p.unit ? `${p.quantity} ${p.unit}` : String(v.label || '');
                          const isSelected = Number(selectedVariantId) === Number(v.id);
                          const inStock = Number(v.stock_available ?? 0) > 0;
                          return (
                            <TouchableOpacity
                              key={v.id}
                              style={[styles.unitItem, !inStock && { opacity: 0.5 }]}
                              onPress={() => setSelectedVariantId(Number(v.id))}
                              disabled={!inStock}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons
                                  name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                                  size={18}
                                  color={isSelected ? '#4caf50' : '#999'}
                                  style={{ marginRight: 8 }}
                                />
                                <Text style={styles.unitItemText}>Rs. {v.price} / {qtyUnit}</Text>
                              </View>
                              <Text style={{ color: inStock ? '#4caf50' : '#d32f2f', fontWeight: '600' }}>
                                {inStock ? 'In stock' : 'Out'}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ) : null}
                  </>
                ) : (
                  <View style={styles.reviewsContainer}>
                    {reviewsLoading ? (
                      <View style={styles.loadingContainer}>
                        <Text style={{ color: '#666' }}>Loading reviews…</Text>
                      </View>
                    ) : reviews.length > 0 ? (
                      <View>
                        {reviews.map((review: any) => {
                          const name = String(review.full_name || review.number || 'Customer');
                          const created = review.order_created_at || review.created_at;
                          const rating = Number(review.rating || 0);
                          return (
                            <View key={String(review.id ?? `${name}-${created}`)} style={styles.reviewItem}>
                              <View style={styles.reviewHeader}>
                                <Text style={styles.reviewerName}>{name}</Text>
                                {created ? (
                                  <Text style={styles.reviewDate}>
                                    {new Date(created).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                  </Text>
                                ) : null}
                              </View>
                              <View style={styles.ratingStars}>
                                {Array.from({ length: 5 }, (_, i) => {
                                  const icon = i < rating ? ('star' as any) : ('star-outline' as any);
                                  return <Ionicons key={i} name={icon} size={14} color="#FFD700" style={{ marginRight: 1 }} />;
                                })}
                              </View>
                              {review.review ? <Text style={styles.reviewText}>{String(review.review)}</Text> : null}
                            </View>
                          );
                        })}
                      </View>
                    ) : (
                      <View style={styles.noReviews}>
                        <Ionicons name="chatbubble-ellipses-outline" size={48} color="#e0e0e0" />
                        <Text style={styles.noReviewsTitle}>No Reviews Yet</Text>
                        <Text style={styles.noReviewsText}>Be the first to review this product</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Sticky action bar */}
            <View style={styles.actionBar}>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionPrice} numberOfLines={1}>
                  Rs. {Number(displayPrice).toFixed(0)}{displayLabel ? ` / ${displayLabel}` : ''}
                </Text>
              </View>

              <View style={styles.actionQtyPill}>
                <TouchableOpacity
                  onPress={() => setSelectedQuantity(q => Math.max(1, q - 1))}
                  style={{ padding: 6 }}
                >
                  <Ionicons name="remove" size={16} color="#2d5016" />
                </TouchableOpacity>
                <Text style={styles.actionQtyText}>{selectedQuantity}</Text>
                <TouchableOpacity
                  onPress={() => setSelectedQuantity(q => q + 1)}
                  style={{ padding: 6 }}
                >
                  <Ionicons name="add" size={16} color="#2d5016" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.actionAdd,
                  ((variants.length > 0 && !anyVariantInStock) || (variants.length === 0 && product.stock_available <= 0)) && styles.addButtonDisabled,
                ]}
                onPress={handleAddToCart}
                disabled={
                  (variants.length > 0 && !anyVariantInStock) ||
                  (variants.length === 0 && product.stock_available <= 0)
                }
              >
                <Text
                  style={{
                    color:
                      ((variants.length > 0 && !anyVariantInStock) ||
                        (variants.length === 0 && product.stock_available <= 0))
                        ? '#999'
                        : '#fff',
                    fontSize: 13,
                    fontWeight: '700',
                  }}
                >
                  Add to cart
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Pressable>
    );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
    width: '100%',
    marginHorizontal: 0,
  },
  cardHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingVertical: 12,
    minHeight: 160,
  },
  cardCompact: {
    width: '100%',
    minHeight: 280,
  },
  imageSquareSmall: {
    width: 140,
    height: 140,
    resizeMode: 'cover',
    backgroundColor: '#eef2e6',
    marginRight: 10,
    borderRadius: 14,
  },
  contentRight: {
    flex: 1,
    paddingVertical: 8,
    paddingRight: 8,
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
  nameOverlay: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2d5016',
    marginBottom: 4,
  },
  unitContainer: {
    marginTop: 6,
  },
  unitSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#c8e6c9',
    backgroundColor: '#f1f8f4',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    minHeight: 32,
  },
  unitSelectorText: {
    color: '#2d5016',
    fontWeight: '700',
    fontSize: 13,
  },
  unitItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f3f3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unitItemText: {
    color: '#333',
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  qtyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 8,
    height: 36,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  qtyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2d5016',
  },
  fabAdd: {
    minWidth: 80,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4caf50',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  fabAddCompact: { width: 34, height: 34, borderRadius: 17 },
  addButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  // Square layout
  square: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
  },
  squareImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    backgroundColor: '#eef2e6',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 12,
    justifyContent: 'flex-end',
  },
  // Generic overlay used for both modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  // Unit picker modal container
  modalContainer: {
    width: '92%',
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  // Details modal
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    width: '92%',
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    flexShrink: 1,
  },
  modalHeader: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d5016',
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  starIcon: {
    marginRight: 2,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#4caf50',
  },
  tabText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#4caf50',
    fontWeight: '600',
  },
  scrollView: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: 110, // room for the sticky action bar
  },
  contentContainer: {
    padding: 16,
  },
  productImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#eef2e6',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  actionPrice: {
    color: '#2d5016',
    fontWeight: '800',
    fontSize: 14,
  },
  actionQtyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    height: 36,
  },
  actionQtyText: {
    minWidth: 22,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    color: '#2d5016',
  },
  actionAdd: {
    minWidth: 110,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4caf50',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sellerTag: {
    fontStyle: 'italic',
    color: '#5e7a47',
    fontWeight: '600',
    marginTop: 8,
  },
  productDescription: {
    fontSize: 14,
    color: '#333',
    marginTop: 12,
    lineHeight: 20,
  },
  reviewsContainer: {
    flex: 1,
    marginTop: 8,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  reviewItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewerName: {
    fontWeight: '600',
    fontSize: 16,
    color: '#333',
  },
  ratingStars: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  reviewText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginTop: 4,
  },
  noReviews: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  noReviewsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
    marginBottom: 4,
  },
  noReviewsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});