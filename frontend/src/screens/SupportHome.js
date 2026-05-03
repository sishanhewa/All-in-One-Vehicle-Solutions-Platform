import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, StatusBar, Platform, LayoutAnimation } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchTickets } from '../api/supportApi';
import { Ionicons, Feather } from '@expo/vector-icons';

const CATEGORIES = ['All Categories', 'Vehicle Listing Issue', 'Rental Dispute', 'Spare Part Complaint', 'Inspection Problem', 'Payment Issue', 'Account Issue', 'App Bug', 'Other'];
const STATUSES = ['All Status', 'Open', 'In Progress', 'Resolved', 'Closed'];
const PRIORITIES = ['All Priorities', 'Low', 'Medium', 'High', 'Urgent'];

const SupportHome = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [filters, setFilters] = useState({
    category: 'All Categories',
    status: 'All Status',
    priority: 'All Priorities',
  });

  const loadTickets = async (customFilters = null, currentSearch = searchQuery) => {
    setLoading(true);
    try {
      const f = customFilters || filters;
      const params = {
        category: f.category === 'All Categories' ? '' : f.category,
        status: f.status === 'All Status' ? '' : f.status,
        priority: f.priority === 'All Priorities' ? '' : f.priority,
        search: currentSearch
      };
      const data = await fetchTickets(params);
      setTickets(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadTickets(); }, []));

  const toggleAdvanced = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowAdvanced(!showAdvanced);
  };

  const updateFilter = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    loadTickets(newFilters);
  };

  const onSearchSubmit = () => {
    loadTickets(filters, searchQuery);
  };

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
      onPress={() => router.push({ pathname: '/TicketDetails', params: { ticketId: item._id } })}
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
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Support Center</Text>
          <TouchableOpacity onPress={toggleAdvanced} style={styles.filterBtn}>
            <Ionicons name="options" size={24} color={showAdvanced ? "#10ac84" : "#1a1a2e"} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#b2bec3" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tickets by subject..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={onSearchSubmit}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => { setSearchQuery(''); loadTickets(filters, ''); }}>
              <Ionicons name="close-circle" size={20} color="#b2bec3" />
            </TouchableOpacity>
          ) : null}
        </View>

        {showAdvanced && (
          <View style={styles.advancedFilters}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Status</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={STATUSES}
                keyExtractor={item => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.chip, filters.status === item && styles.chipActive]}
                    onPress={() => updateFilter('status', item)}
                  >
                    <Text style={[styles.chipText, filters.status === item && styles.chipTextActive]}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Priority</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={PRIORITIES}
                keyExtractor={item => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.chip, filters.priority === item && styles.chipActive]}
                    onPress={() => updateFilter('priority', item)}
                  >
                    <Text style={[styles.chipText, filters.priority === item && styles.chipTextActive]}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        )}

        <View style={styles.categoriesScroll}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={CATEGORIES}
            keyExtractor={item => item}
            contentContainerStyle={{ paddingHorizontal: 20 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.categoryPill, filters.category === item && styles.categoryPillActive]}
                onPress={() => updateFilter('category', item)}
              >
                <Text style={[styles.categoryPillText, filters.category === item && styles.categoryPillTextActive]}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10ac84" />
        </View>
      ) : tickets.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color="#dfe6e9" />
          <Text style={styles.emptyTitle}>No tickets found</Text>
          <Text style={styles.emptyText}>Try adjusting your filters or search query.</Text>
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item._id}
          renderItem={renderTicket}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB for Create Ticket */}
      <TouchableOpacity 
        style={styles.fab} 
        activeOpacity={0.8}
        onPress={() => router.push('/CreateTicket')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { backgroundColor: '#fff', paddingTop: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1a1a2e', letterSpacing: -0.5 },
  filterBtn: { padding: 8, backgroundColor: '#f8f9fa', borderRadius: 12 },
  
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f3f5', marginHorizontal: 20, borderRadius: 12, paddingHorizontal: 16, height: 48, marginBottom: 16 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: '#1a1a2e' },
  
  advancedFilters: { paddingHorizontal: 20, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#f1f3f5', paddingTop: 16 },
  filterGroup: { marginBottom: 12 },
  filterLabel: { fontSize: 13, fontWeight: '600', color: '#636e72', marginBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f1f3f5', marginRight: 8, borderWidth: 1, borderColor: '#eee' },
  chipActive: { backgroundColor: '#e8f8f5', borderColor: '#10ac84' },
  chipText: { fontSize: 13, color: '#636e72', fontWeight: '500' },
  chipTextActive: { color: '#10ac84', fontWeight: '700' },

  categoriesScroll: { borderTopWidth: 1, borderTopColor: '#f1f3f5', paddingVertical: 12 },
  categoryPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dfe6e9', marginRight: 10 },
  categoryPillActive: { backgroundColor: '#1a1a2e', borderColor: '#1a1a2e' },
  categoryPillText: { fontSize: 14, color: '#636e72', fontWeight: '500' },
  categoryPillTextActive: { color: '#fff', fontWeight: '600' },

  listContent: { padding: 16, paddingBottom: 100 },
  
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

  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#636e72', textAlign: 'center' },

  fab: { position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#10ac84', justifyContent: 'center', alignItems: 'center', ...Platform.select({ ios: { shadowColor: '#10ac84', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }, android: { elevation: 6 } }) },
});

export default SupportHome;
