import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { UserContext } from '../../context/UserContext';
import { useLanguage } from '../../context/LanguageContext';
import { useCart } from '../../context/CartContext';
import { createOrder } from '../../lib/database';
import { api } from '../../lib/api';
import CheckoutAddressesModal from '../../components/CheckoutAddressesModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';
import { Linking } from 'react-native';

interface CartItem {
  id: number;
  user_id: number;
  product_id: number;
  quantity: number;
  name: string;
  image: string;
  cost_per_unit: number;
  variant_id?: number | null;
  variant_label?: string | null;
  created_at: string;
}

export default function Cart() {
  const { user } = useContext(UserContext);
  const { t } = useLanguage();
  const { cartItems, cartTotal, updateQuantity, removeItem, clearAll, refreshCart } = useCart();
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<string>(''); // 'cod' or 'online'
  const [bookingAddress, setBookingAddress] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [orderNote, setOrderNote] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [paymentStatusModalVisible, setPaymentStatusModalVisible] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'checking' | 'paid' | 'failed' | 'cancelled'>('checking');
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);

  const startPaymentStatusPolling = (orderId: number) => {
    let attempts = 0;
    const maxAttempts = 40; // ~2 minutes
    const pollInterval = 3000;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setPaymentStatus('cancelled');
        return;
      }
      attempts += 1;
      try {
        // Prefer single-order endpoint if available
        if (orderId) {
          try {
            const order = await api.get(`/order/${orderId}` as any) as any;
            if (order && order.payment_status === 'paid') {
              setPaymentStatus('paid');
              await refreshCart();
              return;
            }
            if (order && order.payment_status === 'failed') {
              setPaymentStatus('failed');
              return;
            }
          } catch {
            // ignore and fall back to list endpoint
          }
        }

        if (user) {
          const orders = await api.get(`/orders?userId=${user.id}`) as any[];
          const match = Array.isArray(orders)
            ? orders.find(o => Number(o.id) === Number(orderId))
            : null;

          if (match && match.payment_status === 'paid') {
            setPaymentStatus('paid');
            await refreshCart();
            return;
          }
          if (match && match.payment_status === 'failed') {
            setPaymentStatus('failed');
            return;
          }
        }
      } catch {
        // swallow error and keep polling
      }
      setTimeout(poll, pollInterval);
    };

    poll();
  };

  const handlePaymentStatusClose = () => {
    setPaymentStatusModalVisible(false);
    if (paymentStatus === 'paid') {
      router.push('/(tabs)/orders');
    } else {
      router.push('/(tabs)/cart');
    }
  };

  const handleQuantityChange = async (productId: number, newQuantity: number, variantId?: number | null) => {
    if (newQuantity < 0) return;
    await updateQuantity(productId, newQuantity, variantId ?? undefined);
  };

  const handleRemoveItem = async (productId: number, variantId?: number | null) => {
    Alert.alert(
      t('cart.removeItem'),
      t('cart.removeConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => removeItem(productId, variantId ?? undefined),
        },
      ]
    );
  };

  const handleClearCart = () => {
    Alert.alert(
      t('cart.clearCart'),
      t('cart.clearConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('cart.clearCart'), 
          style: 'destructive',
          onPress: () => clearAll()
        },
      ]
    );
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      Alert.alert(t('cart.empty'), t('cart.emptySubtext'));
      return;
    }
    // Collect both booking + delivery addresses (required) before payment selection
    setAddressModalVisible(true);
  };

  const handlePaymentSelect = (method: string) => {
    setSelectedPayment(method);
  };

  const handleAddressesConfirmed = (booking: string, delivery: string) => {
    setBookingAddress(booking);
    setDeliveryAddress(delivery);
    setAddressModalVisible(false);
    setPaymentModalVisible(true);
  };

  const handleConfirmOrder = async () => {
    if (!selectedPayment) {
      Alert.alert(t('common.error'), t('payment.required'));
      return;
    }

    const ensureAddresses = () => {
      if (!bookingAddress.trim() || !deliveryAddress.trim()) {
        setPaymentModalVisible(false);
        setAddressModalVisible(true);
        return false;
      }
      return true;
    };

    // Online Razorpay flow (Razorpay Payment Link)
    if (selectedPayment === 'online') {
      try {
        if (!user) {
          Alert.alert(t('common.error'), t('order.loginRequired'));
          return;
        }
        if (!ensureAddresses()) return;

        setLoading(true);
        const resp = await api.post('/payments/razorpay/link', {
          userId: user.id,
          bookingAddress,
          deliveryAddress,
          note: orderNote.trim() || undefined,
        });
        setLoading(false);

        const { payment_link_url, orderId } = resp as any;

        setPaymentModalVisible(false);
        setAddressModalVisible(false);
        setSelectedPayment('');
        setBookingAddress('');
        setDeliveryAddress('');
        setOrderNote('');

        // Open Razorpay payment page in browser right away
        if (payment_link_url) {
          Linking.openURL(payment_link_url).catch(() => {});
        }

        // Start waiting for backend to confirm payment
        setCreatedOrderId(orderId || null);
        setPaymentStatus('checking');
        setPaymentStatusModalVisible(true);
        startPaymentStatusPolling(orderId);
        return;
      } catch (error) {
        console.error('Razorpay link error:', error);
        setLoading(false);
        Alert.alert(t('common.error'), 'Unable to start Razorpay payment. Please try again.');
        return;
      }
    }

    // no separate 'card' paymentMethod; all gateways handled via 'online'

    // For COD orders, ensure both addresses are provided
    if (selectedPayment === 'cod' && !ensureAddresses()) {
      return;
    }

    try {
      if (!user) {
        Alert.alert(t('common.error'), t('order.loginRequired'));
        return;
      }

      const orderId = await createOrder(
        user.id,
        selectedPayment,
        bookingAddress,
        deliveryAddress,
        orderNote.trim() || undefined,
      );

      // Clear and refresh cart after successful order (server clears DB cart)
      await refreshCart();

      setPaymentModalVisible(false);
      setAddressModalVisible(false);
      setSelectedPayment('');
      setBookingAddress('');
      setDeliveryAddress('');
      setOrderNote('');
      
      Alert.alert(
        t('order.placed'),
        t('order.placedDesc').replace('{orderId}', String(orderId)),
        [{ text: t('common.ok'), onPress: () => router.push('/(tabs)/orders') }]
      );
    } catch (error) {
      console.error('Order creation error:', error);
      Alert.alert(t('common.error'), t('order.error'));
    }
  };

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      {item.image && (
        <Image source={{ uri: item.image }} style={styles.itemImage} />
      )}
      
      <View style={styles.itemDetails}>
