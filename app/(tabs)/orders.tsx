import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
  ScrollView,
  Modal,
  Linking,
  Alert,
  TextInput,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { UserContext } from '../../context/UserContext';
import { useLanguage } from '../../context/LanguageContext';
import { getUserOrders, getOrderItems, getOrderStatusHistory, rateOrderItem } from '../../lib/database';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopBar from '../../components/TopBar';

interface Order {
   id: number;
   user_id: number;
   total_amount: number;
   payment_method: string;
   payment_status?: string; // 'unpaid' | 'paid' | null
   booking_address?: string;
   delivery_address?: string;
   status: string;
   status_note?: string;
   delivery_date?: string;
   logistics_name?: string;
   tracking_number?: string;
   tracking_url?: string;
   created_at: string;
   updated_at: string;
 }

interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  price_per_unit: number;
  rating?: number | null;
  review?: string | null;
}

export default function Orders() {
  const { user } = useContext(UserContext);
  const { t } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [statusHistory, setStatusHistory] = useState<Array<{ status: string; note?: string; created_at: string }>>([]);
  const [ratingDraft, setRatingDraft] = useState<Record<number, number>>({});
  const [reviewDraft, setReviewDraft] = useState<Record<number, string>>({});
  const [showRatingEditor, setShowRatingEditor] = useState<number | false>(false);

  const loadOrders = async () => {
    if (!user) return;
    const userOrders = await getUserOrders(user.id) as Order[];
    setOrders(userOrders);
  };

  useEffect(() => {
    loadOrders();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const handleViewDetails = async (order: Order) => {
    const items = await getOrderItems(order.id) as OrderItem[];
    setOrderItems(items);
    // Seed rating/review drafts from existing values
    const ratingMap: Record<number, number> = {};
    const reviewMap: Record<number, string> = {};
    for (const it of items) {
      const r = (it as any).rating;
      const rv = (it as any).review;
      if (r != null) ratingMap[it.id] = Number(r);
      if (rv) reviewMap[it.id] = String(rv);
    }
    setRatingDraft(ratingMap);
    setReviewDraft(reviewMap);
    setSelectedOrder(order);
    setShowRatingEditor(false);
    try { const hist = await getOrderStatusHistory(order.id) as any[]; setStatusHistory(Array.isArray(hist)? hist : []); } catch { setStatusHistory([]); }
    setDetailsModalVisible(true);
  };

  const handleChangeReview = (itemId: number, text: string) => {
    const words = text.split(/\s+/).filter(Boolean);
    const capped = words.length > 100 ? words.slice(0, 100).join(' ') : text;
    setReviewDraft(prev => {
      if (!capped.trim()) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: capped };
    });
  };

  const handleSubmitRatings = async () => {
    if (!selectedOrder || showRatingEditor === false) return;
    const itemId = showRatingEditor;
    const rating = ratingDraft[itemId];
    
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      Alert.alert('Invalid Rating', 'Please select a rating between 1 and 5 stars');
      return;
    }
    
    try {
      const review = reviewDraft[itemId] || '';
      const success = await rateOrderItem(itemId, rating, review);
      
      if (success) {
        Alert.alert('Thank You', 'Your rating has been saved.');
        // Reload order items to reflect latest ratings
        const freshItems = await getOrderItems(selectedOrder.id) as OrderItem[];
        setOrderItems(freshItems);
        
        // Update local state with fresh data
        const ratingMap = { ...ratingDraft };
        const reviewMap = { ...reviewDraft };
        const updatedItem = freshItems.find(item => item.id === itemId);
        
        if (updatedItem) {
          const r = (updatedItem as any).rating;
          const rv = (updatedItem as any).review;
          if (r != null) ratingMap[itemId] = Number(r);
          if (rv) reviewMap[itemId] = String(rv);
          
          setRatingDraft(ratingMap);
          setReviewDraft(reviewMap);
        }
      } else {
        Alert.alert('Error', 'Failed to save your rating. Please try again.');
      }
    } catch (e) {
      console.error('Error submitting rating:', e);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  const formatPayment = (method: string, status?: string) => {
    const m = method.toLowerCase();
    const s = (status || '').toLowerCase();
    const label = m === 'cod' ? 'Cash on Delivery' : 'Credit/Debit Card/Netbanking/UPI';
    const paid = s === 'paid';
    return `${label} • ${paid ? 'Paid' : 'Not Paid'}`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return '#ff9800';
      case 'confirmed':
        return '#2196f3';
      case 'processing':
        return '#9c27b0';
      case 'shipped':
      case 'delivered':
      case 'dispatched':
        return '#00bcd4';
      case 'cancelled':
        return '#f44336';
      default:
        return '#666';
    }
  };

  const copyTracking = async (text: string) => {
    let copied = false;
    try {
      if ((navigator as any)?.clipboard?.writeText) {
        await (navigator as any).clipboard.writeText(text);
        copied = true;
      }
    } catch {}
    if (copied) Alert.alert('Copied', 'Tracking number copied to clipboard');
    else Alert.alert('Tracking number', String(text));
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'time';
      case 'confirmed':
        return 'checkmark-circle';
      case 'processing':
        return 'sync';
      case 'shipped':
      case 'delivered':
      case 'dispatched':
        return 'airplane';
      case 'cancelled':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const getStatusStageIndex = (status: string) => {
    const s = status.toLowerCase();
    if (!s || s === 'pending' || s === 'cancelled') return -1;
    if (s === 'confirmed') return 0;
    if (s === 'processing' || s === 'processed') return 1;
    if (s === 'dispatched' || s === 'shipped' || s === 'delivered') return 2;
    return -1;
  };

  const renderOrder = ({ item }: { item: Order }) => (
    <TouchableOpacity 
      style={styles.orderCard}
      onPress={() => handleViewDetails(item)}
    >
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderId}>{t('orders.orderDetails')} #{item.id}</Text>
          <Text style={styles.orderDate}>
            {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Ionicons name={getStatusIcon(item.status) as any} size={16} color="#fff" />
          <Text style={styles.statusText}>{t(`status.${(['shipped','delivered'].includes(item.status.toLowerCase())?'dispatched':item.status.toLowerCase())}`)}</Text>
        </View>
      </View>

        <View style={styles.orderDetails}>
          <View style={styles.orderDetailRow}>
            <Ionicons name="cash" size={20} color="#666" />
            <Text style={styles.orderDetailText}>₹{item.total_amount.toFixed(2)}</Text>
          </View>
          <View style={styles.orderDetailRow}>
            <Ionicons name="card" size={20} color="#666" />
            <Text style={styles.orderDetailText}>
              {formatPayment(item.payment_method, (item as any).payment_status)}
            </Text>
          </View>
          <View style={styles.orderDetailRow}>
            <Ionicons name="wallet" size={20} color="#666" />
            <Text style={styles.orderDetailText}>
              {item.payment_method === 'cod' ? t('payment.cod') : item.payment_method.toUpperCase()}
            </Text>
          </View>
        {item.booking_address && (
          <View style={styles.orderDetailRow}>
            <Ionicons name="business" size={20} color="#666" />
            <Text style={styles.orderDetailText} numberOfLines={2}>
              Booking: {item.booking_address}
            </Text>
          </View>
        )}
        {item.delivery_address && (
          <View style={styles.orderDetailRow}>
            <Ionicons name="location" size={20} color="#666" />
            <Text style={styles.orderDetailText} numberOfLines={2}>
              {item.delivery_address}
            </Text>
          </View>
        )}
        {item.logistics_name && (
          <View style={styles.orderDetailRow}>
            <Ionicons name="cube" size={20} color="#666" />
            <TouchableOpacity onPress={() => { const raw = item.tracking_url; const url = raw && !/^https?:\/\//i.test(raw) ? `https://${raw}` : raw; if (url) Linking.canOpenURL(url).then(can => { if (can) Linking.openURL(url); }).catch(()=>{}); }}>
              <Text style={[styles.orderDetailText, { color: '#1e88e5', textDecorationLine: item.tracking_url ? 'underline' : 'none' }]} numberOfLines={1}>
                {item.logistics_name}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {item.tracking_number && (
          <View style={[styles.orderDetailRow, { alignItems: 'center' }] }>
            <Ionicons name="barcode" size={20} color="#666" />
            <Text style={[styles.orderDetailText, { flex: 1 }]} numberOfLines={1}>
              {item.tracking_number}
            </Text>
            <TouchableOpacity style={styles.copyButton} onPress={() => copyTracking(String(item.tracking_number))}>
              <Ionicons name="copy" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {item.status_note && (
        <View style={styles.statusNote}>
          <Ionicons name="information-circle" size={16} color="#4caf50" />
          <Text style={styles.statusNoteText}>{item.status_note}</Text>
        </View>
      )}

      <View style={styles.viewDetailsButton}>
        <Text style={styles.viewDetailsText}>{t('orders.viewDetails')}</Text>
        <Ionicons name="chevron-forward" size={20} color="#4caf50" />
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="receipt-outline" size={80} color="#ccc" />
      <Text style={styles.emptyText}>{t('orders.empty')}</Text>
      <Text style={styles.emptySubtext}>
        {t('orders.emptySubtext')}
      </Text>
    </View>
  );

  const { from } = useLocalSearchParams<{ from?: string }>();
  const showBack = from === 'profile';

  return (
    <View style={styles.container}>
      <TopBar title={t('orders.title')} showBack={showBack} onBack={() => router.push('/(tabs)/profile')} />

      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
      <View style={{ height: 10 }} />
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#f5f5f5' }} />

      <Modal
        visible={detailsModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff' }} />
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('orders.orderDetails')}</Text>
            <TouchableOpacity onPress={() => { setDetailsModalVisible(false); setShowRatingEditor(false); }}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
      {selectedOrder && (
              <>
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Order Information</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Order ID:</Text>
                    <Text style={styles.detailValue}>#{selectedOrder.id}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(selectedOrder.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <View style={[styles.statusBadgeSmall, { backgroundColor: getStatusColor(selectedOrder.status) }]}>
                      <Text style={styles.statusTextSmall}>{selectedOrder.status.toUpperCase()}</Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Payment:</Text>
                    <Text style={styles.detailValue}>
                      {selectedOrder.payment_method === 'cod' ? 'Cash on Delivery' : selectedOrder.payment_method.toUpperCase()}
                    </Text>
                  </View>
                  {selectedOrder.booking_address && (
                    <View style={styles.addressDetailSection}>
                      <Text style={styles.detailLabel}>Booking Address:</Text>
                      <Text style={styles.addressDetailText}>
                        {selectedOrder.booking_address}
                      </Text>
                    </View>
                  )}
                  {selectedOrder.delivery_address && (
                    <View style={styles.addressDetailSection}>
                      <Text style={styles.detailLabel}>Delivery Address:</Text>
                      <Text style={styles.addressDetailText}>
                        {selectedOrder.delivery_address}
                      </Text>
                    </View>
                  )}
                  {selectedOrder.status_note && (
                    <View style={styles.noteContainer}>
                      <Ionicons name="information-circle" size={20} color="#4caf50" />
                      <Text style={styles.noteText}>{selectedOrder.status_note}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Order Items</Text>
                  {orderItems.map((item) => (
                    <View key={item.id} style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.product_name}</Text>
                        <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                        {(item as any).rating != null && Number((item as any).rating) > 0 && (
                          <View style={styles.itemRatingRow}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Ionicons
                                key={star}
                                name={Number((item as any).rating) >= star ? 'star' : 'star-outline'}
                                size={14}
                                color="#fbc02d"
                              />
                            ))}
                          </View>
                        )}
                        {(item as any).review ? (
                          <Text style={styles.itemReviewText} numberOfLines={2}>
                            {(item as any).review}
                          </Text>
                        ) : null}
                        {selectedOrder && ['shipped','delivered','dispatched'].includes(selectedOrder.status.toLowerCase()) && (
                          <TouchableOpacity
                            style={styles.editReviewButton}
                            onPress={() => {
                              setRatingDraft(prev => ({
                                ...prev,
                                [item.id]: (item as any).rating || 0
                              }));
                              setReviewDraft(prev => ({
                                ...prev,
                                [item.id]: (item as any).review || ''
                              }));
                              setShowRatingEditor(item.id);
                            }}
                          >
                            <Text style={styles.editReviewText}>
                              {(item as any).rating != null ? 'Edit review' : 'Add review'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text style={styles.itemPrice}>₹{(item.quantity * item.price_per_unit).toFixed(2)}</Text>
                    </View>
                  ))}
                </View>

                {selectedOrder && ['shipped','delivered','dispatched'].includes(selectedOrder.status.toLowerCase()) && showRatingEditor && (
                  <View style={styles.detailSection}>
                    <View style={styles.ratingHeaderRow}>
                      <Text style={styles.detailSectionTitle}>
                        {orderItems.find(item => item.id === showRatingEditor)?.product_name}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setShowRatingEditor(false)}
                      >
                        <Ionicons name="close" size={24} color="#666" />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.ratingItem}>
                      <View style={styles.starRow}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <TouchableOpacity
                            key={star}
                            onPress={() =>
                              setRatingDraft((prev) => ({
                                ...prev,
                                [showRatingEditor]: star,
                              }))
                            }
                          >
                            <Ionicons
                              name={(ratingDraft[showRatingEditor] || 0) >= star ? 'star' : 'star-outline'}
                              size={28}
                              color="#fbc02d"
                              style={{ marginHorizontal: 4 }}
                            />
                          </TouchableOpacity>
                        ))}
                      </View>
                      <TextInput
                        style={[styles.reviewInput, { minHeight: 100, textAlignVertical: 'top' }]}
                        placeholder="Share your experience with this product (optional, up to 100 words)"
                        placeholderTextColor="#999"
                        multiline
                        value={reviewDraft[showRatingEditor] || ''}
                        onChangeText={(text) => handleChangeReview(showRatingEditor, text)}
                      />
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                        <TouchableOpacity
                          style={[styles.submitRatingsButton, { backgroundColor: '#f5f5f5' }]}
                          onPress={() => setShowRatingEditor(false)}
                        >
                          <Text style={[styles.submitRatingsButtonText, { color: '#333' }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.submitRatingsButton, { flex: 1, marginLeft: 10 }]}
                          onPress={() => {
                            handleSubmitRatings();
                            setShowRatingEditor(false);
                          }}
                        >
                          <Text style={styles.submitRatingsButtonText}>
                            {ratingDraft[showRatingEditor] ? 'Update Review' : 'Submit Review'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}

                {Boolean((selectedOrder as any).logistics_name) && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Logistics:</Text>
                    <TouchableOpacity onPress={() => {
                      const raw = (selectedOrder as any).tracking_url as string | undefined;
                      const url = raw && !/^https?:\/\//i.test(raw) ? `https://${raw}` : raw;
                      if (url) Linking.canOpenURL(url).then(can => { if (can) Linking.openURL(url); }).catch(()=>{});
                    }}>
                      <Text style={[styles.detailValue, { color: '#1e88e5', textDecorationLine: 'underline' }]}>
                        {(selectedOrder as any).logistics_name}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                {Boolean((selectedOrder as any).tracking_number) && (
                  <View style={[styles.detailRow, { alignItems: 'center' }] }>
                    <Text style={styles.detailLabel}>Tracking #:</Text>
                    <Text style={[styles.detailValue, { flex: 1 }]} numberOfLines={1}>
                      {(selectedOrder as any).tracking_number}
                    </Text>
                    <TouchableOpacity style={styles.copyButton} onPress={() => copyTracking(String((selectedOrder as any).tracking_number))}>
                      <Ionicons name="copy" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Status Timeline */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Order Status</Text>
                  {selectedOrder && selectedOrder.status.toLowerCase() === 'cancelled' ? (
                    <View style={styles.cancelledContainer}>
                      <Ionicons name="close-circle" size={18} color="#f44336" />
                      <Text style={styles.cancelledText}>Your order has been cancelled</Text>
                    </View>
                  ) : (
                    <View style={styles.timeline}>
                      {(() => {
                        const stageIndex = selectedOrder ? getStatusStageIndex(selectedOrder.status) : -1;
                        return ['confirmed','processed','dispatched'].map((step, idx) => {
                          const isWithinStage = stageIndex >= 0 && idx <= stageIndex;
                          const match = isWithinStage
                            ? statusHistory.find(h => {
                                const s = String(h.status||'').toLowerCase();
                                if (step==='processed') return (s==='processed' || s==='processing');
                                if (step==='dispatched') return (s==='dispatched' || s==='shipped' || s==='delivered');
                                return s===step;
                              })
                            : undefined;
                          const done = isWithinStage && Boolean(match);
                          const dt = done && match ? new Date(match.created_at) : null;
                          const display = dt
                            ? dt.toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'numeric', minute:'2-digit' })
                            : 'Pending';
                          return (
                            <View key={step} style={styles.timelineRow}>
                              <View style={styles.timelineColIcon}>
                                <View style={[styles.timelineDot, done ? styles.timelineDotDone : styles.timelineDotPending]} />
                                {idx < 2 && (
                                  <View style={[styles.timelineLine, done ? styles.timelineLineDone : styles.timelineLinePending]} />
                                )}
                              </View>
                              <View style={styles.timelineColText}>
                                <Text style={[styles.timelineTitle, done ? styles.timelineTitleDone : styles.timelineTitlePending]}>
                                  {step[0].toUpperCase()+step.slice(1)}
                                </Text>
                                <Text style={styles.timelineMeta}>{display}</Text>
                                {(() => {
                                  if (!done || !match?.note) return null;
                                  const raw = String(match.note);
                                  const lower = raw.toLowerCase();
                                  // Hide sensitive payment/transaction ids from status timeline
                                  if (lower.includes('transaction id') || lower.includes('txn id') || lower.includes('transaction:')) {
                                    return null;
                                  }
                                  return <Text style={styles.timelineNote}>{raw}</Text>;
                                })()}
                              </View>
                            </View>
                          );
                        });
                      })()}
                    </View>
                  )}
                </View>

                <View style={styles.totalSection}>
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <Text style={styles.totalAmount}>₹{selectedOrder.total_amount.toFixed(2)}</Text>
                </View>
              </>
            )}
          </ScrollView>
          <View style={{ height: 10 }} />
          <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#fff' }} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  topRight: {
    position: 'absolute',
    top: 8,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4caf50',
    position: 'relative',
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  logo: {
    width: 36,
    height: 36,
    marginRight: 12,
    borderRadius: 8,
    transform: [{ scale: 1.2 }],
    overflow: 'hidden',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#e8f5e9',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d5016',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  orderDetails: {
    gap: 8,
  },
  orderDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderDetailText: {
    fontSize: 14,
    color: '#333',
  },
  statusNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f1f8f4',
    borderRadius: 8,
  },
  statusNoteText: {
    flex: 1,
    fontSize: 14,
    color: '#2d5016',
    lineHeight: 20,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4caf50',
    marginRight: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d5016',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  copyButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#4caf50',
  },
  statusBadgeSmall: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusTextSmall: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f1f8f4',
    borderRadius: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    color: '#2d5016',
    lineHeight: 20,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4caf50',
  },
  itemRatingRow: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 2,
  },
  itemReviewText: {
    marginTop: 2,
    fontSize: 12,
    color: '#555',
  },
  editReviewButton: {
    marginTop: 4,
  },
  editReviewText: {
    fontSize: 12,
    color: '#4caf50',
    fontWeight: '600',
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f1f8f4',
    borderRadius: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4caf50',
  },
  addressDetailSection: {
    marginTop: 8,
    marginBottom: 12,
  },
  addressDetailText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginTop: 4,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4caf50',
  },
  timeline: {
    marginTop: 4,
    paddingLeft: 4,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  timelineColIcon: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginBottom: 4,
    borderWidth: 2,
    borderColor: '#4caf50',
    backgroundColor: 'transparent',
  },
  timelineDotDone: { backgroundColor: '#4caf50', borderWidth: 0 },
  timelineDotPending: { backgroundColor: 'transparent' },
  timelineLine: {
    width: 2,
    flexGrow: 1,
    marginTop: 4,
  },
  timelineLineDone: { backgroundColor: '#4caf50' },
  timelineLinePending: { backgroundColor: '#4caf50' },
  timelineColText: {
    flex: 1,
    paddingLeft: 8,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  timelineTitleDone: { color: '#2d5016' },
  timelineTitlePending: { color: '#2d5016' },
  timelineMeta: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  timelineNote: {
    fontSize: 12,
    color: '#2d5016',
    marginTop: 2,
  },
  timelineHorizontal: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timelineStep: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  ratingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ratingItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  ratingItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  starRow: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 4,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 8,
    minHeight: 60,
    textAlignVertical: 'top',
    fontSize: 14,
    backgroundColor: '#fafafa',
  },
  submitRatingsButton: {
    marginTop: 12,
    alignSelf: 'flex-end',
    backgroundColor: '#4caf50',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  submitRatingsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  ratingToggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  ratingToggleButtonText: {
    color: '#4caf50',
    fontSize: 12,
    fontWeight: '600',
  },
  cancelledContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fdecea',
  },
  cancelledText: {
    marginLeft: 8,
    color: '#c62828',
    fontSize: 14,
    fontWeight: '600',
  },
});
