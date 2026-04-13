import React, { useState, useCallback, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, StatusBar, Platform, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchMyTickets, deleteTicketAPI } from '../api/supportApi';
import { AuthContext } from '../context/AuthContext';
import { Ionicons, Feather } from '@expo/vector-icons';

const MyTickets = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userInfo } = useContext(AuthContext);

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');

  const TABS = ['All', 'Open', 'In Progress', 'Resolved', 'Closed'];

  const loadMyTickets = async () => {
    if (!userInfo) return;
    setLoading(true);
    try {
      const data = await fetchMyTickets();
      setTickets(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadMyTickets(); }, [userInfo]));

  const filteredTickets = tickets.filter(t => activeTab === 'All' ? true : t.status === activeTab);

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'Open').length,
    resolved: tickets.filter(t => t.status === 'Resolved').length,
  };

  const confirmDelete = (id) => {
    Alert.alert('Delete Ticket', 'Are you sure you want to delete this ticket? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteTicketAPI(id);
            loadMyTickets();
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        } 
      }
    ]);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Open': return '#3498db';
      case 'In Progress': return '#f39c12';
      case 'Resolved': return '#10ac84';
      case 'Closed': return '#7f8c8d';
      default: return '#1a1a2e';
    }
  };

  const renderTicket = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} 
      activeOpacity={0.8} 
      onPress={() => router.push({ pathname: '/TicketDetails', params: { ticketId: item._id } })}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
          <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
        </View>
        <Text style={styles.timeText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
      
      <Text style={styles.cardTitle} numberOfLines={2}>{item.subject}</Text>
      
      <View style={styles.cardFooter}>
        <Text style={styles.categoryText}>{item.category}</Text>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(item._id)}>
          <Feather name="trash-2" size={16} color="#e74c3c" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (!userInfo) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyTitle}>Please log in</Text>
        <Text style={styles.emptyText}>You need to be logged in to view your tickets.</Text>
        <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/login')}>
          <Text style={styles.loginBtnText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#1a1a2e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Tickets</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#3498db' }]}>{stats.open}</Text>
          <Text style={styles.statLabel}>Open</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#10ac84' }]}>{stats.resolved}</Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>
      </View>

      <View style={styles.tabsContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={TABS}
          keyExtractor={item => item}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.tab, activeTab === item && styles.tabActive]}
              onPress={() => setActiveTab(item)}
            >
              <Text style={[styles.tabText, activeTab === item && styles.tabTextActive]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10ac84" />
        </View>
      ) : filteredTickets.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="receipt-outline" size={64} color="#dfe6e9" />
          <Text style={styles.emptyTitle}>No tickets found</Text>
          <Text style={styles.emptyText}>You haven't created any support tickets yet.</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/CreateTicket')}>
            <Text style={styles.createBtnText}>Create Ticket</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredTickets}
          keyExtractor={(item) => item._id}
          renderItem={renderTicket}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e' },
  
  statsContainer: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 20, marginTop: 20, borderRadius: 16, padding: 20, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }, android: { elevation: 2 } }) },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800', color: '#1a1a2e', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#636e72', fontWeight: '500' },
  statDivider: { width: 1, backgroundColor: '#eee', marginVertical: 8 },

  tabsContainer: { marginVertical: 20 },
  tab: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, marginRight: 10 },
  tabActive: { backgroundColor: '#1a1a2e' },
  tabText: { fontSize: 14, color: '#636e72', fontWeight: '600' },
  tabTextActive: { color: '#fff' },

  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }, android: { elevation: 2 } }), borderWidth: 1, borderColor: '#f1f3f5' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  timeText: { fontSize: 12, color: '#b2bec3' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 16, lineHeight: 22 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f8f9fa', paddingTop: 12 },
  categoryText: { fontSize: 12, color: '#b2bec3', fontWeight: '600' },
  deleteBtn: { padding: 6, backgroundColor: '#fde8e8', borderRadius: 8 },

  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#636e72', textAlign: 'center', marginBottom: 20 },
  createBtn: { backgroundColor: '#10ac84', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  loginBtn: { backgroundColor: '#3498db', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

export default MyTickets;
