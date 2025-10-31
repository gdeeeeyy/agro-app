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
import AddressModal from '../../components/AddressModal';

interface CartItem {
  id: number;
  user_id: number;
  product_id: number;
  quantity: number;
  name: string;
  image: string;
  cost_per_unit: number;
  stock_available: number;
  created_at: string;
}

export default function Cart() {
  const { user } = useContext(UserContext);
  const { t } = useLanguage();
  const { cartItems, cartTotal, updateQuantity, removeItem, clearAll } = useCart();
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [orderNote, setOrderNote] = useState<string>('');

  const handleQuantityChange = async (productId: number, newQuantity: number) => {
    if (newQuantity < 0) return;
    await updateQuantity(productId, newQuantity);
  };

  const handleRemoveItem = async (productId: number) => {
    Alert.alert(
      t('cart.removeItem'),
      t('cart.removeConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('common.delete'), 
          style: 'destructive',
          onPress: () => removeItem(productId)
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
    // Start with address collection for delivery
    setAddressModalVisible(true);
  };

  const handlePaymentSelect = (method: string) => {
    setSelectedPayment(method);
  };

  const handleAddressConfirmed = (address: string) => {
    setDeliveryAddress(address);
    setAddressModalVisible(false);
    setPaymentModalVisible(true);
  };

  const handleConfirmOrder = async () => {
    if (!selectedPayment) {
      Alert.alert(t('common.error'), t('payment.required'));
      return;
    }

    if (selectedPayment === 'card' || selectedPayment === 'upi') {
      Alert.alert(t('common.info') ?? t('common.success'), t('payment.comingSoon'));
      return;
    }

    // For delivery orders, ensure address is provided
    if (selectedPayment === 'cod' && !deliveryAddress.trim()) {
      setPaymentModalVisible(false);
      setAddressModalVisible(true);
      return;
    }

    try {
      if (!user) {
        Alert.alert(t('common.error'), t('order.loginRequired'));
        return;
      }

      const orderId = await createOrder(user.id, selectedPayment, deliveryAddress, orderNote.trim() || undefined);
      setPaymentModalVisible(false);
      setAddressModalVisible(false);
      setSelectedPayment('');
      setDeliveryAddress('');
      
      Alert.alert(
        t('order.placed'),
        t('order.placedDesc').replace('{orderId}', String(orderId)),
        [{ text: t('common.ok') }]
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
          onPress={() => handleQuantityChange(item.product_id, item.quantity - 1)}
        >
          <Ionicons name="remove" size={16} color="#4caf50" />
        </TouchableOpacity>
        
        <Text style={styles.quantityText}>{item.quantity}</Text>
        
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => handleQuantityChange(item.product_id, item.quantity + 1)}
          disabled={item.quantity >= item.stock_available}
        >
          <Ionicons name="add" size={16} color="#4caf50" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveItem(item.product_id)}
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
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image source={require('../../assets/images/icon.png')} style={styles.logo} />
            <Text style={styles.headerTitle}>{t('cart.title')}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={() => router.push('/(tabs)/orders')}>
              <Ionicons name="receipt" size={26} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
              <Ionicons name="person-circle" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>
          {t('cart.subtitle')}
        </Text>
      </View>

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
              <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <Text style={styles.orderSummary}>{t('payment.orderTotal')}: ₹{cartTotal.toFixed(2)}</Text>
              
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

              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  selectedPayment === 'cod' && styles.paymentOptionSelected
                ]}
                onPress={() => handlePaymentSelect('cod')}
              >
                <View style={styles.paymentOptionContent}>
                  <Ionicons 
                    name="cash" 
                    size={32} 
                    color={selectedPayment === 'cod' ? '#4caf50' : '#666'} 
                  />
                  <View style={styles.paymentOptionText}>
                    <Text style={styles.paymentOptionTitle}>{t('payment.cod')}</Text>
                    <Text style={styles.paymentOptionSubtitle}>{t('payment.codDesc')}</Text>
                  </View>
                </View>
                {selectedPayment === 'cod' && (
                  <Ionicons name="checkmark-circle" size={24} color="#4caf50" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  selectedPayment === 'card' && styles.paymentOptionSelected,
                  styles.paymentOptionDisabled
                ]}
                onPress={() => handlePaymentSelect('card')}
              >
                <View style={styles.paymentOptionContent}>
                  <Ionicons 
                    name="card" 
                    size={32} 
                    color={selectedPayment === 'card' ? '#4caf50' : '#ccc'} 
                  />
                  <View style={styles.paymentOptionText}>
                    <Text style={[styles.paymentOptionTitle, styles.disabledText]}>{t('payment.card')}</Text>
                    <Text style={[styles.paymentOptionSubtitle, styles.disabledText]}>{t('payment.cardDesc')}</Text>
                  </View>
                </View>
                {selectedPayment === 'card' && (
                  <Ionicons name="checkmark-circle" size={24} color="#4caf50" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  selectedPayment === 'upi' && styles.paymentOptionSelected,
                  styles.paymentOptionDisabled
                ]}
                onPress={() => handlePaymentSelect('upi')}
              >
                <View style={styles.paymentOptionContent}>
                  <Ionicons 
                    name="phone-portrait" 
                    size={32} 
                    color={selectedPayment === 'upi' ? '#4caf50' : '#ccc'} 
                  />
                  <View style={styles.paymentOptionText}>
                    <Text style={[styles.paymentOptionTitle, styles.disabledText]}>{t('payment.upi')}</Text>
                    <Text style={[styles.paymentOptionSubtitle, styles.disabledText]}>{t('payment.upiDesc')}</Text>
                  </View>
                </View>
                {selectedPayment === 'upi' && (
                  <Ionicons name="checkmark-circle" size={24} color="#4caf50" />
                )}
              </TouchableOpacity>

              <View style={styles.noteSection}>
                <Text style={styles.addressLabel}>Suggestion/Note (optional)</Text>
                <Text style={styles.helperText}>You can add a note for the admin regarding this order</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Add your suggestion or note..."
                  value={orderNote}
                  onChangeText={setOrderNote}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  !selectedPayment && styles.confirmButtonDisabled
                ]}
                onPress={handleConfirmOrder}
                disabled={!selectedPayment}
              >
                <Text style={styles.confirmButtonText}>{t('payment.confirmOrder')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AddressModal
        visible={addressModalVisible}
        onClose={() => setAddressModalVisible(false)}
        onAddressConfirmed={handleAddressConfirmed}
      />
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4caf50',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 12,
    borderRadius: 8,
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
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  confirmButton: {
    backgroundColor: '#4caf50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#a5d6a7',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
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
});
