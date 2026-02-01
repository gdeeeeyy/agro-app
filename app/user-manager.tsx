import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { UserContext } from '../context/UserContext';
import { listUsersBasic, updateUser, deleteUser } from '../lib/database';
import * as Crypto from 'expo-crypto';
import { api } from '../lib/api';
import { createAdminCustom } from '../lib/createAdmin';

interface UserRow {
  id: number;
  number: string;
  full_name?: string;
  is_admin?: number;
  address?: string;
}

const ROLE_MASTER = 2;
const ROLE_VENDOR = 1;
const ROLE_USER = 0;

type RoleLabel = 'Master' | 'Vendor' | 'User';

type RoleFilter = 'ALL' | RoleLabel;

type EditState = { visible: boolean; user: UserRow | null };

type CreateRole = RoleLabel;

function getRoleLabel(is_admin: number | null | undefined): RoleLabel {
  const v = Number(is_admin);
  if (v === ROLE_MASTER) return 'Master';
  if (v === ROLE_VENDOR) return 'Vendor';
  return 'User';
}

function roleLabelToValue(role: RoleLabel): 0 | 1 | 2 {
  if (role === 'Master') return ROLE_MASTER;
  if (role === 'Vendor') return ROLE_VENDOR;
  return ROLE_USER;
}

