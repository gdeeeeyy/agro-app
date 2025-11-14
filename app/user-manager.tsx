import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { listUsersBasic, setAdminRole, getUserById, updateUser } from '../lib/database';
import * as Crypto from 'expo-crypto';
import { api, API_URL } from '../lib/api';
import { createAdminCustom } from '../lib/createAdmin';

export default function UserManager() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [edit, setEdit] = useState<{ visible: boolean; user: any | null }>({ visible: false, user: null });
  // create user state
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
    const q = filter.toLowerCase(); if (!q) return true;
    return String(u.full_name||'').toLowerCase().includes(q) || String(u.number||'').toLowerCase().includes(q);
  });

  return (
    <View style={styles.container}>
      <SafeAreaView />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Manager</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Create User (top) */}
      <View style={{ paddingHorizontal:16, paddingBottom: 8, paddingTop: 12 }}>
        <Text style={{ color:'#2d5016', fontWeight:'700', marginBottom: 8 }}>Create User</Text>
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
            await load();
          } catch (e:any) {
            Alert.alert('Error', String(e?.message||'Failed to create user'));
          }
        }}>
          <Ionicons name="save" size={18} color="#fff" />
          <Text style={{ color:'#fff', fontWeight:'700' }}>Create</Text>
        </TouchableOpacity>
      </View>

      {/* Search users */}
      <View style={{ padding: 16 }}>
        <Text style={{ color:'#2d5016', fontWeight:'700', marginBottom: 6 }}>Find Users</Text>
        <TextInput style={styles.input} placeholder="Search by name or number" placeholderTextColor="#999" value={filter} onChangeText={setFilter} />
      </View>

      {loading ? (
        <View style={{ padding: 16 }}><Text style={{ color:'#666' }}>Loading...</Text></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i)=> String(i.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
                <View style={{ flex:1 }}>
                  <Text style={{ fontWeight:'700', color:'#2d5016' }}>{item.full_name || 'User'}</Text>
                  <Text style={{ color:'#666' }}>{item.number}</Text>
                </View>
                <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                  <Text style={[styles.rolePill, item.is_admin===2 ? styles.rolePillMaster : (item.is_admin===3 ? styles.rolePillSupport : styles.rolePillVendor)]}>{item.is_admin===2 ? 'MASTER' : (item.is_admin===3 ? 'SUPPORT' : (item.is_admin===1 ? 'VENDOR' : 'USER'))}</Text>
                  <TouchableOpacity onPress={()=> openEdit(item)} style={{ padding:8, backgroundColor:'#eaf6ec', borderRadius:8 }}>
                    <Ionicons name="create" size={18} color="#2d5016" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={[styles.segmented, { marginTop:10, alignSelf:'flex-start' }]}>
                <TouchableOpacity onPress={async ()=>{ await setAdminRole(Number(item.id), 2); await load(); }} style={[styles.segment, item.is_admin===2 && styles.segmentActive]}>
                  <Text style={[styles.segmentText, item.is_admin===2 && styles.segmentTextActive]}>Master</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={async ()=>{ await setAdminRole(Number(item.id), 1); await load(); }} style={[styles.segment, item.is_admin===1 && styles.segmentActive]}>
                  <Text style={[styles.segmentText, item.is_admin===1 && styles.segmentTextActive]}>Vendor</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={async ()=>{ await setAdminRole(Number(item.id), 0); await load(); }} style={[styles.segment, item.is_admin===0 && styles.segmentActive]}>
                  <Text style={[styles.segmentText, item.is_admin===0 && styles.segmentTextActive]}>User</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

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
    </View>
  );
}

function EditForm({ user, onSaved }: { user: any; onSaved: () => void }) {
  const [name, setName] = useState<string>(user.full_name || '');
  const [address, setAddress] = useState<string>(user.address || '');
  const [saving, setSaving] = useState(false);
  return (
    <View style={{ padding:16 }}>
      <Text style={{ color:'#2d5016', fontWeight:'700' }}>Name</Text>
      <TextInput style={[styles.input, { marginTop:6 }]} value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor="#999" />
      <Text style={{ color:'#2d5016', fontWeight:'700', marginTop:10 }}>Address</Text>
      <TextInput style={[styles.input, { marginTop:6, minHeight: 90, textAlignVertical:'top' }]} value={address} onChangeText={setAddress} placeholder="Address" placeholderTextColor="#999" multiline />
      <TouchableOpacity disabled={saving} onPress={async ()=>{ setSaving(true); try { const ok = await updateUser(Number(user.id), { full_name: name.trim() || undefined, address: address.trim() || undefined }); if (ok) { Alert.alert('Saved','User updated'); onSaved(); } else { Alert.alert('Error','Failed to update user'); } } finally { setSaving(false); } }} style={[styles.saveBtn, { opacity: saving? 0.7 : 1 }]}>
        <Ionicons name="save" size={18} color="#fff" />
        <Text style={{ color:'#fff', fontWeight:'700' }}>{saving? 'Saving...' : 'Save'}</Text>
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
});
