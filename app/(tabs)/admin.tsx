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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage } from '../../lib/upload';
import { UserContext } from '../../context/UserContext';
import {
  getAllProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getAllKeywords,
  addKeyword,
  deleteKeyword,
  listUsersBasic,
  getProductReviews,
} from '../../lib/database';
import { addSampleProducts } from '../../lib/sampleProducts';
import { createAdminCustom } from '../../lib/createAdmin';
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
  avg_rating?: number;
  rating_count?: number;
}

interface ProductForm {
  seller_name: string;
  name: string;
  name_ta: string;
  details: string;
  details_ta: string;
  image?: string;
  stock_available: string; // quantity (fallback when no variants)
  cost_per_unit: string; // price (fallback when no variants)
  unit?: string; // optional display unit (fallback)
  pack_size?: string; // deprecated in favor of variants
  pack_unit?: string; // deprecated in favor of variants
  plant_used?: string; // required by server; default to name
}

interface Keyword {
  id: number;
  name: string;
  created_at: string;
}

export default function AdminDashboard() {
  const { user } = useContext(UserContext);
  const isAdmin = (user?.is_admin ?? 0) >= 1;
  const isMaster = (user?.is_admin ?? 0) === 2;
  const isVendor = (user?.is_admin ?? 0) === 1;

  const [products, setProducts] = useState<Product[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  // Vendor users (role = Vendor in User Manager) used for the Seller dropdown
  const [vendorUsers, setVendorUsers] = useState<any[]>([]);
  const [vendorOpen, setVendorOpen] = useState(false);
  const [variantMap, setVariantMap] = useState<Record<number, any[]>>({});
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
    seller_name: '',
    name: '',
    name_ta: '',
    details: '',
    details_ta: '',
    image: '',
    stock_available: '',
    cost_per_unit: '',
    unit: '',
    pack_size: '',
    pack_unit: 'gms',
  });

  // (moved isAdmin/isMaster/isVendor declarations up near UserContext)

  // Variants manage state
  const [variantsVisible, setVariantsVisible] = useState(false);
  const [variantsProductId, setVariantsProductId] = useState<number | null>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [newVarQty, setNewVarQty] = useState('');
  const [newVarUnit, setNewVarUnit] = useState('g');
  const [newVarPrice, setNewVarPrice] = useState('');
  const [newVarStock, setNewVarStock] = useState('');
  const unitsList = ['g','kg','mL','Litres','Nos','Pieces'];
  const [keywordsDropdownOpen, setKeywordsDropdownOpen] = useState(false);
  // Draft variants when adding a new product
  const [draftVariants, setDraftVariants] = useState<{ label: string; price: number; stock_available: number; }[]>([]);
  const [reviewsModalVisible, setReviewsModalVisible] = useState(false);
  const [reviewsProduct, setReviewsProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsFilter, setReviewsFilter] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);

  const loadProducts = async () => {
    try {
      const db = await import('../../lib/database');
      const allProducts = await db.getAllProductsAdmin() as Product[];
      setProducts(allProducts);
      // Prefetch variants for master view (to show stock per variant)
      try {
        const entries = await Promise.all(allProducts.map(async (p:any) => {
          try { const vs = await db.getProductVariants(Number(p.id)); return [Number(p.id), vs as any[]] as const; }
          catch { return [Number(p.id), []] as const; }
        }));
        const vm: Record<number, any[]> = {};
        entries.forEach(([pid, vs]) => { vm[pid] = vs; });
        setVariantMap(vm);
      } catch {}
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

  // Load Vendor-role users (is_admin = 1) for the Seller dropdown
  const loadVendorUsers = async () => {
    try {
      const rows = await listUsersBasic() as any[];
      const onlyVendors = (rows || []).filter(u => Number(u.is_admin) === 1);
      setVendorUsers(onlyVendors);
    } catch {
      setVendorUsers([]);
    }
  };

  const [pendingProducts, setPendingProducts] = useState<any[]>([]);
  const loadPending = async () => {
    try {
      const db = await import('../../lib/database');
      const rows = await db.getPendingProducts();
      setPendingProducts(rows as any[]);
    } catch {
      setPendingProducts([]);
    }
  };

  useEffect(() => {
    loadProducts();
    loadKeywords();
    loadVendorUsers();
    loadPending();
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
    setDraftVariants([]);
    setNewVarQty(''); setNewVarUnit('g'); setNewVarPrice(''); setNewVarStock('');
    // Refresh vendor users so the latest Vendor roles appear in the dropdown
    loadVendorUsers();
    setModalVisible(true);
  };

  const openEditModal = (product: any) => {
    // Ensure vendor users list is up to date when editing
    loadVendorUsers();
    setFormData({
      seller_name: (product as any).seller_name || '',
      name: product.name || '',
      name_ta: (product as any).name_ta || '',
      details: product.details || '',
      details_ta: (product as any).details_ta || '',
      image: product.image || '',
      stock_available: String(product.stock_available ?? ''),
      cost_per_unit: String(product.cost_per_unit ?? ''),
      unit: (product as any).unit || '',
      pack_size: '',
      pack_unit: 'gms',
      plant_used: (product as any).plant_used || product.name || '',
    });
    // Parse existing keywords
    const existingKeywords = product.keywords.split(',').map(k => k.trim()).filter(k => k);
    setSelectedKeywords(existingKeywords);
    setEditingProduct(product);
    setModalVisible(true);
    // Load variants into editor
    (async () => {
      setVariantsProductId(Number(product.id));
      try {
        const list = await (await import('../../lib/database')).getProductVariants(Number(product.id));
        setVariants(list as any[]);
      } catch {}
    })();
  };

  const closeModal = () => {
    setModalVisible(false);
    resetForm();
  };

const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      // SDK 52+: use literal MediaType strings instead of MediaTypeOptions enum
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (!result.canceled) {
      try {
        const up = await uploadImage(result.assets[0].uri);
        setFormData({ ...formData, image: up.url });
      } catch (e: any) {
        Alert.alert('Upload failed', String(e?.message || e));
      }
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
    if (!formData.name.trim() || !formData.details.trim()) {
      Alert.alert('Error', 'Please fill in product name and description');
      return;
    }
    if (!editingProduct && draftVariants.length === 0) {
      Alert.alert('Error', 'Add at least one variant');
      return;
    }
    if (!formData.image) {
      Alert.alert('Error', 'Please add an image for the product');
      return;
    }

    const productData: any = {
      name: formData.name?.trim() || '',
      plant_used: (formData.plant_used?.trim() || formData.name?.trim() || 'NA'),
      keywords: selectedKeywords.join(', '),
      details: formData.details?.trim() || '',
      name_ta: formData.name_ta?.trim() || undefined,
      details_ta: formData.details_ta?.trim() || undefined,
      image: formData.image || undefined,
      seller_name: formData.seller_name?.trim() || undefined,
      // Required by server schema (NOT NULL); will be corrected after variants are added
      stock_available: 0,
      cost_per_unit: 0,
      // Let backend auto-approve products created by master admin (is_admin=2)
      created_by: user?.id ?? undefined,
      creator_role: user?.is_admin ?? 0,
    };

    try {
      if (editingProduct) {
        const success = await updateProduct(editingProduct.id, productData);
        if (success) {
          // If a vendor edited this product, mark it as pending for admin review
          if (isVendor && !isMaster) {
            try {
              const db = await import('../../lib/database');
              await db.reviewProduct(Number(editingProduct.id), 'pending');
            } catch {}
          }
          Alert.alert('Success', 'Product updated successfully');
          await loadProducts();
          closeModal();
        } else {
          Alert.alert('Error', 'Failed to update product');
        }
      } else {
        const productId = await addProduct(productData);
        if (productId) {
          // If we drafted variants, add them now
          if (draftVariants.length) {
            try {
              const db = await import('../../lib/database');
              for (const v of draftVariants) {
                await db.addProductVariant(Number(productId), v);
              }
              // Compute fallback stock/price for compatibility
              const totalStock = draftVariants.reduce((s, v) => s + (Number(v.stock_available)||0), 0);
              const minPrice = draftVariants.reduce((m, v) => Math.min(m, Number(v.price)||0), Number.POSITIVE_INFINITY);
              if (isFinite(minPrice)) {
                await updateProduct(Number(productId), { stock_available: totalStock, cost_per_unit: minPrice });
              }
            } catch {}
          }
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

  const openReviewsModal = async (product: Product & { [key: string]: any }) => {
    if (!isMaster) return;
    setReviewsProduct(product);
    setReviews([]);
    setReviewsFilter(0);
    setReviewsLoading(true);
    setReviewsModalVisible(true);
    try {
      const rows = await getProductReviews(product.id) as any[];
      setReviews(Array.isArray(rows) ? rows : []);
    } catch (e: any) {
      console.error('Error loading reviews', e);
      setReviews([]);
      const msg = String(e?.message || e || 'Failed to load reviews');
      Alert.alert('Error loading reviews', msg);
    } finally {
      setReviewsLoading(false);
    }
  };

  const renderProduct = ({ item }: { item: Product & { status?: string; review_note?: string; created_by?: number } }) => {
    const createdBy = (item as any).created_by as number | null | undefined;
    const canEditOrDelete = isMaster || (isVendor && createdBy != null && user?.id === createdBy);

    return (
    <View style={styles.productCard}>
      {item.image && (
        <Image source={{ uri: item.image }} style={styles.productImage} />
      )}
      
      <View style={styles.productDetails}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        {isMaster && (() => {
          const avgRaw = (item as any).avg_rating;
          const countRaw = (item as any).rating_count;
          const avg = avgRaw != null ? Number(avgRaw) : 0;
          const count = countRaw != null ? Number(countRaw) : 0;
          if (!count || !isFinite(avg)) return null;
          return (
            <View style={styles.productRatingRow}>
              <Ionicons name="star" size={14} color="#fbc02d" />
              <Text style={styles.productRatingText}>
                {avg.toFixed(1)} ({count})
              </Text>
            </View>
          );
        })()}
        {isMaster && (item as any).rating_count > 0 && (
          <TouchableOpacity
            style={styles.viewReviewsChip}
            onPress={() => openReviewsModal(item as any)}
          >
            <Ionicons name="chatbubbles-outline" size={14} color="#2d5016" />
            <Text style={styles.viewReviewsText}>View reviews</Text>
          </TouchableOpacity>
        )}
        {!isMaster && (
          <Text style={styles.productPrice}>
            ₹{item.cost_per_unit} • Stock: {item.stock_available}
          </Text>
        )}
        {isMaster && Array.isArray(variantMap[item.id]) && variantMap[item.id].length ? (
          <View style={{ marginTop: 4 }}>
            {variantMap[item.id].map((v:any) => {
              const label = String(v.label || '');
              const price = Number(v.price);
              const stock = typeof v.stock_available === 'number' ? v.stock_available : 0;
              return (
                <Text
                  key={v.id}
                  style={{ color: '#4e7c35', fontSize: 12, fontWeight: '600' }}
                >
                  Rs. {isFinite(price) ? price : '-'} / {label} (Stock: {stock})
                </Text>
              );
            })}
          </View>
        ) : null}
        {(() => {
          const status = String((item as any).status || '').toLowerCase();
          if (!status) return null;
          // For masters, hide the noisy "Status: approved" label on the main list,
          // but vendors still see all statuses.
          if (isMaster && status === 'approved') return null;
          const color = status === 'approved' ? '#2e7d32' : status === 'pending' ? '#ff8f00' : '#d32f2f';
          return (
            <Text style={{ marginTop: 4, fontSize: 12, color }}>
              Status: {status.toUpperCase()} {(item as any).review_note ? `— ${(item as any).review_note}` : ''}
            </Text>
          );
        })()}
      </View>

      <View style={styles.productActions}>
        {canEditOrDelete && (
          <>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => openEditModal(item)}
            >
              <Ionicons name="pencil" size={20} color="#4caf50" />
            </TouchableOpacity>
            {isMaster && String((item as any).status||'') === 'pending' && (
              <>
                <TouchableOpacity style={[styles.variantButton,{ borderColor:'#c8e6c9' }]} onPress={async ()=> {
                  const db = await import('../../lib/database');
                  await db.reviewProduct(Number(item.id), 'approved');
                  await loadProducts();
                }}>
                  <Ionicons name="checkmark" size={18} color="#2e7d32" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.variantButton,{ borderColor:'#fdecea' }]} onPress={async ()=> {
                  const db = await import('../../lib/database');
                  await db.reviewProduct(Number(item.id), 'rejected');
                  await loadProducts();
                }}>
                  <Ionicons name="close" size={18} color="#d32f2f" />
                </TouchableOpacity>
              </>
            )}
          </>
        )}
        
        {canEditOrDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash" size={20} color="#f44336" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
  }

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
          <Text style={styles.addButtonText} numberOfLines={2}>Add Product</Text>
        </TouchableOpacity>

        {isMaster && (
          <>
            <TouchableOpacity
              style={[styles.sampleButton, { backgroundColor: '#607d8b' }]}
              onPress={() => router.push('/pending-products')}
            >
              <View style={{ position:'relative', marginRight: 6 }}>
                <Ionicons name="time" size={24} color="#fff" />
                {pendingProducts.length > 0 && (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>
                      {pendingProducts.length > 99 ? '99+' : String(pendingProducts.length)}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.sampleButtonText} numberOfLines={2}>
                Review products
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sampleButton}
              onPress={handleAddSampleProducts}
            >
              <Ionicons name="leaf" size={24} color="#fff" />
              <Text style={styles.sampleButtonText} numberOfLines={2}>
                Add Sample Products
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sampleButton, { backgroundColor: '#00bcd4' }]}
              onPress={() => setKeywordModalVisible(true)}
            >
              <Ionicons name="pricetags" size={24} color="#fff" />
              <Text style={styles.sampleButtonText} numberOfLines={2}>
                Manage Keywords
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : (
        <>
          {isMaster ? (
            <PendingSection pendingList={pendingProducts} onRefresh={async () => { await loadPending(); await loadProducts(); }} />
          ) : null}
          <FlatList
            data={isMaster ? products.filter((p:any) => String((p as any).status || 'approved') !== 'pending') : products}
            renderItem={renderProduct}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
          <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
            <Text style={{ color:'#2d5016', fontWeight:'700', marginBottom:6 }}>Seller</Text>
            <TouchableOpacity style={[styles.input, { flexDirection:'row', alignItems:'center', justifyContent:'space-between' }]} onPress={() => setVendorOpen(true)}>
              <Text style={{ color: formData.seller_name ? '#333' : '#999' }}>{formData.seller_name || 'Select Vendor'}</Text>
              <Ionicons name={vendorOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#666" />
            </TouchableOpacity>
            <Modal visible={vendorOpen} transparent animationType="fade" onRequestClose={() => setVendorOpen(false)}>
              <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.3)', justifyContent:'center', alignItems:'center' }}>
                <View style={{ width:'92%', maxHeight: '70%', backgroundColor:'#fff', borderRadius:12, overflow:'hidden' }}>
                  <View style={{ padding:14, borderBottomWidth:1, borderBottomColor:'#eee', flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
                    <Text style={{ fontSize:16, fontWeight:'700', color:'#333' }}>Select Vendor</Text>
                    <TouchableOpacity onPress={() => setVendorOpen(false)}><Ionicons name="close" size={22} color="#333" /></TouchableOpacity>
                  </View>
                  <ScrollView contentContainerStyle={{ paddingVertical:0 }}>
                    {vendorUsers.length === 0 ? (
                      <View style={{ padding:12 }}>
                        <Text style={{ color:'#666' }}>No vendors yet</Text>
                      </View>
                    ) : (
                      vendorUsers.map(u => {
                        const name =
                          (u.full_name && String(u.full_name).trim()) ||
                          String(u.number || 'Vendor');
                        return (
                          <TouchableOpacity
                            key={u.id}
                            style={{ padding:12, borderBottomWidth:1, borderBottomColor:'#f5f5f5' }}
                            onPress={() => {
                              // seller_name stored as the vendor user's display name
                              setFormData({ ...formData, seller_name: name });
                              setVendorOpen(false);
                            }}
                          >
                            <Text
                              style={{
                                color:'#333',
                                fontWeight:
                                  formData.seller_name === name ? '700' : '600',
                              }}
                            >
                              {name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </ScrollView>
                </View>
              </View>
            </Modal>
            <Text style={{ color:'#2d5016', fontWeight:'700', marginBottom:6 }}>English Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Product Name (English)"
              placeholderTextColor="#666"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />

            <Text style={{ color:'#2d5016', fontWeight:'700', marginBottom:6 }}>Tamil Name</Text>
            <TextInput
              style={styles.input}
              placeholder="பொருளின் பெயர் (தமிழ்)"
              placeholderTextColor="#666"
              value={formData.name_ta}
              onChangeText={(text) => setFormData({ ...formData, name_ta: text })}
            />

            {/* Keywords dropdown under product name */}
            <Text style={{ color:'#2d5016', fontWeight:'700', marginTop:10, marginBottom:6 }}>Keywords</Text>
            <TouchableOpacity
              style={[styles.input, { flexDirection:'row', alignItems:'center', justifyContent:'space-between' }]}
              onPress={() => setKeywordsDropdownOpen(true)}
            >
              <Text style={{ color: selectedKeywords.length ? '#333' : '#999', flex:1 }} numberOfLines={1}>
                {selectedKeywords.length ? selectedKeywords.join(', ') : 'Select keywords'}
              </Text>
              <Ionicons
                name={keywordsDropdownOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color="#666"
              />
            </TouchableOpacity>
            <Modal
              visible={keywordsDropdownOpen}
              transparent
              animationType="fade"
              onRequestClose={() => setKeywordsDropdownOpen(false)}
            >
              <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.3)', justifyContent:'center', alignItems:'center', padding:16 }}>
                <View style={{ width:'92%', maxHeight:'70%', backgroundColor:'#fff', borderRadius:12, overflow:'hidden' }}>
                  <View style={{ padding:14, borderBottomWidth:1, borderBottomColor:'#eee', flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
                    <Text style={{ fontSize:16, fontWeight:'700', color:'#333' }}>Select Keywords</Text>
                    <TouchableOpacity onPress={() => setKeywordsDropdownOpen(false)}>
                      <Ionicons name="close" size={22} color="#333" />
                    </TouchableOpacity>
                  </View>
                  <ScrollView contentContainerStyle={{ paddingVertical:0 }}>
                    {keywords.length === 0 ? (
                      <View style={{ padding:12 }}>
                        <Text style={{ color:'#666' }}>No keywords yet. Use "Manage Keywords" to add some.</Text>
                      </View>
                    ) : (
                      keywords.map(k => {
                        const selected = selectedKeywords.includes(k.name);
                        return (
                          <TouchableOpacity
                            key={k.id}
                            style={{ padding:12, borderBottomWidth:1, borderBottomColor:'#f5f5f5' }}
                            onPress={() => toggleKeyword(k.name)}
                          >
                            <View style={{ flexDirection:'row', alignItems:'center' }}>
                              <Ionicons
                                name={selected ? 'radio-button-on' : 'radio-button-off'}
                                size={18}
                                color={selected ? '#4caf50' : '#999'}
                                style={{ marginRight: 8 }}
                              />
                              <Text style={{ color:'#333', fontWeight: selected ? '700' : '600' }}>{k.name}</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </ScrollView>
                </View>
              </View>
            </Modal>

            {/* Keywords UI hidden to match new design */}

            <Text style={{ color:'#2d5016', fontWeight:'700', marginBottom:6 }}>Description</Text>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Product Details (English)"
              placeholderTextColor="#666"
              value={formData.details}
              onChangeText={(text) => setFormData({ ...formData, details: text })}
              multiline
              numberOfLines={4}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="பொருள் விவரங்கள் (தமிழ்)"
              placeholderTextColor="#666"
              value={formData.details_ta}
              onChangeText={(text) => setFormData({ ...formData, details_ta: text })}
              multiline
              numberOfLines={4}
            />

            {/* Variants (define all product units/pricing here) */}
            {!editingProduct ? (
              <View style={{ marginTop: 8, marginBottom: 12 }}>
                <Text style={{ color:'#2d5016', fontWeight:'700', marginBottom: 6 }}>Variants</Text>
                {draftVariants.map((v, idx) => (
                  <View key={idx} style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:8, borderBottomWidth:1, borderBottomColor:'#f5f5f5' }}>
                    <Text style={{ color:'#333' }}>{v.label} — Rs. {v.price} • Stock: {v.stock_available}</Text>
                    <TouchableOpacity onPress={() => setDraftVariants(prev => prev.filter((_, i) => i !== idx))}>
                      <Ionicons name="trash" size={18} color="#d32f2f" />
                    </TouchableOpacity>
                  </View>
                ))}
                <View style={{ flexDirection:'row', gap:8 }}>
                  <TextInput style={[styles.input, { flex:1 }]} placeholder="Qty" placeholderTextColor="#666" keyboardType="numeric" value={newVarQty} onChangeText={setNewVarQty} />
                  <TouchableOpacity style={[styles.input, { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'space-between' }]} onPress={()=> setUnitPickerOpen(true)}>
                    <Text style={{ color:'#333' }}>{newVarUnit}</Text>
                    <Ionicons name={unitPickerOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#666" />
                  </TouchableOpacity>
                </View>
                <Modal visible={unitPickerOpen} transparent animationType="fade" onRequestClose={()=> setUnitPickerOpen(false)}>
                  <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.3)', justifyContent:'center', alignItems:'center' }}>
                    <View style={{ width:'80%', maxHeight:'60%', backgroundColor:'#fff', borderRadius:12, overflow:'hidden' }}>
                      <View style={{ padding:14, borderBottomWidth:1, borderBottomColor:'#eee', flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
                        <Text style={{ fontSize:16, fontWeight:'700', color:'#333' }}>Select Unit</Text>
                        <TouchableOpacity onPress={()=> setUnitPickerOpen(false)}><Ionicons name="close" size={22} color="#333" /></TouchableOpacity>
                      </View>
                      <ScrollView>
                        {unitsList.map(u => {
                          const selected = newVarUnit === u;
                          return (
                            <TouchableOpacity
                              key={u}
                              style={{ padding:12, borderBottomWidth:1, borderBottomColor:'#f5f5f5' }}
                              onPress={()=> { setNewVarUnit(u); setUnitPickerOpen(false); }}
                            >
                              <View style={{ flexDirection:'row', alignItems:'center' }}>
                                <Ionicons
                                  name={selected ? 'radio-button-on' : 'radio-button-off'}
                                  size={18}
                                  color={selected ? '#4caf50' : '#999'}
                                  style={{ marginRight: 8 }}
                                />
                                <Text style={{ color:'#333', fontWeight: selected ? '700' : '600' }}>{u}</Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  </View>
                </Modal>
                <View style={{ flexDirection:'row', gap:8, marginTop: 8 }}>
                  <TextInput style={[styles.input, { flex:1 }]} placeholder="Price (Rs.)" placeholderTextColor="#666" keyboardType="numeric" value={newVarPrice} onChangeText={setNewVarPrice} />
                  <TextInput style={[styles.input, { flex:1 }]} placeholder="Stock" placeholderTextColor="#666" keyboardType="numeric" value={newVarStock} onChangeText={setNewVarStock} />
                </View>
                <TouchableOpacity style={[styles.saveButton, { marginTop: 8 }]} onPress={() => {
                  if (!newVarQty.trim() || !newVarPrice.trim()) return;
                  const label = `${newVarQty.trim()} ${newVarUnit}`;
                  setDraftVariants(prev => [...prev, { label, price: Number(newVarPrice), stock_available: Number(newVarStock||0) }]);
                  setNewVarQty(''); setNewVarPrice(''); setNewVarStock('');
                }}>
                  <Text style={styles.saveButtonText}>Add Variant</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Variants in editor (only when editing existing product) */}
            {editingProduct && (
              <View style={{ marginTop: 8, marginBottom: 12 }}>
                <Text style={{ color:'#2d5016', fontWeight:'700', marginBottom: 6 }}>Variants</Text>
                {variants.map(v => (
                  <View key={v.id} style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:8, borderBottomWidth:1, borderBottomColor:'#f5f5f5' }}>
                    <Text style={{ color:'#333' }}>{v.label} — Rs. {v.price} • Stock: {v.stock_available}</Text>
                    <TouchableOpacity onPress={async ()=> { await (await import('../../lib/database')).deleteProductVariant(Number(v.id)); const db = await import('../../lib/database'); const list = await db.getProductVariants(Number(variantsProductId)); setVariants(list as any[]); try { const totalStock = (list as any[]).reduce((s, it:any)=> s + (Number(it.stock_available)||0), 0); const minPrice = (list as any[]).reduce((m, it:any)=> Math.min(m, Number(it.price)||0), Number.POSITIVE_INFINITY); if (isFinite(minPrice as any)) { await updateProduct(Number(variantsProductId), { stock_available: totalStock, cost_per_unit: minPrice }); } } catch {} }}>
                      <Ionicons name="trash" size={18} color="#d32f2f" />
                    </TouchableOpacity>
                  </View>
                ))}
                <View style={{ flexDirection:'row', gap:8 }}>
                  <TextInput style={[styles.input, { flex:1 }]} placeholder="Qty" placeholderTextColor="#666" keyboardType="numeric" value={newVarQty} onChangeText={setNewVarQty} />
                  <TouchableOpacity style={[styles.input, { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'space-between' }]} onPress={()=> setUnitPickerOpen(true)}>
                    <Text style={{ color:'#333' }}>{newVarUnit}</Text>
                    <Ionicons name={unitPickerOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#666" />
                  </TouchableOpacity>
                </View>
                <Modal visible={unitPickerOpen} transparent animationType="fade" onRequestClose={()=> setUnitPickerOpen(false)}>
                  <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.3)', justifyContent:'center', alignItems:'center' }}>
                    <View style={{ width:'80%', maxHeight:'60%', backgroundColor:'#fff', borderRadius:12, overflow:'hidden' }}>
                      <View style={{ padding:14, borderBottomWidth:1, borderBottomColor:'#eee', flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
                        <Text style={{ fontSize:16, fontWeight:'700', color:'#333' }}>Select Unit</Text>
                        <TouchableOpacity onPress={()=> setUnitPickerOpen(false)}><Ionicons name="close" size={22} color="#333" /></TouchableOpacity>
                      </View>
                      <ScrollView>
                        {unitsList.map(u => {
                          const selected = newVarUnit === u;
                          return (
                            <TouchableOpacity
                              key={u}
                              style={{ padding:12, borderBottomWidth:1, borderBottomColor:'#f5f5f5' }}
                              onPress={()=> { setNewVarUnit(u); setUnitPickerOpen(false); }}
                            >
                              <View style={{ flexDirection:'row', alignItems:'center' }}>
                                <Ionicons
                                  name={selected ? 'radio-button-on' : 'radio-button-off'}
                                  size={18}
                                  color={selected ? '#4caf50' : '#999'}
                                  style={{ marginRight: 8 }}
                                />
                                <Text style={{ color:'#333', fontWeight: selected ? '700' : '600' }}>{u}</Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  </View>
                </Modal>
                <View style={{ flexDirection:'row', gap:8, marginTop: 8 }}>
                  <TextInput style={[styles.input, { flex:1 }]} placeholder="Price (Rs.)" placeholderTextColor="#666" keyboardType="numeric" value={newVarPrice} onChangeText={setNewVarPrice} />
                  <TextInput style={[styles.input, { flex:1 }]} placeholder="Stock" placeholderTextColor="#666" keyboardType="numeric" value={newVarStock} onChangeText={setNewVarStock} />
                </View>
                <TouchableOpacity style={[styles.saveButton, { marginTop: 8 }]} onPress={async ()=>{
                  if (!variantsProductId || !newVarQty.trim() || !newVarPrice.trim()) return;
                  const label = `${newVarQty.trim()} ${newVarUnit}`;
                  const ok = await (await import('../../lib/database')).addProductVariant(Number(variantsProductId), { label, price: Number(newVarPrice), stock_available: Number(newVarStock||0) });
                  if (ok) {
                    const db = await import('../../lib/database');
                    const list = await db.getProductVariants(Number(variantsProductId));
                    setVariants(list as any[]);
                    try { const totalStock = (list as any[]).reduce((s, it:any)=> s + (Number(it.stock_available)||0), 0); const minPrice = (list as any[]).reduce((m, it:any)=> Math.min(m, Number(it.price)||0), Number.POSITIVE_INFINITY); if (isFinite(minPrice as any)) { await updateProduct(Number(variantsProductId), { stock_available: totalStock, cost_per_unit: minPrice }); } } catch {}
                    setNewVarQty(''); setNewVarPrice(''); setNewVarStock('');
                  }
                }}>
                  <Text style={styles.saveButtonText}>Add Variant</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
              <Ionicons name="camera" size={24} color="#4caf50" />
              <Text style={styles.imageButtonText}>
                {formData.image ? 'Change Image' : 'Add Image'}
              </Text>
            </TouchableOpacity>

            {formData.image && (
              <Image source={{ uri: formData.image }} style={styles.previewImage} />
            )}
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
        </KeyboardAvoidingView>
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



      {/* Admin creation modal removed; handled in Masters > Add/Manage Admins */}

      <Modal
        visible={reviewsModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff' }} />
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {reviewsProduct ? `Reviews - ${reviewsProduct.name}` : 'Product Reviews'}
            </Text>
            <TouchableOpacity onPress={() => { setReviewsModalVisible(false); setReviewsProduct(null); }}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: 20 }}>
            {reviewsProduct && (
              (() => {
                const avgRaw = (reviewsProduct as any).avg_rating;
                const countRaw = (reviewsProduct as any).rating_count;
                const computedAvg = (() => {
                  if (avgRaw != null && avgRaw !== undefined) return Number(avgRaw);
                  if (!reviews.length) return 0;
                  const sum = reviews.reduce((s: number, r: any) => s + (Number(r.rating) || 0), 0);
                  return sum / reviews.length;
                })();
                const computedCount = countRaw != null ? Number(countRaw) : reviews.length;
                return (
                  <View style={styles.reviewSummary}>
                    <Text style={styles.reviewSummaryAverage}>{computedAvg > 0 && isFinite(computedAvg) ? computedAvg.toFixed(1) : '–'}</Text>
                    <View style={styles.reviewSummaryStarsRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons
                          key={star}
                          name={computedAvg >= star ? 'star' : 'star-outline'}
                          size={16}
                          color="#fbc02d"
                        />
                      ))}
                    </View>
                    <Text style={styles.reviewSummaryCount}>
                      {computedCount} rating{computedCount === 1 ? '' : 's'}
                    </Text>
                    <View style={styles.reviewFilterRow}>
                      {([
                        { label: 'All', value: 0 },
                        { label: '5★', value: 5 },
                        { label: '4★', value: 4 },
                        { label: '3★', value: 3 },
                        { label: '2★', value: 2 },
                        { label: '1★', value: 1 },
                      ] as const).map((opt) => (
                        <TouchableOpacity
                          key={opt.value}
                          style={[
                            styles.reviewFilterChip,
                            reviewsFilter === opt.value && styles.reviewFilterChipActive,
                          ]}
                          onPress={() => setReviewsFilter(opt.value)}
                        >
                          <Text
                            style={[
                              styles.reviewFilterText,
                              reviewsFilter === opt.value && styles.reviewFilterTextActive,
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              })()
            )}

            {reviewsLoading ? (
              <Text style={styles.loadingText}>Loading reviews...</Text>
            ) : !reviews.length ? (
              <Text style={styles.noKeywordsText}>No reviews yet for this product.</Text>
            ) : (
              (reviewsFilter === 0 ? reviews : reviews.filter((r: any) => Number(r.rating) === reviewsFilter)).map((r: any) => {
                const rating = r.rating != null ? Number(r.rating) : 0;
                const name = (r.full_name && String(r.full_name).trim()) || String(r.number || 'User');
                const createdAt = r.order_created_at || r.created_at;
                const dt = createdAt ? new Date(createdAt) : null;
                return (
                  <View key={r.id} style={styles.reviewItem}>
                    <View style={styles.reviewHeaderRow}>
                      <Text style={styles.reviewUserName}>{name}</Text>
                      {dt && (
                        <Text style={styles.reviewDate}>
                          {dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>
                      )}
                    </View>
                    <View style={styles.reviewRatingRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons
                          key={star}
                          name={rating >= star ? 'star' : 'star-outline'}
                          size={14}
                          color="#fbc02d"
                        />
                      ))}
                    </View>
                    {r.review ? (
                      <Text style={styles.reviewText}>{r.review}</Text>
                    ) : null}
                  </View>
                );
              })
            )}
          </ScrollView>
          <View style={{ height: 10 }} />
          <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#fff' }} />
        </View>
      </Modal>

      <View style={{ height: 10 }} />
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#f5f5f5' }} />
    </View>
  );
}

function PendingSection({ pendingList, onRefresh }: { pendingList: any[]; onRefresh: () => void }) {
  if (!pendingList?.length) return null;
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom: 8 }}>
        <Text style={{ color:'#2d5016', fontSize: 16, fontWeight:'800' }}>Review products ({pendingList.length})</Text>
        <View style={{ flexDirection:'row', alignItems:'center', gap: 10 }}>
          <TouchableOpacity onPress={() => router.push('/pending-products')}><Text style={{ color:'#2d5016', fontWeight:'800' }}>View all</Text></TouchableOpacity>
          <TouchableOpacity onPress={onRefresh}><Ionicons name="refresh" size={18} color="#2d5016" /></TouchableOpacity>
        </View>
      </View>
      {pendingList.map((item:any) => (
        <View key={item.id} style={{ backgroundColor:'#f1f8f4', borderWidth:1, borderColor:'#c8e6c9', padding:12, borderRadius:12, marginBottom:8 }}>
          <View style={{ flexDirection:'row', alignItems:'center' }}>
            {item.image ? <Image source={{ uri: item.image }} style={{ width:48, height:48, borderRadius:8, marginRight:10 }} /> : <View style={{ width:48, height:48, borderRadius:8, marginRight:10, backgroundColor:'#eaf6ec' }} />}
            <View style={{ flex:1 }}>
              <Text style={{ color:'#2d5016', fontWeight:'800' }} numberOfLines={1}>{item.name}</Text>
              <Text style={{ color:'#4e7c35', fontWeight:'600', fontSize:12 }} numberOfLines={1}>Stock: {item.stock_available} • ₹{item.cost_per_unit}</Text>
            </View>
            <View style={{ flexDirection:'row' }}>
              <TouchableOpacity style={{ padding:6 }} onPress={async ()=> { const db = await import('../../lib/database'); await db.reviewProduct(Number(item.id), 'approved'); await onRefresh(); }}>
                <Ionicons name="checkmark" size={18} color="#2e7d32" />
              </TouchableOpacity>
              <TouchableOpacity style={{ padding:6 }} onPress={async ()=> { const db = await import('../../lib/database'); await db.reviewProduct(Number(item.id), 'rejected'); await onRefresh(); }}>
                <Ionicons name="close" size={18} color="#d32f2f" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}
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
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  addButton: {
    backgroundColor: '#4caf50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexBasis: '48%',
    paddingVertical: 16,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    textAlign: 'center',
    flexShrink: 1,
  },
  sampleButton: {
    backgroundColor: '#ff9800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexBasis: '48%',
    paddingVertical: 16,
    borderRadius: 8,
  },
  sampleButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  pendingBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ff5252',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  pendingBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
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
  productRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  productRatingText: {
    fontSize: 12,
    color: '#555',
    fontWeight: '600',
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
  viewReviewsChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c8e6c9',
    marginBottom: 4,
    gap: 4,
  },
  viewReviewsText: {
    fontSize: 11,
    color: '#2d5016',
    fontWeight: '600',
  },
  editButton: {
    padding: 8,
    marginRight: 8,
  },
  variantButton: {
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
  reviewItem: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d5016',
  },
  reviewDate: {
    fontSize: 12,
    color: '#777',
  },
  reviewRatingRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 4,
  },
  reviewText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  reviewSummary: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f1f8f4',
    borderRadius: 8,
  },
  reviewSummaryAverage: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2d5016',
    marginBottom: 4,
  },
  reviewSummaryStarsRow: {
    flexDirection: 'row',
    marginBottom: 4,
    gap: 2,
  },
  reviewSummaryCount: {
    fontSize: 12,
    color: '#555',
    marginBottom: 8,
  },
  reviewFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reviewFilterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#c8e6c9',
    backgroundColor: '#fff',
  },
  reviewFilterChipActive: {
    borderColor: '#4caf50',
    backgroundColor: '#e8f5e9',
  },
  reviewFilterText: {
    fontSize: 12,
    color: '#2d5016',
    fontWeight: '500',
  },
  reviewFilterTextActive: {
    fontWeight: '700',
  },
});