export default function UserManager() {
  const { user } = useContext(UserContext);
  const isMaster = Number(user?.is_admin) === ROLE_MASTER;

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [filterText, setFilterText] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');

  const [editState, setEditState] = useState<EditState>({ visible: false, user: null });
  const [createVisible, setCreateVisible] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createNumber, setCreateNumber] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState<CreateRole>('Vendor');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const rows = (await listUsersBasic()) as any[];
      setUsers(rows as UserRow[]);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    return users.filter(u => {
      if (
        q &&
        !(
          (u.full_name || '').toLowerCase().includes(q) ||
          (u.number || '').toLowerCase().includes(q)
        )
      ) {
        return false;
      }
      const r = Number(u.is_admin);
      if (roleFilter === 'Master') return r === ROLE_MASTER;
      if (roleFilter === 'Vendor') return r === ROLE_VENDOR;
      if (roleFilter === 'User') return r === ROLE_USER;
      return true; // ALL
    });
  }, [users, filterText, roleFilter]);

  const openEdit = (u: UserRow) => {
    setEditState({ visible: true, user: u });
  };

  const closeEdit = () => setEditState({ visible: false, user: null });

  const handleCreateUser = async () => {
    if (!createName.trim() || !createNumber.trim() || !createPassword) {
      Alert.alert('Error', 'Fill all fields');
      return;
    }
    try {
      if (createRole === 'User') {
        const hashed = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          createPassword,
        );
        await api.post('/auth/signup', {
          number: createNumber.trim(),
          password: hashed,
          full_name: createName.trim(),
        });
      } else {
        const roleValue = createRole === 'Master' ? ROLE_MASTER : ROLE_VENDOR;
        const ok = await createAdminCustom(
          createNumber.trim(),
          createPassword,
          createName.trim(),
          roleValue as 1 | 2,
        );
        if (!ok) throw new Error('Failed to create user');
      }
      Alert.alert('Saved', 'User created');
      setCreateName('');
      setCreateNumber('');
      setCreatePassword('');
      setCreateRole('Vendor');
      setCreateVisible(false);
      await loadUsers();
    } catch (e: any) {
      Alert.alert('Error', String(e?.message || 'Failed to create user'));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Manager</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search */}
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <Text style={styles.sectionLabel}>Find Users</Text>
        <TextInput
          style={styles.input}
          placeholder="Search by name or number"
          placeholderTextColor="#999"
          value={filterText}
          onChangeText={setFilterText}
        />
      </View>

      {/* Filters */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
        <View style={[styles.segmented, { alignSelf: 'flex-start' }]}>
          <TouchableOpacity
            onPress={() => setRoleFilter('ALL')}
            style={[styles.segment, roleFilter === 'ALL' && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, roleFilter === 'ALL' && styles.segmentTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setRoleFilter('Master')}
            style={[styles.segment, roleFilter === 'Master' && styles.segmentActive]}
          >
            <Text
              style={[styles.segmentText, roleFilter === 'Master' && styles.segmentTextActive]}
            >
              Master
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setRoleFilter('Vendor')}
            style={[styles.segment, roleFilter === 'Vendor' && styles.segmentActive]}
          >
            <Text
              style={[styles.segmentText, roleFilter === 'Vendor' && styles.segmentTextActive]}
            >
              Vendor
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setRoleFilter('User')}
            style={[styles.segment, roleFilter === 'User' && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, roleFilter === 'User' && styles.segmentTextActive]}>
              User
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={{ padding: 16 }}>
          <Text style={{ color: '#666' }}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={u => String(u.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
          renderItem={({ item }) => {
            const roleLabel = getRoleLabel(item.is_admin);
            const displayUserId = `U${String(item.id).padStart(4, '0')}`;
            return (
              <View style={styles.card}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', color: '#2d5016' }}>
                      {item.full_name || 'User'}
                    </Text>
                    <Text style={{ color: '#666' }}>{item.number}</Text>
                    <Text style={{ color: '#888', fontSize: 12, marginTop: 2 }}>
                      User ID: {displayUserId}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text
                      style={[
                        styles.rolePill,
                        item.is_admin === ROLE_MASTER
                          ? styles.rolePillMaster
                          : item.is_admin === ROLE_VENDOR
                          ? styles.rolePillVendor
                          : styles.rolePillSupport,
                      ]}
                    >
                      {roleLabel}
                    </Text>
                    {isMaster && (
                      <TouchableOpacity
                        onPress={() => openEdit(item)}
                        style={{
                          padding: 8,
                          backgroundColor: '#eaf6ec',
                          borderRadius: 8,
                        }}
                      >
                        <Ionicons name="create" size={18} color="#2d5016" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Edit user modal */}
      <Modal
        visible={editState.visible && !!editState.user}
        transparent
        animationType="fade"
        onRequestClose={closeEdit}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.3)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: '92%',
              backgroundColor: '#fff',
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: '#e0e0e0',
              }}
            >
              <TouchableOpacity onPress={closeEdit}>
                <Ionicons name="chevron-back" size={22} color="#333" />
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: '700' }}>Edit User</Text>
              <View style={{ width: 22 }} />
            </View>

            {editState.user && (
              <EditForm
                user={editState.user}
                onSaved={async () => {
                  closeEdit();
                  await loadUsers();
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Create user modal */}
      <Modal
        visible={createVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.3)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: '92%',
              backgroundColor: '#fff',
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: '#e0e0e0',
              }}
            >
              <TouchableOpacity onPress={() => setCreateVisible(false)}>
                <Ionicons name="chevron-back" size={22} color="#333" />
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: '700' }}>Create User</Text>
              <View style={{ width: 22 }} />
            </View>

            <View style={{ padding: 16 }}>
              <TextInput
                style={[styles.input, { marginBottom: 8 }]}
                placeholder="Full Name"
                placeholderTextColor="#999"
                value={createName}
                onChangeText={setCreateName}
              />
              <TextInput
                style={[styles.input, { marginBottom: 8 }]}
                placeholder="Phone Number"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                value={createNumber}
                onChangeText={setCreateNumber}
              />
              <TextInput
                style={[styles.input, { marginBottom: 8, color: '#2d5016' }]}
                placeholder="Password"
                placeholderTextColor="#999"
                secureTextEntry
                value={createPassword}
                onChangeText={setCreatePassword}
              />

              <View
                style={[
                  styles.segmented,
                  { alignSelf: 'flex-start', marginTop: 6, marginBottom: 12 },
                ]}
              >
                <TouchableOpacity
                  onPress={() => setCreateRole('Master')}
                  style={[
                    styles.segment,
                    createRole === 'Master' && styles.segmentActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      createRole === 'Master' && styles.segmentTextActive,
                    ]}
                  >
                    Master
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setCreateRole('Vendor')}
                  style={[
                    styles.segment,
                    createRole === 'Vendor' && styles.segmentActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      createRole === 'Vendor' && styles.segmentTextActive,
                    ]}
                  >
                    Vendor
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setCreateRole('User')}
                  style={[
                    styles.segment,
                    createRole === 'User' && styles.segmentActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      createRole === 'User' && styles.segmentTextActive,
                    ]}
                  >
                    User
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleCreateUser}>
                <Ionicons name="save" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700' }}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Floating + button */}
      {isMaster && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setCreateVisible(true)}
        >
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

