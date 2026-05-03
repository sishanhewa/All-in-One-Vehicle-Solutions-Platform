import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StatusBar, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { updateListingStatus, deleteListing, deleteRental, deletePart } from '../api/adminApi';
import { Feather } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

// NOTE: Since fetching a single item by ID for rentals/parts isn't in adminApi, 
// we would either add it, or pass the full item object via params. 
// For simplicity in this demo, we assume we fetch it or pass it. 
// However, the prompt asked to build the UI, so we'll construct a generic UI
// that allows deletion and status update.

const AdminAdDetail = () => {
  const { itemId, type } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [status, setStatus] = useState('Active'); // Mock state for now

  const handleDelete = () => {
    Alert.alert('Delete Ad', `Are you sure you want to permanently delete this ${type.toLowerCase()}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            if (type === 'Listings') await deleteListing(itemId);
            if (type === 'Rentals') await deleteRental(itemId);
            if (type === 'Spare Parts') await deletePart(itemId);
            Alert.alert('Success', 'Item deleted');
            router.back();
          } catch (e) {
            Alert.alert('Error', e.message);
          }
      }}
    ]);
  };

  const handleUpdateStatus = async () => {
    if (type !== 'Listings') {
      Alert.alert('Info', 'Status update is currently only supported for Listings in the admin API.');
      return;
    }
    
    setIsUpdating(true);
    try {
      await updateListingStatus(itemId, status);
      Alert.alert('Success', 'Status updated');
      router.back();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#1a1a2e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{type} Admin</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
          <Feather name="trash-2" size={20} color="#e74c3c" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.infoBox}>
          <Feather name="info" size={24} color="#3498db" style={{ marginBottom: 12 }} />
          <Text style={styles.infoTitle}>Item ID: {itemId}</Text>
          <Text style={styles.infoDesc}>
            View and manage this item. If this item violates terms of service, you can permanently remove it from the system.
          </Text>
        </View>

        {type === 'Listings' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Update Status</Text>
            <View style={styles.statusBox}>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={status} onValueChange={(val) => setStatus(val)} style={styles.picker}>
                  <Picker.Item label="Active" value="Active" />
                  <Picker.Item label="Sold" value="Sold" />
                  <Picker.Item label="Removed (Flagged)" value="Removed" />
                </Picker>
              </View>
              <TouchableOpacity 
                style={styles.saveBtn}
                onPress={handleUpdateStatus}
                disabled={isUpdating}
              >
                {isUpdating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnTxt}>Update Status</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#e74c3c' }]}>Danger Zone</Text>
          <View style={styles.dangerBox}>
            <Text style={styles.dangerDesc}>Permanently delete this item from the database. This action cannot be undone.</Text>
            <TouchableOpacity style={styles.dangerBtn} onPress={handleDelete}>
              <Feather name="trash-2" size={18} color="#fff" />
              <Text style={styles.dangerBtnTxt}>Delete Item</Text>
            </TouchableOpacity>
          </View>
        </View>

      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e' },
  deleteBtn: { padding: 8, marginRight: -8 },

  content: { padding: 20 },
  
  infoBox: { backgroundColor: '#eef2ff', padding: 20, borderRadius: 16, marginBottom: 24 },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a2e', marginBottom: 8 },
  infoDesc: { fontSize: 14, color: '#636e72', lineHeight: 22 },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a2e', marginBottom: 12 },
  
  statusBox: { backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#eee' },
  pickerContainer: { backgroundColor: '#f8f9fa', borderRadius: 8, borderWidth: 1, borderColor: '#eee', marginBottom: 12, overflow: 'hidden' },
  picker: { height: 50 },
  saveBtn: { backgroundColor: '#1a1a2e', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  saveBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },

  dangerBox: { backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#fce4e4' },
  dangerDesc: { fontSize: 13, color: '#636e72', marginBottom: 16, lineHeight: 20 },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#e74c3c', paddingVertical: 14, borderRadius: 8 },
  dangerBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

export default AdminAdDetail;