<Text style={styles.itemName} numberOfLines={2}>
          {item.name}
        </Text>
        {item.variant_label ? (
          <Text style={{ color:'#4e7c35', fontSize: 12, fontWeight: '600', marginBottom: 2 }}>
            {item.variant_label}
          </Text>
        ) : null}
        <Text style={styles.itemPrice}>
          ₹{item.cost_per_unit} each
        </Text>
        <Text style={styles.itemTotal}>
          Total: ₹{(item.quantity * item.cost_per_unit).toFixed(2)}
        </Text>
      </View>

      <View style={styles.quantityContainer}>
        <TouchableOpacity
          style={styles.quantityButton}
onPress={() => handleQuantityChange(item.product_id, item.quantity - 1, item.variant_id ?? undefined)}
        >
          <Ionicons name="remove" size={16} color="#4caf50" />
        </TouchableOpacity>
        
        <Text style={styles.quantityText}>{item.quantity}</Text>
        
        <TouchableOpacity
          style={styles.quantityButton}
onPress={() => handleQuantityChange(item.product_id, item.quantity + 1, item.variant_id ?? undefined)}
        >
          <Ionicons name="add" size={16} color="#4caf50" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.removeButton}
onPress={() => handleRemoveItem(item.product_id, item.variant_id ?? undefined)}
      >
        <Ionicons name="trash-outline" size={20} color="#f44336" />
      </TouchableOpacity>
    </View>
  );

  const renderEmptyCart = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cart-outline" size={80} color="#ccc" />
      <Text style={styles.emptyText}>{t('cart.empty')}</Text>
      <Text style={styles.emptySubtext}>
        {t('cart.emptySubtext')}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <AppHeader />

      {cartItems.length === 0 ? (
        renderEmptyCart()
      ) : (
        <>
          <FlatList
            data={cartItems}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />

          <View style={styles.footer}>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>{t('cart.total')}:</Text>
              <Text style={styles.totalAmount}>₹{cartTotal.toFixed(2)}</Text>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClearCart}
              >
                <Text style={styles.clearButtonText}>{t('cart.clearCart')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkoutButton}
                onPress={handleCheckout}
              >
                <Text style={styles.checkoutButtonText}>{t('cart.checkout')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      <Modal
        visible={paymentModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('payment.title')}</Text>
            </View>

            <View style={styles.zomatoLikeHeader}>
              <View>
                <Text style={styles.zomatoSavingText}>{t('cart.total')}: ₹{cartTotal.toFixed(2)}</Text>
                {selectedPayment ? (
                  <Text style={styles.zomatoPayUsingLabel}>
                    Pay using {selectedPayment === 'online' ? 'UPI / Card (Razorpay)' : t('payment.cod')}
                  </Text>
                ) : (
                  <Text style={styles.zomatoPayUsingLabel}>{t('payment.required')}</Text>
                )}
              </View>
            </View>

            <ScrollView style={styles.modalContent}>
              {bookingAddress && (
                <View style={styles.addressSection}>
                  <Text style={styles.addressLabel}>Booking Address</Text>
                  <Text style={styles.addressText}>{bookingAddress}</Text>
                  <TouchableOpacity
                    style={styles.changeAddressButton}
                    onPress={() => {
                      setPaymentModalVisible(false);
                      setAddressModalVisible(true);
                    }}
                  >
                    <Text style={styles.changeAddressText}>{t('address.changeAddress')}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {deliveryAddress && (
                <View style={styles.addressSection}>
                  <Text style={styles.addressLabel}>{t('address.deliveryAddress')}</Text>
                  <Text style={styles.addressText}>{deliveryAddress}</Text>
                  <TouchableOpacity
                    style={styles.changeAddressButton}
                    onPress={() => {
                      setPaymentModalVisible(false);
                      setAddressModalVisible(true);
                    }}
                  >
                    <Text style={styles.changeAddressText}>{t('address.changeAddress')}</Text>
                  </TouchableOpacity>
                </View>
              )}

              <Text style={[styles.orderSummary, { marginTop: 4 }]}>{t('payment.orderTotal')}: ₹{cartTotal.toFixed(2)}</Text>

              {/* Single online payment option via Razorpay */}
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  selectedPayment === 'online' && styles.paymentOptionSelected
                ]}
                onPress={() => handlePaymentSelect('online')}
              >
                <View style={styles.paymentOptionContent}>
                  <Ionicons 
                    name="card" 
                    size={32} 
                    color={selectedPayment === 'online' ? '#4caf50' : '#666'} 
                  />
                  <View style={styles.paymentOptionText}>
                    <Text style={styles.paymentOptionTitle}>UPI / Card Payment</Text>
                    <Text style={styles.paymentOptionSubtitle}>Pay securely via Razorpay (UPI or cards)</Text>
                  </View>
                </View>
                {selectedPayment === 'online' && (
                  <Ionicons name="checkmark-circle" size={24} color="#4caf50" />
                )}
              </TouchableOpacity>

              <View style={styles.noteSection}>
                <Text style={styles.addressLabel}>Suggestion/Note (optional)</Text>
                <Text style={styles.helperText}>You can add a note for the admin regarding this order</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Add your suggestion or note..."
                  placeholderTextColor="#999"
                  value={orderNote}
                  onChangeText={setOrderNote}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <View style={styles.payUsingRow}>
                <Text style={styles.payUsingLabel}>PAY USING</Text>
                <Text style={styles.payUsingMethod}>
                  {selectedPayment === 'online'
                    ? 'Razorpay UPI / Card'
                    : selectedPayment === 'cod'
                    ? t('payment.cod')
                    : t('payment.required')}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  !selectedPayment && styles.confirmButtonDisabled
                ]}
                onPress={handleConfirmOrder}
                disabled={!selectedPayment}
              >
                <Text style={styles.confirmButtonAmount}>₹{cartTotal.toFixed(2)}</Text>
                <Text style={styles.confirmButtonText}>Place Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CheckoutAddressesModal
        visible={addressModalVisible}
        bookingAddress={bookingAddress}
        deliveryAddress={deliveryAddress}
        onClose={() => setAddressModalVisible(false)}
        onConfirm={handleAddressesConfirmed}
      />

      {/* Creating payment loading overlay */}
      <Modal visible={loading} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', minWidth: 220 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 8 }}>Preparing payment…</Text>
            <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
              Please wait while we create a secure Razorpay link.
            </Text>
          </View>
        </View>
      </Modal>

      {/* Payment status overlay while waiting for Razorpay callback */}
      <Modal visible={paymentStatusModalVisible} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', minWidth: 260 }}>
            {paymentStatus === 'checking' && (
              <>
                <Ionicons name="time-outline" size={64} color="#ff9800" />
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#333', marginTop: 16, textAlign: 'center' }}>
                  Waiting for payment…
                </Text>
                <Text style={{ fontSize: 14, color: '#666', marginTop: 8, textAlign: 'center' }}>
                  Complete the payment in your browser, then return here.
                </Text>
              </>
            )}
            {paymentStatus === 'paid' && (
              <>
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#4caf50', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="checkmark" size={48} color="#fff" />
                </View>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#4caf50', marginTop: 16, textAlign: 'center' }}>
                  Payment Successful!
                </Text>
                <Text style={{ fontSize: 14, color: '#666', marginTop: 8, textAlign: 'center' }}>
                  Your order is confirmed and your cart has been cleared.
                </Text>
                <TouchableOpacity
                  style={{ marginTop: 20, backgroundColor: '#4caf50', paddingHorizontal: 28, paddingVertical: 10, borderRadius: 8 }}
                  onPress={handlePaymentStatusClose}
                >
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Go to Orders</Text>
                </TouchableOpacity>
              </>
            )}
            {(paymentStatus === 'failed' || paymentStatus === 'cancelled') && (
              <>
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#f44336', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="close" size={48} color="#fff" />
                </View>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#f44336', marginTop: 16, textAlign: 'center' }}>
                  {paymentStatus === 'cancelled' ? 'Payment Cancelled' : 'Payment Failed'}
                </Text>
                <Text style={{ fontSize: 14, color: '#666', marginTop: 8, textAlign: 'center' }}>
                  {paymentStatus === 'cancelled'
                    ? 'Payment was not completed.'
                    : 'Something went wrong. Please try again.'}
                </Text>
                <TouchableOpacity
                  style={{ marginTop: 20, backgroundColor: '#f44336', paddingHorizontal: 28, paddingVertical: 10, borderRadius: 8 }}
                  onPress={handlePaymentStatusClose}
                >
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Back to Cart</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      <View style={{ height: 10 }} />
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#f5f5f5' }} />
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
    paddingBottom: 20,
  },
  cartItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d5016',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4caf50',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: 'center',
  },
  removeButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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
  },
  footer: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4caf50',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#f44336',
    paddingVertical: 16,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  checkoutButton: {
    flex: 2,
    backgroundColor: '#4caf50',
    paddingVertical: 16,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
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
  zomatoLikeHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff9e6',
    borderBottomWidth: 1,
    borderBottomColor: '#ffe0b2',
  },
  zomatoSavingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e65100',
  },
  zomatoPayUsingLabel: {
    marginTop: 2,
    fontSize: 12,
    color: '#555',
  },
  modalContent: {
    padding: 20,
  },
  orderSummary: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4caf50',
    marginBottom: 20,
    textAlign: 'center',
  },
  paymentOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paymentOptionSelected: {
    borderColor: '#4caf50',
    backgroundColor: '#f1f8f4',
  },
  paymentOptionDisabled: {
    opacity: 0.6,
  },
  paymentOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentOptionText: {
    marginLeft: 16,
  },
  paymentOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  paymentOptionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  disabledText: {
    color: '#999',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  payUsingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  payUsingLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#777',
    textTransform: 'uppercase',
  },
  payUsingMethod: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  confirmButton: {
    marginTop: 4,
    backgroundColor: '#e53935',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  confirmButtonDisabled: {
    backgroundColor: '#ffcdd2',
  },
  confirmButtonAmount: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  addressSection: {
    backgroundColor: '#f1f8f4',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d5016',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  changeAddressButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#4caf50',
    borderRadius: 6,
  },
  changeAddressText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  noteSection: {
    marginTop: 16,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
