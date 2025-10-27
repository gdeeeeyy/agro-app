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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../context/CartContext';

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
}

export default function ProductCard({ product, onPress }: ProductCardProps) {
  const { addItem } = useCart();
  const [quantityModalVisible, setQuantityModalVisible] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const handleAddToCart = async () => {
    if (product.stock_available <= 0) {
      Alert.alert('Out of Stock', 'This product is currently out of stock.');
      return;
    }

    setSelectedQuantity(1);
    setQuantityModalVisible(true);
  };

  const handleConfirmAddToCart = async () => {
    if (selectedQuantity <= 0 || selectedQuantity > product.stock_available) {
      Alert.alert('Invalid Quantity', `Please enter a quantity between 1 and ${product.stock_available}`);
      return;
    }

    const success = await addItem(product.id, selectedQuantity);
    if (success) {
      Alert.alert('Success', `${selectedQuantity} item(s) added to cart!`);
      setQuantityModalVisible(false);
    } else {
      Alert.alert('Error', 'Failed to add product to cart.');
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {product.image && (
        <Image source={{ uri: product.image }} style={styles.image} />
      )}
      
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        
        <Text style={styles.plantUsed} numberOfLines={1}>
          Plant: {product.plant_used}
        </Text>
        
        <Text style={styles.details} numberOfLines={3}>
          {product.details}
        </Text>
        
        <View style={styles.footer}>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>₹{product.cost_per_unit}</Text>
            <Text style={styles.stock}>
              {product.stock_available > 0 
                ? `${product.stock_available} in stock` 
                : 'Out of stock'
              }
            </Text>
          </View>
          
          <TouchableOpacity
            style={[
              styles.addButton,
              product.stock_available <= 0 && styles.addButtonDisabled
            ]}
            onPress={handleAddToCart}
            disabled={product.stock_available <= 0}
          >
            <Ionicons 
              name="add" 
              size={20} 
              color={product.stock_available <= 0 ? '#999' : '#fff'} 
            />
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={quantityModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setQuantityModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Quantity</Text>
            <Text style={styles.modalProductName}>{product.name}</Text>
            <Text style={styles.modalStock}>Available: {product.stock_available} units</Text>
            
            <View style={styles.quantityContainer}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setSelectedQuantity(Math.max(1, selectedQuantity - 1))}
              >
                <Ionicons name="remove" size={20} color="#4caf50" />
              </TouchableOpacity>
              
              <TextInput
                style={styles.quantityInput}
                value={selectedQuantity.toString()}
                onChangeText={(text) => {
                  const num = parseInt(text) || 1;
                  setSelectedQuantity(Math.max(1, Math.min(product.stock_available, num)));
                }}
                keyboardType="numeric"
                selectTextOnFocus
              />
              
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setSelectedQuantity(Math.min(product.stock_available, selectedQuantity + 1))}
              >
                <Ionicons name="add" size={20} color="#4caf50" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalTotal}>
              Total: ₹{(selectedQuantity * product.cost_per_unit).toFixed(2)}
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setQuantityModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirmAddToCart}
              >
                <Text style={styles.confirmButtonText}>Add to Cart</Text>
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
  content: {
    padding: 16,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d5016',
    marginBottom: 8,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    flex: 1,
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2d5016',
    marginBottom: 4,
  },
  stock: {
    fontSize: 12,
    color: '#666',
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
