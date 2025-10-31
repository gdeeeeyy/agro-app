import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Image,
  Modal,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { UserContext } from '../../context/UserContext';
import { getAllOrders, getOrderItems, updateOrderStatus, deleteOrder } from '../../lib/database';

interface Order {
  id: number;
  user_id: number;
  full_name: string;
  number: string;
  total_amount: number;
  payment_method: string;
  delivery_address?: string;
  status: string;
  status_note?: string;
  delivery_date?: string;
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
}

const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending', icon: 'time', color: '#ff9800' },
  { value: 'confirmed', label: 'Confirmed', icon: 'checkmark-circle', color: '#2196f3' },
  { value: 'processing', label: 'Processing', icon: 'sync', color: '#9c27b0' },
  { value: 'shipped', label: 'Shipped', icon: 'airplane', color: '#00bcd4' },
  { value: 'delivered', label: 'Delivered', icon: 'checkmark-done-circle', color: '#4caf50' },
  { value: 'cancelled', label: 'Cancelled', icon: 'close-circle', color: '#f44336' },
];

export default function AdminOrders() {
  const { user } = useContext(UserContext);
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [deliveryDate, setDeliveryDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [logisticsName, setLogisticsName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');

  const isAdmin = user?.is_admin === 1;

  const loadOrders = async () => {
    const allOrders = await getAllOrders() as Order[];
    setOrders(allOrders);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const handleUpdateOrder = async (order: Order) => {
    const items = await getOrderItems(order.id) as OrderItem[];
    setOrderItems(items);
    setSelectedOrder(order);
    setNewStatus(order.status);
    setStatusNote(order.status_note || '');
    setDeliveryDate(order.delivery_date ? new Date(order.delivery_date) : null);
    setLogisticsName((order as any).logistics_name || '');
    setTrackingNumber((order as any).tracking_number || '');
    setTrackingUrl((order as any).tracking_url || '');
    setModalVisible(true);
  };

  const handleSaveStatus = async () => {
    if (!selectedOrder || !newStatus) {
      Alert.alert('Error', 'Please select a status');
      return;
    }

    try {
      const deliveryDateStr = deliveryDate ? deliveryDate.toISOString().split('T')[0] : undefined;
      const success = await updateOrderStatus(
        selectedOrder.id,
        newStatus,
        statusNote || undefined,
        deliveryDateStr,
        logisticsName || undefined,
        trackingNumber || undefined,
        trackingUrl || undefined
      );

      if (success) {
        Alert.alert('Success', 'Order status updated successfully');
        setModalVisible(false);
        await loadOrders();
      } else {
        Alert.alert('Error', 'Failed to update order status');
      }
    } catch (error) {
      console.error('Update error:', error);
      Alert.alert('Error', 'Failed to update order status');
    }
  };

  const handleDeleteOrder = (order: Order) => {
    Alert.alert(
      'Delete Order',
      `Are you sure you want to delete Order #${order.id}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await deleteOrder(order.id);
              if (success) {
                Alert.alert('Success', 'Order deleted successfully');
                await loadOrders();
              } else {
                Alert.alert('Error', 'Failed to delete order');
              }
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete order');
            }
          },
        },
      ]
    );
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDeliveryDate(selectedDate);
    }
  };

  const getStatusColor = (status: string) => {
    const statusObj = ORDER_STATUSES.find(s => s.value === status.toLowerCase());
    return statusObj?.color || '#666';
  };

  const renderOrder = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => handleUpdateOrder(item)}
    >
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderId}>Order #{item.id}</Text>
          <Text style={styles.customerName}>{item.full_name}</Text>
          <Text style={styles.customerNumber}>{item.number}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.orderDetailRow}>
          <Ionicons name="cash" size={18} color="#666" />
          <Text style={styles.orderDetailText}>₹{item.total_amount.toFixed(2)}</Text>
        </View>
        <View style={styles.orderDetailRow}>
          <Ionicons name="calendar" size={18} color="#666" />
          <Text style={styles.orderDetailText}>
            {new Date(item.created_at).toLocaleDateString('en-IN')}
          </Text>
        </View>
        {item.delivery_address && (
          <View style={styles.orderDetailRow}>
            <Ionicons name="location" size={18} color="#666" />
            <Text style={styles.orderDetailText} numberOfLines={2}>
              {item.delivery_address}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.updateButton}
          onPress={() => handleUpdateOrder(item)}
        >
          <Ionicons name="create" size={18} color="#4caf50" />
          <Text style={styles.updateButtonText}>Update</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => handleDeleteOrder(item)}
        >
          <Ionicons name="trash" size={18} color="#f44336" />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="receipt-outline" size={80} color="#ccc" />
      <Text style={styles.emptyText}>No orders yet</Text>
      <Text style={styles.emptySubtext}>
        Orders from customers will appear here
      </Text>
    </View>
  );

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Admin Orders</Text>
        </View>
        <View style={styles.accessDenied}>
          <Ionicons name="lock-closed" size={80} color="#ccc" />
          <Text style={styles.accessDeniedText}>Access Denied</Text>
          <Text style={styles.accessDeniedSubtext}>
            You need admin privileges to access this page
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Image source={require('../../assets/images/icon.png')} style={styles.logo} />
          <Text style={styles.headerTitle}>Manage Orders</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Faith of the Farmers - Admin Panel
        </Text>
      </View>

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

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Update Order Status</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedOrder && (
              <>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderInfoTitle}>Order #{selectedOrder.id}</Text>
                  <Text style={styles.orderInfoText}>Customer: {selectedOrder.full_name}</Text>
                  <Text style={styles.orderInfoText}>Phone: {selectedOrder.number}</Text>
                  <Text style={styles.orderInfoText}>Total: ₹{selectedOrder.total_amount.toFixed(2)}</Text>
                  {selectedOrder.delivery_address && (
                    <View style={styles.addressInfo}>
                      <Text style={styles.addressLabel}>Delivery Address:</Text>
                      <Text style={styles.addressText}>{selectedOrder.delivery_address}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Order Items</Text>
                  {orderItems.map((item) => (
                    <View key={item.id} style={styles.itemRow}>
                      <Text style={styles.itemName}>{item.product_name}</Text>
                      <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Update Status</Text>
                  <View style={styles.statusOptions}>
                    {ORDER_STATUSES.map((status) => (
                      <TouchableOpacity
                        key={status.value}
                        style={[
                          styles.statusOption,
                          newStatus === status.value && styles.statusOptionSelected,
                          { borderColor: status.color }
                        ]}
                        onPress={() => setNewStatus(status.value)}
                      >
                        <Ionicons
                          name={status.icon as any}
                          size={24}
                          color={newStatus === status.value ? status.color : '#999'}
                        />
                        <Text
                          style={[
                            styles.statusOptionText,
                            newStatus === status.value && { color: status.color }
                          ]}
                        >
                          {status.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Status Note (Optional)</Text>
                  <TextInput
                    style={styles.textArea}
                    placeholder="Add a note about the order status..."
                    value={statusNote}
                    onChangeText={setStatusNote}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Logistics (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Logistics name (e.g., Delhivery, BlueDart)"
                    value={logisticsName}
                    onChangeText={setLogisticsName}
                  />
                  <TextInput
                    style={[styles.input, { marginTop: 8 }]}
                    placeholder="Tracking number"
                    value={trackingNumber}
                    onChangeText={setTrackingNumber}
                  />
                  <TextInput
                    style={[styles.input, { marginTop: 8 }]}
                    placeholder="Tracking URL (https://...)"
                    autoCapitalize="none"
                    value={trackingUrl}
                    onChangeText={setTrackingUrl}
                  />
                  <Text style={styles.hint}>If URL is provided, users can tap the logistics name in their order details to open it.</Text>
                </View>

              </>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.deleteOrderButton}
              onPress={() => {
                setModalVisible(false);
                if (selectedOrder) {
                  handleDeleteOrder(selectedOrder);
                }
              }}
            >
              <Ionicons name="trash" size={20} color="#fff" />
              <Text style={styles.deleteOrderButtonText}>Delete Order</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveStatus}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  customerNumber: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
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
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  updateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f8f4',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  updateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4caf50',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffebee',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f44336',
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
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  accessDeniedText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  accessDeniedSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
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
  orderInfo: {
    backgroundColor: '#f1f8f4',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  orderInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d5016',
    marginBottom: 8,
  },
  orderInfoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  itemName: {
    fontSize: 14,
    color: '#333',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
    minWidth: '45%',
  },
  statusOptionSelected: {
    backgroundColor: '#f1f8f4',
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  clearDateButton: {
    marginTop: 8,
    padding: 8,
    alignSelf: 'flex-start',
  },
  clearDateText: {
    fontSize: 14,
    color: '#f44336',
    textDecorationLine: 'underline',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  deleteOrderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f44336',
    paddingVertical: 16,
    borderRadius: 12,
  },
  deleteOrderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4caf50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  addressInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4caf50',
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d5016',
    marginBottom: 6,
  },
  addressText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});
