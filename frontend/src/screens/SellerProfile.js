import React, { useState, useEffect, useContext } from 'react';
import { View, Text, FlatList, Image, StyleSheet, ActivityIndicator, TouchableOpacity, Platform, Modal, TextInput, Alert, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { resolveImageUrl } from '../api/marketplaceApi';
import { updateProfileAPI } from '../api/authApi';
import { AuthContext } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const SellerProfile = () => {
  const { userInfo, loginWithToken } = useContext(AuthContext);
  const { sellerId, sellerName, sellerPhone } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [seller, setSeller] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = userInfo?._id === sellerId;

  // Edit Modal State
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', password: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadSeller(); }, [sellerId]);

  const loadSeller = async () => {
    try {
      const API = 'https://all-in-one-vehicle-solutions-platform.onrender.com/api/marketplace';
      const res = await fetch(`${API}?sellerId=${sellerId}`);
      const data = await res.json();
      setListings(data);
      if (data.length > 0) setSeller(data[0].sellerId);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fmt = (p) => `Rs. ${Number(p).toLocaleString()}`;

  const openEditModal = () => {
    setEditForm({ name: displaySeller.name || '', phone: displaySeller.phone || '', password: '' });
    setIsEditModalVisible(true);
  };

  const handleUpdateProfile = async () => {
    if (!editForm.name || !editForm.phone) {
      Alert.alert('Validation Error', 'Name and phone number are required.');
      return;
    }

    setSaving(true);
    try {
      const payload = { name: editForm.name, phone: editForm.phone };
      if (editForm.password.trim().length > 0) payload.password = editForm.password;

      const updatedUser = await updateProfileAPI(payload);
      await loginWithToken(updatedUser);
      setSeller(updatedUser); // Update local state to reflect new name/phone instantly
      setIsEditModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('Update Failed', error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#10ac84" /></View>;

  const displaySeller = seller || { name: sellerName || 'Unknown Seller', phone: sellerPhone || '' };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.profileCard}>
        <View style={s.avatar}><Ionicons name="person" size={32} color="#fff" /></View>
        <Text style={s.name}>{displaySeller.name}</Text>
        <Text style={s.phone}>{displaySeller.phone}</Text>
        <Text style={s.count}>{listings.length} listing{listings.length !== 1 ? 's' : ''}</Text>
        
        {isOwnProfile && (
          <TouchableOpacity style={s.editBtn} activeOpacity={0.8} onPress={openEditModal}>
            <Ionicons name="create-outline" size={16} color="#fff" />
            <Text style={s.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={listings}
        keyExtractor={i => i._id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Ionicons name="car-outline" size={48} color="#b2bec3" />
            <Text style={{ marginTop: 12, fontSize: 16, color: '#636e72', fontWeight: '500' }}>No active listings</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => router.push({ pathname: '/ListingDetails', params: { listingId: item._id } })}>
            <Image source={{ uri: item.images?.length ? resolveImageUrl(item.images[0]) : 'https://via.placeholder.com/120x90' }} style={s.thumb} />
            <View style={s.info}>
              <Text style={s.title} numberOfLines={1}>{item.year} {item.make} {item.model}</Text>
              <Text style={s.price}>{fmt(item.price)}</Text>
              <Text style={s.loc}>{item.location}</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Edit Profile Modal */}
      <Modal visible={isEditModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsEditModalVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#f8f9fa' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={() => setIsEditModalVisible(false)} style={s.modalCloseBtn}>
              <Ionicons name="close" size={24} color="#1a1a2e" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalContent}>
            <Text style={s.label}>Full Name</Text>
            <TextInput style={s.input} value={editForm.name} onChangeText={val => setEditForm(p => ({...p, name: val}))} placeholder="Your name" />
            
            <Text style={s.label}>Phone Number</Text>
            <TextInput style={s.input} value={editForm.phone} onChangeText={val => setEditForm(p => ({...p, phone: val}))} placeholder="Your phone number" keyboardType="phone-pad" />
            
            <Text style={s.label}>New Password (Optional)</Text>
            <TextInput style={s.input} value={editForm.password} onChangeText={val => setEditForm(p => ({...p, password: val}))} placeholder="Leave blank to keep current" secureTextEntry />
            
            <TouchableOpacity style={[s.saveBtn, saving && {opacity: 0.7}]} onPress={handleUpdateProfile} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save Changes</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profileCard: { alignItems: 'center', padding: 30, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#10ac84', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  name: { fontSize: 20, fontWeight: '800', color: '#1a1a2e' },
  phone: { fontSize: 14, color: '#636e72', marginTop: 4 },
  count: { fontSize: 13, color: '#b2bec3', marginTop: 8 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10 }, android: { elevation: 3 } }) },
  thumb: { width: 90, height: 70, borderRadius: 12, resizeMode: 'cover', marginRight: 14 },
  info: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  price: { fontSize: 16, fontWeight: '800', color: '#10ac84', marginBottom: 2 },
  loc: { fontSize: 12, color: '#636e72' },

  editBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10ac84', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginTop: 14, gap: 6 },
  editBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a2e' },
  modalCloseBtn: { padding: 4 },
  modalContent: { padding: 20 },
  label: { fontSize: 13, fontWeight: '700', color: '#2d3436', marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dfe6e9', borderRadius: 10, paddingHorizontal: 14, height: 48, fontSize: 15, color: '#1a1a2e' },
  saveBtn: { backgroundColor: '#10ac84', height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 30 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default SellerProfile;
