import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAllKeywords, addKeyword, deleteKeyword } from '../lib/database';

interface Keyword {
  id: number;
  name: string;
  created_at: string;
}

export default function KeywordsScreen() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeywordName, setNewKeywordName] = useState('');

  const loadKeywords = async () => {
    try {
      const rows = await getAllKeywords() as Keyword[];
      setKeywords(rows || []);
    } catch (e) {
      console.error('Error loading keywords:', e);
      Alert.alert('Error', 'Failed to load keywords');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeywords();
  }, []);

  const handleAddNewKeyword = async () => {
    const trimmed = newKeywordName.trim();
    if (!trimmed) {
      Alert.alert('Error', 'Please enter a keyword name');
      return;
    }

    try {
      const keywordId = await addKeyword(trimmed);
      if (keywordId) {
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
                await loadKeywords();
              } else {
                Alert.alert('Error', 'Failed to delete keyword');
              }
            } catch (error) {
              console.error('Error deleting keyword:', error);
              Alert.alert('Error', 'Failed to delete keyword');
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: Keyword }) => (
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
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#4caf50' }} />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Back" style={{ padding: 4 }}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Keywords</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.addKeywordContainer}>
          <TextInput
            style={[styles.input, styles.keywordInput]}
            placeholder="Add new keyword"
            value={newKeywordName}
            onChangeText={setNewKeywordName}
            autoCapitalize="sentences"
          />
          <TouchableOpacity
            style={styles.addKeywordButton}
            onPress={handleAddNewKeyword}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <Text style={styles.loadingText}>Loading keywords...</Text>
        ) : (
          <FlatList
            data={keywords}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={keywords.length === 0 ? { flexGrow: 1, justifyContent: 'center' } : undefined}
            ListEmptyComponent={
              <Text style={styles.noKeywordsText}>
                No keywords yet. Add your first keyword above.
              </Text>
            }
          />
        )}
      </View>
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#fff' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  body: {
    flex: 1,
    padding: 16,
  },
  addKeywordContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
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
  noKeywordsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
});
