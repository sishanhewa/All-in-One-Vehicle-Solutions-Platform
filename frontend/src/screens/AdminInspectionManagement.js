import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchInspections } from '../api/adminApi';
import { Feather } from '@expo/vector-icons';

const TABS = ['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled'];

const AdminInspectionManagement = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');

  const loadBookings = async () => {
    setLoading(true);
    try {
      const data = await fetchInspections();
      setBookings(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadBookings(); }, []));

  const filteredBookings = bookings.filter(b => activeTab === 'All' ? true : b.status === activeTab);

  const getStatusColor = (status) => {
    switch(status) {
      case 'Pending': return '#f39c12';
      case 'Confirmed': return '#3498db';
      case 'Completed': return '#10ac84';
      case 'Cancelled': return '#e74c3c';
      default: return '#1a1a2e';
    }
  };

  const renderBooking = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.vehicleInfo?.make} {item.vehicleInfo?.model}</Text>
        <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
          <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>
      
      <View style={styles.infoRow}>
        <Feather name="shield" size={14} color="#636e72" />
        <Text style={styles.infoText}>{item.companyId?.companyProfile?.companyName || 'Unknown Company'}</Text>
      </View>
      
      <View style={styles.infoRow}>
        <Feather name="user" size={14} color="#636e72" />
        <Text style={styles.infoText}>Booked by: {item.userId?.name || 'Unknown User'}</Text>
      </View>
      
      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#1a1a2e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inspections Oversight</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabsWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={TABS}
          keyExtractor={item => item}
          contentContainerStyle={styles.tabsContainer}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.tab, activeTab === item && styles.tabActive]}
              onPress={() => setActiveTab(item)}
            >
              <Text style={[styles.tabTxt, activeTab === item && styles.tabTxtActive]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10ac84" />
        </View>
      ) : filteredBookings.length === 0 ? (
        <View style={styles.centerContainer}>
          <Feather name="search" size={48} color="#dfe6e9" />
          <Text style={styles.emptyText}>No {activeTab.toLowerCase()} bookings found.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item._id}
          renderItem={renderBooking}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e' },
  
  tabsWrapper: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 12 },
  tabsContainer: { paddingHorizontal: 16, gap: 10 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#eee' },
  tabActive: { backgroundColor: '#1a1a2e', borderColor: '#1a1a2e' },
  tabTxt: { fontSize: 13, fontWeight: '600', color: '#636e72' },
  tabTxtActive: { color: '#fff' },

  listContent: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }, android: { elevation: 2 } }), borderWidth: 1, borderColor: '#f1f3f5' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  infoText: { fontSize: 13, color: '#636e72', fontWeight: '500' },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: '#f8f9fa', paddingTop: 12, marginTop: 6 },
  dateText: { fontSize: 12, color: '#b2bec3' },

  emptyText: { marginTop: 16, fontSize: 15, color: '#b2bec3' }
});

export default AdminInspectionManagement;
