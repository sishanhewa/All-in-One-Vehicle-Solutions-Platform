import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchUserById, updateUserRole, deleteUser } from '../api/adminApi';
import { Feather } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

const AdminUserDetail = () => {
  const { userId } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const loadData = async () => {
    try {
      const response = await fetchUserById(userId);
      setData(response);
      setSelectedRole(response.user.role);
    } catch (error) {
      Alert.alert('Error', 'Failed to load user details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { if (userId) loadData(); }, [userId]));

  const handleRoleUpdate = async () => {
    if (selectedRole === data.user.role) return;
    setIsUpdating(true);
    try {
      await updateUserRole(userId, selectedRole);
      Alert.alert('Success', 'User role updated');
      loadData();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete User', 'Are you sure you want to permanently delete this user?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteUser(userId);
            router.back();
          } catch (e) {
            Alert.alert('Error', e.message);
          }
      }}
    ]);
  };

  if (loading || !data) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#10ac84" />
      </View>
    );
  }

  const { user, stats } = data;

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#1a1a2e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Details</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
          <Feather name="trash-2" size={20} color="#e74c3c" />
        </TouchableOpacity>
      </View>

      <View style={styles.profileSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTxt}>{user.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <Text style={styles.phone}>{user.phone}</Text>
        <Text style={styles.joinDate}>Joined {new Date(user.createdAt).toLocaleDateString()}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activity Overview</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{stats.listings}</Text>
            <Text style={styles.statLabel}>Listings</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{stats.rentals}</Text>
            <Text style={styles.statLabel}>Rentals</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{stats.parts}</Text>
            <Text style={styles.statLabel}>Parts</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{stats.tickets}</Text>
            <Text style={styles.statLabel}>Tickets</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Role Management</Text>
        <View style={styles.roleBox}>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedRole}
              onValueChange={(val) => setSelectedRole(val)}
              style={styles.picker}
            >
              <Picker.Item label="User" value="User" />
              <Picker.Item label="Inspection Company" value="InspectionCompany" />
              <Picker.Item label="Admin" value="Admin" />
            </Picker>
          </View>
          <TouchableOpacity 
            style={[styles.saveBtn, selectedRole === user.role && styles.saveBtnDisabled]}
            onPress={handleRoleUpdate}
            disabled={selectedRole === user.role || isUpdating}
          >
            {isUpdating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnTxt}>Update Role</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {user.role === 'InspectionCompany' && user.companyProfile && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company Profile</Text>
          <View style={styles.companyBox}>
            <Text style={styles.cLabel}>Company Name:</Text>
            <Text style={styles.cValue}>{user.companyProfile.companyName || 'N/A'}</Text>
            
            <Text style={styles.cLabel}>Address:</Text>
            <Text style={styles.cValue}>{user.companyProfile.address || 'N/A'}</Text>

            <Text style={styles.cLabel}>Verification Status:</Text>
            <Text style={[styles.cValue, { color: user.companyProfile.isVerified ? '#10ac84' : '#e74c3c' }]}>
              {user.companyProfile.isVerified ? 'Verified' : 'Unverified'}
            </Text>
          </View>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e' },
  deleteBtn: { padding: 8, marginRight: -8 },

  profileSection: { backgroundColor: '#fff', padding: 30, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#3498db', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarTxt: { fontSize: 32, color: '#fff', fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '800', color: '#1a1a2e', marginBottom: 4 },
  email: { fontSize: 15, color: '#636e72', marginBottom: 4 },
  phone: { fontSize: 14, color: '#636e72', marginBottom: 8 },
  joinDate: { fontSize: 12, color: '#b2bec3' },

  section: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a2e', marginBottom: 12 },
  
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statBox: { width: '48%', backgroundColor: '#fff', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  statVal: { fontSize: 20, fontWeight: '800', color: '#10ac84', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#636e72', fontWeight: '600' },

  roleBox: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
  pickerContainer: { backgroundColor: '#f8f9fa', borderRadius: 8, borderWidth: 1, borderColor: '#eee', marginBottom: 12, overflow: 'hidden' },
  picker: { height: 50 },
  saveBtn: { backgroundColor: '#1a1a2e', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  saveBtnDisabled: { backgroundColor: '#b2bec3' },
  saveBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },

  companyBox: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
  cLabel: { fontSize: 12, color: '#b2bec3', marginBottom: 4 },
  cValue: { fontSize: 15, color: '#1a1a2e', fontWeight: '500', marginBottom: 12 },
});

export default AdminUserDetail;
