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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserContext } from '../../context/UserContext';
import { useLanguage } from '../../context/LanguageContext';
import { getUserOrders, getOrderItems } from '../../lib/database';

interface Order {
  id: number;
  user_id: number;
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

export default function Orders() {
  const { user } = useContext(UserContext);
  const { t } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);

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
    setSelectedOrder(order);
    setDetailsModalVisible(true);
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
        return '#00bcd4';
      case 'delivered':
        return '#4caf50';
      case 'cancelled':
        return '#f44336';
      default:
        return '#666';
    }
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
        return 'airplane';
      case 'delivered':
        return 'checkmark-done-circle';
      case 'cancelled':
        return 'close-circle';
      default:
        return 'help-circle';
    }
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
            {new Date(item.created_at).toLocaleDateString('ta-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Ionicons name={getStatusIcon(item.status) as any} size={16} color="#fff" />
          <Text style={styles.statusText}>{t(`status.${item.status.toLowerCase()}`)}</Text>
        </View>
      </View>

        <View style={styles.orderDetails}>
          <View style={styles.orderDetailRow}>
            <Ionicons name="cash" size={20} color="#666" />
            <Text style={styles.orderDetailText}>₹{item.total_amount.toFixed(2)}</Text>
          </View>
          <View style={styles.orderDetailRow}>
            <Ionicons name="wallet" size={20} color="#666" />
            <Text style={styles.orderDetailText}>
              {item.payment_method === 'cod' ? t('payment.cod') : item.payment_method.toUpperCase()}
            </Text>
          </View>
          {item.delivery_date && (
            <View style={styles.orderDetailRow}>
              <Ionicons name="calendar" size={20} color="#666" />
              <Text style={styles.orderDetailText}>
                {t('orders.delivery')}: {new Date(item.delivery_date).toLocaleDateString('ta-IN')}
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Image source={require('../../assets/images/icon.png')} style={styles.logo} />
          <Text style={styles.headerTitle}>{t('orders.title')}</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          {t('orders.subtitle')}
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
        visible={detailsModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('orders.orderDetails')}</Text>
            <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
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
                      {new Date(selectedOrder.created_at).toLocaleString('en-IN')}
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
                  {selectedOrder.delivery_date && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Est. Delivery:</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedOrder.delivery_date).toLocaleDateString('en-IN')}
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
                      </View>
                      <Text style={styles.itemPrice}>₹{(item.quantity * item.price_per_unit).toFixed(2)}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.totalSection}>
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <Text style={styles.totalAmount}>₹{selectedOrder.total_amount.toFixed(2)}</Text>
                </View>
              </>
            )}
          </ScrollView>
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
});
