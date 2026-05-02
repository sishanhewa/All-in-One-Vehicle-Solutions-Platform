import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchTickets } from '../api/adminApi';
import { Feather } from '@expo/vector-icons';

const AdminTicketManagement = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Open'); // 'All', 'Open', 'In Progress', 'Resolved', 'Closed'

  const TABS = ['All', 'Open', 'In Progress', 'Resolved', 'Closed'];

  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await fetchTickets();
      // Server returns all tickets ordered by newest. 
      // We'll filter on the client for this tabbed view.
      setTickets(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadTickets(); }, []));

  const filteredTickets = tickets.filter(t => activeTab === 'All' ? true : t.status === activeTab);

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'Urgent': return '#e74c3c';
      case 'High': return '#e67e22';
      case 'Medium': return '#f39c12';
      case 'Low': return '#10ac84';
      default: return '#3498db';
    }
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
      onPress={() => router.push({ pathname: '/AdminTicketDetail', params: { ticketId: item._id } })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.badgesRow}>
          <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
            <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: getPriorityColor(item.priority) + '15' }]}>
            <Text style={[styles.badgeText, { color: getPriorityColor(item.priority) }]}>{item.priority}</Text>
          </View>
        </View>
        <Text style={styles.timeText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
      
      <Text style={styles.cardTitle} numberOfLines={2}>{item.subject}</Text>
      
      <View style={styles.cardFooter}>
        <View style={styles.userRow}>
          <Feather name="user" size={14} color="#636e72" />
          <Text style={styles.userText}>{item.userId?.name || 'Unknown User'}</Text>
        </View>
        <Text style={styles.categoryText}>{item.category}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#1a1a2e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support Queue</Text>
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
      ) : filteredTickets.length === 0 ? (
        <View style={styles.centerContainer}>
          <Feather name="inbox" size={48} color="#dfe6e9" />
          <Text style={styles.emptyText}>No {activeTab.toLowerCase()} tickets found.</Text>
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
  badgesRow: { flexDirection: 'row', gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  timeText: { fontSize: 12, color: '#b2bec3' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 16, lineHeight: 22 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f8f9fa', paddingTop: 12 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userText: { fontSize: 13, color: '#636e72', fontWeight: '500' },
  categoryText: { fontSize: 12, color: '#b2bec3', fontWeight: '600' },

  emptyText: { marginTop: 16, fontSize: 15, color: '#b2bec3' }
});

export default AdminTicketManagement;
