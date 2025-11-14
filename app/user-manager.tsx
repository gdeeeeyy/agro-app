import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { listUsersBasic, setAdminRole, getUserById, updateUser, deleteUser } from '../lib/database';
import { UserContext } from '../context/UserContext';
import * as Crypto from 'expo-crypto';
import { api, API_URL } from '../lib/api';
import { createAdminCustom } from '../lib/createAdmin';

export default function UserManager() {
  const { user } = useContext(UserContext);
  const isMaster = (user?.is_admin ?? 0) === 2;
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'Master' | 'Vendor' | 'User'>('ALL');
  const [edit, setEdit] = useState<{ visible: boolean; user: any | null }>({ visible: false, user: null });
  // create user state (shown in a modal triggered by + FAB)
  const [createVisible, setCreateVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<0|1|2>(1); // 0=User,1=Vendor,2=Master

  const load = async () => {
    setLoading(true);
    try { const rows = await listUsersBasic() as any[]; setUsers(rows || []); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openEdit = async (u: any) => {
    try { const d = await getUserById(Number(u.id)); setEdit({ visible: true, user: { ...u, address: (d as any)?.address || '' } }); }
    catch { setEdit({ visible: true, user: u }); }
  };

  const filtered = users.filter((u:any) => {
    const q = filter.toLowerCase();
    if (q && !(
      String(u.full_name||'').toLowerCase().includes(q) ||
      String(u.number||'').toLowerCase().includes(q)
    )) {
      return false;
    }
    // Role filter: Master (2), Vendor (1), User (0)
    const r = Number(u.is_admin);
    if (roleFilter === 'Master') return r === 2;
    if (roleFilter === 'Vendor') return r === 1;
    if (roleFilter === 'User') return r === 0;
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Manager</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search & filters (full-screen focus on finding users) */}
      {/* Search users */}
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <Text style={{ color:'#2d5016', fontWeight:'700', marginBottom: 6 }}>Find Users</Text>
        <TextInput style={styles.input} placeholder="Search by name or number" placeholderTextColor="#999" value={filter} onChangeText={setFilter} />
      </View>
      {/* Role filters */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
        <View style={[styles.segmented, { alignSelf:'flex-start' }]}>
          <TouchableOpacity onPress={()=> setRoleFilter('ALL')} style={[styles.segment, roleFilter==='ALL' && styles.segmentActive]}>
            <Text style={[styles.segmentText, roleFilter==='ALL' && styles.segmentTextActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={()=> setRoleFilter('Master')} style={[styles.segment, roleFilter==='Master' && styles.segmentActive]}>
            <Text style={[styles.segmentText, roleFilter==='Master' && styles.segmentTextActive]}>Master</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={()=> setRoleFilter('Vendor')} style={[styles.segment, roleFilter==='Vendor' && styles.segmentActive]}>
            <Text style={[styles.segmentText, roleFilter==='Vendor' && styles.segmentTextActive]}>Vendor</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={()=> setRoleFilter('User')} style={[styles.segment, roleFilter==='User' && styles.segmentActive]}>
            <Text style={[styles.segmentText, roleFilter==='User' && styles.segmentTextActive]}>User</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={{ padding: 16 }}><Text style={{ color:'#666' }}>Loading...</Text></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i)=> String(i.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
          renderItem={({ item }) => {
            const rawRole = Number(item.is_admin);
            const roleLabel = rawRole === 2
              ? 'Master'
              : rawRole === 1
              ? 'Vendor'
              : 'User';
            return (
              <View style={styles.card}>
                <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
                  <View style={{ flex:1 }}>
                    <Text style={{ fontWeight:'700', color:'#2d5016' }}>
                      {(item.full_name || 'User') + ` (${roleLabel})`}
                    </Text>
                    <Text style={{ color:'#666' }}>{item.number}</Text>
                  </View>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                    <Text style={[
                      styles.rolePill,
                      item.is_admin===2 ? styles.rolePillMaster : (item.is_admin===1 ? styles.rolePillVendor : styles.rolePillSupport)
                    ]}>
                      {roleLabel}
                    </Text>
                    {isMaster && (
                      <TouchableOpacity onPress={()=> openEdit(item)} style={{ padding:8, backgroundColor:'#eaf6ec', borderRadius:8 }}>
                        <Ionicons name="create" size={18} color="#2d5016" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                {/* Role can be changed only inside the Edit popup now */}
              </View>
            );
          }}
        />
      )}

      {/* Edit user modal */}
      <Modal visible={edit.visible} transparent animationType="fade" onRequestClose={()=> setEdit({ visible:false, user:null })}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.3)', justifyContent:'center', alignItems:'center' }}>
          <View style={{ width:'92%', backgroundColor:'#fff', borderRadius:16, overflow:'hidden' }}>
            <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:16, borderBottomWidth:1, borderBottomColor:'#e0e0e0' }}>
              <TouchableOpacity onPress={()=> setEdit({ visible:false, user:null })}>
                <Ionicons name="chevron-back" size={22} color="#333" />
              </TouchableOpacity>
              <Text style={{ fontSize:18, fontWeight:'700' }}>Edit User</Text>
              <View style={{ width: 22 }} />
            </View>
            {edit.user && (
              <EditForm user={edit.user} onSaved={async ()=> { setEdit({ visible:false, user:null }); await load(); }} />
            )}
          </View>
        </View>
      </Modal>

      {/* Create user modal triggered by + FAB */}
      <Modal visible={createVisible} transparent animationType="fade" onRequestClose={()=> setCreateVisible(false)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.3)', justifyContent:'center', alignItems:'center' }}>
          <View style={{ width:'92%', backgroundColor:'#fff', borderRadius:16, overflow:'hidden' }}>
            <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:16, borderBottomWidth:1, borderBottomColor:'#e0e0e0' }}>
              <TouchableOpacity onPress={()=> setCreateVisible(false)}>
                <Ionicons name="chevron-back" size={22} color="#333" />
              </TouchableOpacity>
              <Text style={{ fontSize:18, fontWeight:'700' }}>Create User</Text>
              <View style={{ width: 22 }} />
            </View>
            <View style={{ padding:16 }}>
              <TextInput style={[styles.input,{ marginBottom:8 }]} placeholder="Full Name" placeholderTextColor="#999" value={newName} onChangeText={setNewName} />
              <TextInput style={[styles.input,{ marginBottom:8 }]} placeholder="Phone Number" placeholderTextColor="#999" keyboardType="number-pad" value={newNumber} onChangeText={setNewNumber} />
              <TextInput style={[styles.input,{ marginBottom:8 }]} placeholder="Password" placeholderTextColor="#999" secureTextEntry value={newPassword} onChangeText={setNewPassword} />
              <View style={[styles.segmented, { alignSelf:'flex-start', marginTop: 6, marginBottom: 12 }]}>
          <TouchableOpacity onPress={()=> setNewRole(2)} style={[styles.segment, newRole===2 && styles.segmentActive]}>
            <Text style={[styles.segmentText, newRole===2 && styles.segmentTextActive]}>Master</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={()=> setNewRole(1)} style={[styles.segment, newRole===1 && styles.segmentActive]}>
            <Text style={[styles.segmentText, newRole===1 && styles.segmentTextActive]}>Vendor</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={()=> setNewRole(0)} style={[styles.segment, newRole===0 && styles.segmentActive]}>
            <Text style={[styles.segmentText, newRole===0 && styles.segmentTextActive]}>User</Text>
          </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.saveBtn} onPress={async ()=>{
                if (!newNumber || !newPassword || !newName) { Alert.alert('Error','Fill all fields'); return; }
                try {
                  if (newRole === 0) {
                    const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, newPassword);
                    await api.post('/auth/signup', { number: newNumber, password: hashed, full_name: newName });
                  } else {
                    const ok = await createAdminCustom(newNumber, newPassword, newName, newRole as 1|2);
                    if (!ok) throw new Error('create failed');
                  }
                  Alert.alert('Saved','User created');
                  setNewName(''); setNewNumber(''); setNewPassword(''); setNewRole(1);
                  setCreateVisible(false);
                  await load();
                } catch (e:any) {
                  Alert.alert('Error', String(e?.message||'Failed to create user'));
                }
              }}>
                <Ionicons name="save" size={18} color="#fff" />
                <Text style={{ color:'#fff', fontWeight:'700' }}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Floating + button to open create-user modal */}
      <TouchableOpacity style={styles.fab} onPress={()=> setCreateVisible(true)}>
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function EditForm({ user, onSaved }: { user: any; onSaved: () => void }) {
  const [name, setName] = useState<string>(user.full_name || '');
  const [number, setNumber] = useState<string>(user.number || '');
  const [address, setAddress] = useState<string>(user.address || '');
  const [role, setRole] = useState<0|1|2>(
    Number(user.is_admin) === 2 ? 2 : Number(user.is_admin) === 1 ? 1 : 0
  );
  const [saving, setSaving] = useState(false);
  return (
    <View style={{ padding:16 }}>
      <Text style={{ color:'#2d5016', fontWeight:'700' }}>Name</Text>
      <TextInput
        style={[styles.input, { marginTop:6 }]}
        value={name}
        onChangeText={setName}
        placeholder="Full name"
        placeholderTextColor="#999"
      />
      <Text style={{ color:'#2d5016', fontWeight:'700', marginTop:10 }}>Phone Number</Text>
      <TextInput
        style={[styles.input, { marginTop:6 }]}
        value={number}
        onChangeText={setNumber}
        placeholder="Phone number"
        placeholderTextColor="#999"
        keyboardType="number-pad"
      />
      <Text style={{ color:'#2d5016', fontWeight:'700', marginTop:10 }}>Role</Text>
      <View style={[styles.segmented, { alignSelf:'flex-start', marginTop: 6, marginBottom: 12 }]}>
        <TouchableOpacity onPress={()=> setRole(2)} style={[styles.segment, role===2 && styles.segmentActive]}>
          <Text style={[styles.segmentText, role===2 && styles.segmentTextActive]}>Master</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={()=> setRole(1)} style={[styles.segment, role===1 && styles.segmentActive]}>
          <Text style={[styles.segmentText, role===1 && styles.segmentTextActive]}>Vendor</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={()=> setRole(0)} style={[styles.segment, role===0 && styles.segmentActive]}>
          <Text style={[styles.segmentText, role===0 && styles.segmentTextActive]}>User</Text>
        </TouchableOpacity>
      </View>
      <Text style={{ color:'#2d5016', fontWeight:'700', marginTop:10 }}>Address</Text>
      <TextInput
        style={[styles.input, { marginTop:6, minHeight: 90, textAlignVertical:'top' }]}
        value={address}
        onChangeText={setAddress}
        placeholder="Address"
        placeholderTextColor="#999"
        multiline
      />
      <TouchableOpacity
        disabled={saving}
        onPress={async ()=>{
          setSaving(true);
          try {
            const ok = await updateUser(Number(user.id), {
              full_name: name.trim() || undefined,
              address: address.trim() || undefined,
              number: number.trim() || undefined,
              is_admin: role,
            });
            if (ok) {
              Alert.alert('Saved','User updated');
              onSaved();
            } else {
              Alert.alert('Error','Failed to update user');
            }
          } finally {
            setSaving(false);
          }
        }}
        style={[styles.saveBtn, { opacity: saving? 0.7 : 1 }]}
      >
        <Ionicons name="save" size={18} color="#fff" />
        <Text style={{ color:'#fff', fontWeight:'700' }}>{saving? 'Saving...' : 'Save'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        disabled={saving}
        onPress={async ()=>{
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
                    Alert.alert('Deleted','User removed');
                    onSaved();
                  } else {
                    Alert.alert('Error','Failed to delete user');
                  }
                } finally {
                  setSaving(false);
                }
              },
            },
          ]);
        }}
        style={[styles.saveBtn, { backgroundColor:'#d32f2f', marginTop: 8, opacity: saving? 0.7 : 1 }]}
      >
        <Ionicons name="trash" size={18} color="#fff" />
        <Text style={{ color:'#fff', fontWeight:'700' }}>{saving? 'Deleting...' : 'Delete User'}</Text>
      </TouchableOpacity>

      <SafeAreaView />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#4caf50', paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  input: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 12 },
  card: { padding:12, borderWidth:1, borderColor:'#e0e0e0', borderRadius:10, backgroundColor:'#fff', marginBottom:12 },
  segmented: { flexDirection:'row', borderWidth:1, borderColor:'#c8e6c9', borderRadius:12, overflow:'hidden' },
  segment: { paddingVertical:4, paddingHorizontal:12, backgroundColor:'#f1f8f4' },
  segmentActive: { backgroundColor:'#4caf50' },
  segmentText: { color:'#4caf50', fontWeight:'700' },
  segmentTextActive: { color:'#fff', fontWeight:'800' },
  rolePill: { paddingVertical:4, paddingHorizontal:8, borderRadius:10, fontSize:10, fontWeight:'800' },
  rolePillMaster: { backgroundColor:'#eaf6ec', color:'#2d5016' },
  rolePillVendor: { backgroundColor:'#fff3cd', color:'#7a5c00' },
  rolePillSupport: { backgroundColor:'#e3f2fd', color:'#1565c0' },
  saveBtn: { backgroundColor: '#4caf50', paddingVertical: 14, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 12 },
  fab: { position: 'absolute', right: 20, bottom: 30, width: 56, height: 56, borderRadius: 28, backgroundColor: '#4caf50', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
});
