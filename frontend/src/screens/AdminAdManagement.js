import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchListings, fetchRentals, fetchParts } from '../api/adminApi';
import { Feather, Ionicons } from '@expo/vector-icons';

const TABS = ['Listings', 'Rentals', 'Spare Parts'];

const AdminAdManagement = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [activeTab, setActiveTab] = useState('Listings');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async (tab = activeTab) => {
    setLoading(true);
    try {
      let data = [];
      if (tab === 'Listings') {
        data = await fetchListings();
      } else if (tab === 'Rentals') {
        data = await fetchRentals();
      } else if (tab === 'Spare Parts') {
        data = await fetchParts();
      }
      setItems(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    loadData(tab);
  };

  const getStatusColor = (status) => {
    if (status === 'Active') return '#10ac84';
    if (status === 'Sold') return '#e67e22';
    if (status === 'Removed' || status === 'Flagged') return '#e74c3c';
    return '#3498db'; // default or 'In Stock'
  };

  const renderItemCard = ({ item }) => {
    // Normalize data fields since we have 3 different models
    const isListing = activeTab === 'Listings';
    const isRental = activeTab === 'Rentals';
    
    const title = isListing ? item.title : (isRental ? `${item.make} ${item.model}` : item.title);
    const owner = isListing ? item.sellerId?.name : (isRental ? item.owner?.name : item.sellerId?.name);
    const status = isListing ? item.status : (isRental ? (item.availability ? 'Active' : 'Rented') : item.availability);
    const price = isListing ? `LKR ${item.price}` : (isRental ? `LKR ${item.shortTermDailyRate}/day` : `LKR ${item.price}`);

    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: '/AdminAdDetail', params: { itemId: item._id, type: activeTab } })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
          <View style={[styles.badge, { backgroundColor: getStatusColor(status) + '15' }]}>
            <Text style={[styles.badgeTxt, { color: getStatusColor(status) }]}>{status}</Text>
          </View>
        </View>
        <Text style={styles.price}>{price}</Text>
        <View style={styles.cardFooter}>
          <View style={styles.userRow}>
            <Feather name="user" size={14} color="#b2bec3" />
            <Text style={styles.userTxt}>{owner || 'Unknown'}</Text>
          </View>
          <Text style={styles.dateTxt}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#1a1a2e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ad Management</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabsContainer}>
        {TABS.map(tab => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => handleTabChange(tab)}
          >
            <Text style={[styles.tabTxt, activeTab === tab && styles.tabTxtActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10ac84" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centerContainer}>
          <Feather name="grid" size={48} color="#dfe6e9" />
          <Text style={styles.emptyText}>No {activeTab.toLowerCase()} found.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item._id}
          renderItem={renderItemCard}
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
  
  tabsContainer: { flexDirection: 'row', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#10ac84' },
  tabTxt: { fontSize: 14, fontWeight: '600', color: '#b2bec3' },
  tabTxtActive: { color: '#10ac84', fontWeight: '700' },

  listContent: { padding: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }, android: { elevation: 2 } }) },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', flex: 1, marginRight: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  price: { fontSize: 15, fontWeight: '800', color: '#10ac84', marginBottom: 12 },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f8f9fa', paddingTop: 12 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userTxt: { fontSize: 13, color: '#636e72', fontWeight: '500' },
  dateTxt: { fontSize: 12, color: '#b2bec3' },
  
  emptyText: { marginTop: 16, fontSize: 15, color: '#b2bec3' }
});

export default AdminAdManagement;
