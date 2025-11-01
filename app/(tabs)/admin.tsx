import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  TextInput,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { UserContext } from '../../context/UserContext';
import { 
  getAllProducts, 
  addProduct, 
  updateProduct, 
  deleteProduct,
  getAllKeywords,
  addKeyword,
  deleteKeyword
} from '../../lib/database';
import { addSampleProducts } from '../../lib/sampleProducts';
import { createDefaultAdmin, createAdminCustom } from '../../lib/createAdmin';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

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

interface ProductForm {
  name: string;
  name_ta: string;
  plant_used: string;
  plant_used_ta: string;
  keywords: string;
  details: string;
  details_ta: string;
  image?: string;
  stock_available: string;
  cost_per_unit: string;
  unit?: string;
}

interface Keyword {
  id: number;
  name: string;
  created_at: string;
}

export default function AdminDashboard() {
  const { user } = useContext(UserContext);
  const [products, setProducts] = useState<Product[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [keywordModalVisible, setKeywordModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [newKeywordName, setNewKeywordName] = useState('');
  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const [unitPickerOpen, setUnitPickerOpen] = useState(false);
  const [adminNumber, setAdminNumber] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminFullName, setAdminFullName] = useState('');
  const [formData, setFormData] = useState<ProductForm>({
    name: '',
    name_ta: '',
    plant_used: '',
    plant_used_ta: '',
    keywords: '',
    details: '',
    details_ta: '',
    image: '',
    stock_available: '',
    cost_per_unit: '',
    unit: 'units',
  });

  // Check if user is admin
  const isAdmin = user?.is_admin === 1;

  const loadProducts = async () => {
    try {
      const allProducts = await getAllProducts() as Product[];
      setProducts(allProducts);
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const loadKeywords = async () => {
    try {
      const allKeywords = await getAllKeywords() as Keyword[];
      setKeywords(allKeywords);
    } catch (error) {
      console.error('Error loading keywords:', error);
    }
  };

  useEffect(() => {
    loadProducts();
    loadKeywords();
    // Create default admin account if it doesn't exist
    createDefaultAdmin();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      plant_used: '',
      keywords: '',
      details: '',
      image: '',
      stock_available: '',
      cost_per_unit: '',
    });
    setSelectedKeywords([]);
    setEditingProduct(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (product: any) => {
    setFormData({
      name: product.name || '',
      name_ta: (product as any).name_ta || '',
      plant_used: product.plant_used || '',
      plant_used_ta: (product as any).plant_used_ta || '',
      keywords: product.keywords || '',
      details: product.details || '',
      details_ta: (product as any).details_ta || '',
      image: product.image || '',
      stock_available: String(product.stock_available ?? ''),
      cost_per_unit: String(product.cost_per_unit ?? ''),
      unit: (product as any).unit || 'units',
    });
    // Parse existing keywords
    const existingKeywords = product.keywords.split(',').map(k => k.trim()).filter(k => k);
    setSelectedKeywords(existingKeywords);
    setEditingProduct(product);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    resetForm();
  };

const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
mediaTypes: ['images'] as any,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setFormData({ ...formData, image: result.assets[0].uri });
    }
  };

  const toggleKeyword = (keywordName: string) => {
    setSelectedKeywords(prev => {
      if (prev.includes(keywordName)) {
        return prev.filter(k => k !== keywordName);
      } else {
        return [...prev, keywordName];
      }
    });
  };

  const handleAddNewKeyword = async () => {
    if (!newKeywordName.trim()) {
      Alert.alert('Error', 'Please enter a keyword name');
      return;
    }

    try {
      const keywordId = await addKeyword(newKeywordName);
      if (keywordId) {
        Alert.alert('Success', 'Keyword added successfully');
        setNewKeywordName('');
        await loadKeywords();
      } else {
        Alert.alert('Error', 'This keyword already exists or failed to add');
      }
    } catch (error) {
      console.error('Error adding keyword:', error);
      Alert.alert('Error', 'Failed to add keyword');
    }
  };

  const handleDeleteKeyword = (keyword: Keyword) => {
    Alert.alert(
      'Delete Keyword',
      `Are you sure you want to delete "${keyword.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await deleteKeyword(keyword.id);
              if (success) {
                Alert.alert('Success', 'Keyword deleted successfully');
                await loadKeywords();
                // Remove from selected if it was selected
                setSelectedKeywords(prev => prev.filter(k => k !== keyword.name));
              } else {
                Alert.alert('Error', 'Failed to delete keyword');
              }
            } catch (error) {
              console.error('Error deleting keyword:', error);
              Alert.alert('Error', 'Failed to delete keyword');
            }
          }
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.plant_used.trim() || 
        selectedKeywords.length === 0 || !formData.details.trim() ||
        !formData.stock_available.trim() || !formData.cost_per_unit.trim()) {
      Alert.alert('Error', 'Please fill in all required fields and select at least one keyword');
      return;
    }

    const productData: any = {
      name: formData.name.trim(),
      plant_used: formData.plant_used.trim(),
      keywords: selectedKeywords.join(', '),
      details: formData.details.trim(),
      name_ta: formData.name_ta?.trim() || undefined,
      plant_used_ta: formData.plant_used_ta?.trim() || undefined,
      details_ta: formData.details_ta?.trim() || undefined,
      image: formData.image || undefined,
      stock_available: parseInt(formData.stock_available),
      cost_per_unit: parseFloat(formData.cost_per_unit),
      unit: formData.unit?.trim() || undefined,
    };

    try {
      if (editingProduct) {
        const success = await updateProduct(editingProduct.id, productData);
        if (success) {
          Alert.alert('Success', 'Product updated successfully');
          await loadProducts();
          closeModal();
        } else {
          Alert.alert('Error', 'Failed to update product');
        }
      } else {
        const productId = await addProduct(productData);
        if (productId) {
          Alert.alert('Success', 'Product added successfully');
          await loadProducts();
          closeModal();
        } else {
          Alert.alert('Error', 'Failed to add product');
        }
      }
    } catch (error) {
      console.error('Error saving product:', error);
      Alert.alert('Error', 'Failed to save product');
    }
  };

  const handleDelete = (product: Product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await deleteProduct(product.id);
              if (success) {
                Alert.alert('Success', 'Product deleted successfully');
                await loadProducts();
              } else {
                Alert.alert('Error', 'Failed to delete product');
              }
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', 'Failed to delete product');
            }
          }
        },
      ]
    );
  };

  const handleAddSampleProducts = () => {
    Alert.alert(
      'Add Sample Products',
      'This will add sample products to the database for testing purposes.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Add', 
          onPress: async () => {
            try {
              await addSampleProducts();
              Alert.alert('Success', 'Sample products added successfully');
              await loadProducts();
            } catch (error) {
              console.error('Error adding sample products:', error);
              Alert.alert('Error', 'Failed to add sample products');
            }
          }
        },
      ]
    );
  };

  const handleCreateAdmin = () => {
    setAdminNumber('');
    setAdminPassword('');
    setAdminFullName('');
    setAdminModalVisible(true);
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      {item.image && (
        <Image source={{ uri: item.image }} style={styles.productImage} />
      )}
      
      <View style={styles.productDetails}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        {/* Removed Plant: line as requested */}
        <Text style={styles.productPrice}>
          ₹{item.cost_per_unit} • Stock: {item.stock_available}
        </Text>
      </View>

      <View style={styles.productActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="pencil" size={20} color="#4caf50" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash" size={20} color="#f44336" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Image source={require('../../assets/images/icon.png')} style={styles.logo} />
            <Text style={styles.headerTitle}>Agriismart Admin</Text>
          </View>
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
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#4caf50' }} />
      <View style={styles.header}>
        <View style={{ position: 'absolute', top: 8, right: 12, flexDirection: 'row', justifyContent: 'flex-end' }}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} accessibilityLabel="Open Profile">
            <Ionicons name="person-circle" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.headerTop}>
          <Image source={require('../../assets/images/icon.png')} style={styles.logo} />
          <Text style={styles.headerTitle}>Agriismart Admin</Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Add Product</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sampleButton} onPress={handleAddSampleProducts}>
          <Ionicons name="leaf" size={24} color="#fff" />
          <Text style={styles.sampleButtonText}>Add Sample Products</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.adminButtonContainer}>
        <TouchableOpacity style={styles.keywordsButton} onPress={() => setKeywordModalVisible(true)}>
          <Ionicons name="pricetags" size={24} color="#fff" />
          <Text style={styles.keywordsButtonText}>Manage Keywords</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.adminButton} onPress={handleCreateAdmin}>
          <Ionicons name="person-add" size={24} color="#fff" />
          <Text style={styles.adminButtonText}>Create Admin</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingProduct ? 'Edit Product' : 'Add Product'}
            </Text>
            <TouchableOpacity onPress={closeModal}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff' }} />
          <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: 20 }}>
            <TextInput
              style={styles.input}
              placeholder="Product Name (English)"
              placeholderTextColor="#999"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="பொருளின் பெயர் (தமிழ்)"
              placeholderTextColor="#999"
              value={formData.name_ta}
              onChangeText={(text) => setFormData({ ...formData, name_ta: text })}
            />

            {/* Removed Plant Used fields as requested */}

            <View style={styles.keywordSection}>
              <View style={styles.keywordHeader}>
                <Text style={styles.keywordTitle}>Select Keywords *</Text>
                <Text style={styles.keywordCount}>
                  {selectedKeywords.length} selected
                </Text>
              </View>
              
              <View style={styles.keywordGrid}>
                {keywords.map((keyword) => (
                  <TouchableOpacity
                    key={keyword.id}
                    style={[
                      styles.keywordChip,
                      selectedKeywords.includes(keyword.name) && styles.keywordChipSelected
                    ]}
                    onPress={() => toggleKeyword(keyword.name)}
                  >
                    <Text style={[
                      styles.keywordChipText,
                      selectedKeywords.includes(keyword.name) && styles.keywordChipTextSelected
                    ]}>
                      {keyword.name}
                    </Text>
                    {selectedKeywords.includes(keyword.name) && (
                      <Ionicons name="checkmark-circle" size={16} color="#4caf50" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              
              {keywords.length === 0 && (
                <Text style={styles.noKeywordsText}>
                  No keywords available. Use &quot;Manage Keywords&quot; to add some.
                </Text>
              )}
            </View>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Product Details (English)"
              placeholderTextColor="#999"
              value={formData.details}
              onChangeText={(text) => setFormData({ ...formData, details: text })}
              multiline
              numberOfLines={4}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="பொருள் விவரங்கள் (தமிழ்)"
              placeholderTextColor="#999"
              value={formData.details_ta}
              onChangeText={(text) => setFormData({ ...formData, details_ta: text })}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
              <Ionicons name="camera" size={24} color="#4caf50" />
              <Text style={styles.imageButtonText}>
                {formData.image ? 'Change Image' : 'Add Image'}
              </Text>
            </TouchableOpacity>

            {formData.image && (
              <Image source={{ uri: formData.image }} style={styles.previewImage} />
            )}

            <TextInput
              style={styles.input}
              placeholder="Stock Available"
              placeholderTextColor="#999"
              value={formData.stock_available}
              onChangeText={(text) => setFormData({ ...formData, stock_available: text })}
              keyboardType="numeric"
            />

            <TextInput
              style={styles.input}
              placeholder="Cost per Unit"
              placeholderTextColor="#999"
              value={formData.cost_per_unit}
              onChangeText={(text) => setFormData({ ...formData, cost_per_unit: text })}
              keyboardType="numeric"
            />

            <View style={{ marginBottom: 16 }}>
              <Text style={{ marginBottom: 6, color: '#666', fontSize: 14, fontWeight: '600' }}>Unit</Text>
              <TouchableOpacity
                style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                onPress={() => setUnitPickerOpen(prev => !prev)}
              >
                <Text style={{ color: '#333' }}>{formData.unit || 'Select unit'}</Text>
                <Ionicons name="chevron-down" size={18} color="#666" />
              </TouchableOpacity>
              {unitPickerOpen && (
                <View style={{ borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, backgroundColor: '#fff', marginTop: 6, overflow: 'hidden' }}>
                  {['kg','grams','Litres','mL','Nos','Pieces'].map(u => (
                    <TouchableOpacity key={u} onPress={() => { setFormData({ ...formData, unit: u }); setUnitPickerOpen(false); }} style={{ paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
                      <Text style={{ color: '#333' }}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: 10 }} />
          <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#fff' }} />
        </View>
      </Modal>

      <Modal
        visible={keywordModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff' }} />
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Manage Keywords</Text>
            <TouchableOpacity onPress={() => setKeywordModalVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.addKeywordContainer}>
              <TextInput
                style={[styles.input, styles.keywordInput]}
                placeholder="Add new keyword"
                value={newKeywordName}
                onChangeText={setNewKeywordName}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.addKeywordButton}
                onPress={handleAddNewKeyword}
              >
                <Ionicons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={keywords}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View style={styles.keywordItem}>
                  <View style={styles.keywordItemContent}>
                    <Ionicons name="pricetag" size={20} color="#4caf50" />
                    <Text style={styles.keywordItemText}>{item.name}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.keywordItemDelete}
                    onPress={() => handleDeleteKeyword(item)}
                  >
                    <Ionicons name="trash" size={20} color="#f44336" />
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.noKeywordsText}>
                  No keywords yet. Add your first keyword above.
                </Text>
              }
            />
          </View>
          <View style={{ height: 10 }} />
          <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#fff' }} />
        </View>
      </Modal>

      <Modal
        visible={adminModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff' }} />
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Admin</Text>
            <TouchableOpacity onPress={() => setAdminModalVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={adminFullName}
              onChangeText={setAdminFullName}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              value={adminNumber}
              onChangeText={setAdminNumber}
              keyboardType="number-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={adminPassword}
              onChangeText={setAdminPassword}
              secureTextEntry
            />
          </View>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setAdminModalVisible(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={async () => {
                if (!adminNumber || !adminPassword || !adminFullName) {
                  Alert.alert('Error', 'Fill all fields');
                  return;
                }
                const ok = await createAdminCustom(adminNumber, adminPassword, adminFullName);
                if (ok) Alert.alert('Success', 'Admin created');
                else Alert.alert('Error', 'Failed to create admin');
                setAdminModalVisible(false);
              }}
            >
              <Text style={styles.saveButtonText}>Create</Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: 10 }} />
          <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#fff' }} />
        </View>
      </Modal>
      <View style={{ height: 10 }} />
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#f5f5f5' }} />
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
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  addButton: {
    backgroundColor: '#4caf50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  sampleButton: {
    backgroundColor: '#ff9800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
  },
  sampleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  adminButtonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    gap: 12,
  },
  keywordsButton: {
    backgroundColor: '#00bcd4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
  },
  keywordsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  adminButton: {
    backgroundColor: '#9c27b0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
  },
  adminButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  productCard: {
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
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  productDetails: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d5016',
    marginBottom: 4,
  },
  productPlant: {
    fontSize: 14,
    color: '#4caf50',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    color: '#666',
  },
  productActions: {
    flexDirection: 'row',
  },
  editButton: {
    padding: 8,
    marginRight: 8,
  },
  deleteButton: {
    padding: 8,
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
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#4caf50',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    marginBottom: 16,
  },
  imageButtonText: {
    color: '#4caf50',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 16,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4caf50',
    paddingVertical: 16,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  keywordSection: {
    marginBottom: 20,
  },
  keywordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  keywordTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  keywordCount: {
    fontSize: 14,
    color: '#4caf50',
    fontWeight: '600',
  },
  keywordGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  keywordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  keywordChipSelected: {
    backgroundColor: '#f1f8f4',
    borderColor: '#4caf50',
  },
  keywordChipText: {
    fontSize: 14,
    color: '#666',
  },
  keywordChipTextSelected: {
    color: '#4caf50',
    fontWeight: '600',
  },
  noKeywordsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
  addKeywordContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  keywordInput: {
    flex: 1,
    marginBottom: 0,
  },
  addKeywordButton: {
    backgroundColor: '#4caf50',
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keywordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  keywordItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  keywordItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  keywordItemDelete: {
    padding: 8,
  },
});
