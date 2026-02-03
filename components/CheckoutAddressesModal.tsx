import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserContext } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';

interface CheckoutAddressesModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (bookingAddress: string, deliveryAddress: string) => void;
  bookingAddress?: string;
  deliveryAddress?: string;
}

export default function CheckoutAddressesModal({
  visible,
  onClose,
  onConfirm,
  bookingAddress,
  deliveryAddress,
}: CheckoutAddressesModalProps) {
  const { user, setUser } = useContext(UserContext);
  const { t, currentLanguage } = useLanguage();

  const getInitialBooking = () => {
    const u: any = user;
    return String(bookingAddress || u?.booking_address || u?.address || '');
  };

  const getInitialDelivery = () => {
    const u: any = user;
    return String(deliveryAddress || u?.delivery_address || u?.address || '');
  };

  const [booking, setBooking] = useState(getInitialBooking());
  const [delivery, setDelivery] = useState(getInitialDelivery());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setBooking(getInitialBooking());
    setDelivery(getInitialDelivery());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, user?.id]);

  const handleConfirm = async () => {
    if (!booking.trim()) {
      Alert.alert(t('address.required'), currentLanguage === 'ta' ? 'உங்கள் பதிப்பு முகவரியை உள்ளிடவும்' : 'Please enter your booking address');
      return;
    }
    if (!delivery.trim()) {
      Alert.alert(t('address.required'), t('address.enterAddress'));
      return;
    }

    const b = booking.trim();
    const d = delivery.trim();

    setLoading(true);
    try {
      // Persist into user record so next checkout can prefill
      if (user) {
        const { updateUser } = await import('../lib/database');
        const patch: any = { booking_address: b, delivery_address: d };
        const ok = await updateUser(user.id, patch);
        if (ok) {
          await setUser({ ...(user as any), ...patch }, { persist: true });
        }
      }
      onConfirm(b, d);
    } catch (error) {
      console.error('Error updating addresses:', error);
      Alert.alert(t('common.error'), currentLanguage === 'ta' ? 'முகவரி நொகடவக்க அயந்து. அங்கள் அக்க் இகவை தொஎதுகவும்.' : 'Failed to update address. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{currentLanguage === 'ta' ? 'முகவரிகள் உள்ளிடவும்' : 'Enter Addresses'}</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close" style={{ padding: 4 }}>
              <Ionicons name="close" size={22} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.infoSection}>
              <Ionicons name="location" size={22} color="#4caf50" />
              <Text style={styles.infoText}>
                {currentLanguage === 'ta' ? 'அருவு பதிப்பு முகவரிகளும் பதொருகளுயும் ஆர்ட்டங்கிப்பிலப் தேவைக்கங்கள்.' : 'Both booking and delivery addresses are required to place the order.'}
              </Text>
            </View>

            <Text style={styles.fieldLabel}>{t('address.bookingAddress')}</Text>
            <TextInput
              style={styles.addressInput}
              placeholder={currentLanguage === 'ta' ? 'பதிப்பு முகவரி உள்ளிடவும்...' : 'Enter booking address...'}
              placeholderTextColor="#999"
              value={booking}
              onChangeText={setBooking}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              autoCapitalize="words"
            />

            <Text style={styles.fieldLabel}>{t('address.deliveryAddress')}</Text>
            <TextInput
              style={styles.addressInput}
              placeholder={currentLanguage === 'ta' ? 'பதொரு முகவரி உள்ளிடவும்...' : 'Enter delivery address...'}
              placeholderTextColor="#999"
              value={delivery}
              onChangeText={setDelivery}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              autoCapitalize="words"
            />

            <Text style={styles.helperText}>
              {currentLanguage === 'ta' ? 'வீட்டு எண், தெரு பெயர், பகுதி, அடல்ந்கம், நகரம், மற்றும் பின் குடக்கங்காரம் அடகி' : 'Include house number, street name, area, landmark, city, and PIN code'}
            </Text>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, loading && styles.confirmButtonDisabled]}
              onPress={handleConfirm}
              disabled={loading}
            >
              <Text style={styles.confirmButtonText}>{loading ? (currentLanguage === 'ta' ? 'சேமிக்கிறது...' : 'Saving...') : (currentLanguage === 'ta' ? 'தடக்கார' : 'Continue')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxHeight: '85%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  modalContent: {
    padding: 16,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    padding: 12,
    backgroundColor: '#f1f8f4',
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: '#2d5016',
    lineHeight: 18,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2d5016',
    marginBottom: 8,
  },
  addressInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#f9f9f9',
    minHeight: 110,
    marginBottom: 14,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 10,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '700',
  },
  confirmButton: {
    flex: 2,
    backgroundColor: '#4caf50',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#a5d6a7',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});