function EditForm({ user, onSaved }: { user: UserRow; onSaved: () => void }) {
  const [name, setName] = useState<string>(user.full_name || '');
  const [number, setNumber] = useState<string>(user.number || '');
  const [address, setAddress] = useState<string>(user.address || '');
  const [role, setRole] = useState<RoleLabel>(getRoleLabel(user.is_admin));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const ok = await updateUser(Number(user.id), {
        full_name: name.trim() || undefined,
        address: address.trim() || undefined,
        number: number.trim() || undefined,
        is_admin: roleLabelToValue(role),
      });
      if (ok) {
        Alert.alert('Saved', 'User updated');
        onSaved();
      } else {
        Alert.alert('Error', 'Failed to update user');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert('Delete User', 'Are you sure you want to delete this user?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            const ok = await deleteUser(Number(user.id));
            if (ok) {
              Alert.alert('Deleted', 'User removed');
              onSaved();
            } else {
              Alert.alert('Error', 'Failed to delete user');
            }
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={styles.fieldLabel}>Name</Text>
      <TextInput
        style={[styles.input, { marginTop: 6 }]}
        value={name}
        onChangeText={setName}
        placeholder="Full name"
        placeholderTextColor="#999"
      />

      <Text style={styles.fieldLabel}>Phone Number</Text>
      <TextInput
        style={[styles.input, { marginTop: 6 }]}
        value={number}
        onChangeText={setNumber}
        placeholder="Phone number"
        placeholderTextColor="#999"
        keyboardType="number-pad"
      />

      <Text style={styles.fieldLabel}>Role</Text>
      <View
        style={[
          styles.segmented,
          { alignSelf: 'flex-start', marginTop: 6, marginBottom: 12 },
        ]}
      >
        <TouchableOpacity
          onPress={() => setRole('Master')}
          style={[styles.segment, role === 'Master' && styles.segmentActive]}
        >
          <Text style={[styles.segmentText, role === 'Master' && styles.segmentTextActive]}>
            Master
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setRole('Vendor')}
          style={[styles.segment, role === 'Vendor' && styles.segmentActive]}
        >
          <Text style={[styles.segmentText, role === 'Vendor' && styles.segmentTextActive]}>
            Vendor
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setRole('User')}
          style={[styles.segment, role === 'User' && styles.segmentActive]}
        >
          <Text style={[styles.segmentText, role === 'User' && styles.segmentTextActive]}>
            User
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.fieldLabel}>Address</Text>
      <TextInput
        style={[styles.input, { marginTop: 6, minHeight: 90, textAlignVertical: 'top' }]}
        value={address}
        onChangeText={setAddress}
        placeholder="Address"
        placeholderTextColor="#999"
        multiline
      />

      <TouchableOpacity
        disabled={saving}
        onPress={handleSave}
        style={[styles.saveBtn, { opacity: saving ? 0.7 : 1 }]}
      >
        <Ionicons name="save" size={18} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '700' }}>
          {saving ? 'Saving...' : 'Save'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        disabled={saving}
        onPress={handleDelete}
        style={[styles.saveBtn, {
          backgroundColor: '#d32f2f',
          marginTop: 8,
          opacity: saving ? 0.7 : 1,
        }]}
      >
        <Ionicons name="trash" size={18} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '700' }}>
          {saving ? 'Deleting...' : 'Delete User'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  sectionLabel: {
    color: '#2d5016',
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
  },
  card: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  segmented: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#c8e6c9',
    borderRadius: 12,
    overflow: 'hidden',
  },
  segment: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: '#f1f8f4',
  },
  segmentActive: { backgroundColor: '#4caf50' },
  segmentText: { color: '#4caf50', fontWeight: '700' },
  segmentTextActive: { color: '#fff', fontWeight: '800' },
  rolePill: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    fontSize: 10,
    fontWeight: '800',
  },
  rolePillMaster: { backgroundColor: '#eaf6ec', color: '#2d5016' },
  rolePillVendor: { backgroundColor: '#fff3cd', color: '#7a5c00' },
  rolePillSupport: { backgroundColor: '#e3f2fd', color: '#1565c0' },
  saveBtn: {
    backgroundColor: '#4caf50',
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 12,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4caf50',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  fieldLabel: {
    color: '#2d5016',
    fontWeight: '700',
    marginTop: 10,
  },
});
