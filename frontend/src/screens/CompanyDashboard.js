import React, { useState, useCallback, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { fetchCompanyQueue, confirmBookingAPI, startInspectionAPI } from '../api/inspectionApi';
import { AuthContext } from '../context/AuthContext';
import { Feather, Ionicons } from '@expo/vector-icons';

const FILTER_TABS = ['All', 'Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'];
const DATE_TABS = ['all', 'today', 'week'];
const DATE_LABELS = { all: 'All Time', today: 'Today', week: 'This Week' };

const STATUS_COLORS = {
  'Pending': { bg: '#fef9f0', text: '#e67e22', icon: 'clock' },
  'Confirmed': { bg: '#eef6ff', text: '#3498db', icon: 'check-circle' },
  'In Progress': { bg: '#fff5ed', text: '#f39c12', icon: 'tool' },
  'Completed': { bg: '#f0faf7', text: '#10ac84', icon: 'check' },
  'Cancelled': { bg: '#fff0f0', text: '#e74c3c', icon: 'x-circle' },
};

const CompanyDashboard = () => {
  const router = useRouter();
  const { userInfo } = useContext(AuthContext);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('all');
  const [stats, setStats] = useState({ today: 0, pending: 0, inProgress: 0, completed: 0 });

  useFocusEffect(
    useCallback(() => {
      if (userInfo) loadQueue();
    }, [userInfo, statusFilter, dateFilter])
  );

  const loadQueue = async () => {
    setLoading(true);
    try {
      const data = await fetchCompanyQueue({ status: statusFilter, date: dateFilter });
      setQueue(data);

      // Stats from unfiltered data
      if (statusFilter === 'All' && dateFilter === 'all') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        setStats({
          today: data.filter(b => new Date(b.appointmentDate) >= today).length,
          pending: data.filter(b => b.status === 'Pending').length,
          inProgress: data.filter(b => b.status === 'In Progress').length,
          completed: data.filter(b => b.status === 'Completed').length,
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Could not fetch queue');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (id) => {
    try {
      await confirmBookingAPI(id);
      Alert.alert('Confirmed!', 'The booking has been confirmed.');
      loadQueue();
    } catch (error) {
      Alert.alert('Failed', error.message);
    }
  };

  const handleStart = async (id) => {
    try {
      await startInspectionAPI(id);
      Alert.alert('Started!', 'Inspection is now in progress.');
      loadQueue();
    } catch (error) {
      Alert.alert('Failed', error.message);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderBooking = ({ item }) => {
    const statusStyle = STATUS_COLORS[item.status] || STATUS_COLORS['Pending'];

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.customerName}>{item.userId?.name || 'Customer'}</Text>
            <Text style={styles.vehicleText}>{item.vehicleInfo?.year} {item.vehicleInfo?.make} {item.vehicleInfo?.model} · {item.vehicleInfo?.plateNumber}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Feather name={statusStyle.icon} size={12} color={statusStyle.text} />
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Feather name="package" size={13} color="#636e72" />
            <Text style={styles.metaText}>{item.packageId?.name}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={13} color="#636e72" />
            <Text style={styles.metaText}>{formatDate(item.appointmentDate)} · {item.appointmentTime}</Text>
          </View>
          {item.userId?.phone && (
            <View style={styles.metaItem}>
              <Feather name="phone" size={13} color="#636e72" />
              <Text style={styles.metaText}>{item.userId.phone}</Text>
            </View>
          )}
        </View>

        {/* Actions based on status */}
        <View style={styles.actions}>
          {item.status === 'Pending' && (
            <TouchableOpacity style={styles.confirmBtn} activeOpacity={0.7} onPress={() => handleConfirm(item._id)}>
              <Feather name="check" size={15} color="#fff" />
              <Text style={styles.actionBtnText}>Confirm</Text>
            </TouchableOpacity>
          )}
          {item.status === 'Confirmed' && (
            <TouchableOpacity style={styles.startBtn} activeOpacity={0.7} onPress={() => handleStart(item._id)}>
              <Feather name="play" size={15} color="#fff" />
              <Text style={styles.actionBtnText}>Start Inspection</Text>
            </TouchableOpacity>
          )}
          {item.status === 'In Progress' && (
            <TouchableOpacity
              style={styles.completeBtn}
              activeOpacity={0.7}
              onPress={() => router.push({ pathname: '/InspectionReportForm', params: { bookingId: item._id, bookingData: JSON.stringify(item), token: authState?.token } })}
            >
              <Feather name="clipboard" size={15} color="#fff" />
              <Text style={styles.actionBtnText}>Record Results</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.viewBtn}
            activeOpacity={0.7}
            onPress={() => router.push({ pathname: '/BookingDetails', params: { bookingId: item._id } })}
          >
            <Feather name="eye" size={14} color="#636e72" />
            <Text style={styles.viewBtnText}>View</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: '#eef6ff' }]}>
          <Ionicons name="today-outline" size={18} color="#3498db" />
          <Text style={[styles.statNum, { color: '#3498db' }]}>{stats.today}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#fef9f0' }]}>
          <Feather name="clock" size={18} color="#e67e22" />
          <Text style={[styles.statNum, { color: '#e67e22' }]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#fff5ed' }]}>
          <Feather name="tool" size={18} color="#f39c12" />
          <Text style={[styles.statNum, { color: '#f39c12' }]}>{stats.inProgress}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#f0faf7' }]}>
          <Feather name="check" size={18} color="#10ac84" />
          <Text style={[styles.statNum, { color: '#10ac84' }]}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Done</Text>
        </View>
      </View>

      {/* Date Filters */}
      <View style={styles.dateRow}>
        {DATE_TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.dateTab, dateFilter === tab && styles.dateTabActive]}
            activeOpacity={0.7}
            onPress={() => setDateFilter(tab)}
          >
            <Text style={[styles.dateTabText, dateFilter === tab && styles.dateTabTextActive]}>{DATE_LABELS[tab]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Status Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContainer}>
        {FILTER_TABS.map(filter => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterChip, statusFilter === filter && styles.filterChipActive]}
            activeOpacity={0.7}
            onPress={() => setStatusFilter(filter)}
          >
            <Text style={[styles.filterChipText, statusFilter === filter && styles.filterChipTextActive]}>{filter}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Queue */}
      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#e67e22" />
          <Text style={styles.loaderTxt}>Loading queue...</Text>
        </View>
      ) : queue.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="clipboard-outline" size={56} color="#dfe6e9" />
          <Text style={styles.emptyText}>No bookings in queue</Text>
        </View>
      ) : (
        <FlatList
          data={queue}
          keyExtractor={(item) => item._id}
          renderItem={renderBooking}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB - Manage Packages */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => router.push('/ManagePackages')}>
        <Feather name="package" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },

  statsRow: { flexDirection: 'row', padding: 16, gap: 8 },
  statCard: { flex: 1, backgroundColor: '#fff', paddingVertical: 14, paddingHorizontal: 8, borderRadius: 14, alignItems: 'center', gap: 4, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 }, android: { elevation: 2 } }) },
  statNum: { fontSize: 22, fontWeight: '800', color: '#1a1a2e' },
  statLabel: { fontSize: 11, color: '#636e72', fontWeight: '600' },

  dateRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  dateTab: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', borderWidth: 1, borderColor: '#e9ecef' },
  dateTabActive: { backgroundColor: '#e67e22', borderColor: '#e67e22' },
  dateTabText: { fontSize: 13, fontWeight: '600', color: '#636e72' },
  dateTabTextActive: { color: '#fff' },

  filterScroll: { maxHeight: 46, marginBottom: 4 },
  filterContainer: { paddingHorizontal: 16, gap: 8 },
  filterChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e9ecef' },
  filterChipActive: { backgroundColor: '#fef0e3', borderColor: '#e67e22' },
  filterChipText: { fontSize: 13, color: '#636e72', fontWeight: '600' },
  filterChipTextActive: { color: '#e67e22' },

  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderTxt: { marginTop: 12, color: '#b2bec3', fontSize: 14 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#636e72', marginTop: 16 },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12 }, android: { elevation: 3 } }) },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  customerName: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  vehicleText: { fontSize: 13, color: '#636e72', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20, marginLeft: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },

  cardMeta: { gap: 8, marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#f1f3f5' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontSize: 13, color: '#636e72' },

  actions: { flexDirection: 'row', gap: 10 },
  confirmBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: '#3498db' },
  startBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f39c12' },
  completeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: '#10ac84' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  viewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#f1f3f5' },
  viewBtnText: { color: '#636e72', fontWeight: '600', fontSize: 13 },

  fab: { position: 'absolute', width: 56, height: 56, alignItems: 'center', justifyContent: 'center', right: 20, bottom: 24, backgroundColor: '#e67e22', borderRadius: 28, ...Platform.select({ ios: { shadowColor: '#e67e22', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10 }, android: { elevation: 6 } }) },
});

export default CompanyDashboard;
