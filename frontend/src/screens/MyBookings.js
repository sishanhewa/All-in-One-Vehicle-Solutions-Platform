import React, { useState, useCallback, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchMyBookings } from '../api/inspectionApi';
import { AuthContext } from '../context/AuthContext';
import { Feather, Ionicons } from '@expo/vector-icons';

const STATUS_FILTERS = ['All', 'Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'];

const STATUS_COLORS = {
  'Pending': { bg: '#fef9f0', text: '#e67e22', icon: 'clock' },
  'Confirmed': { bg: '#eef6ff', text: '#3498db', icon: 'check-circle' },
  'In Progress': { bg: '#fff5ed', text: '#f39c12', icon: 'tool' },
  'Completed': { bg: '#f0faf7', text: '#10ac84', icon: 'check' },
  'Cancelled': { bg: '#fff0f0', text: '#e74c3c', icon: 'x-circle' },
};

const MyBookings = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userInfo } = useContext(AuthContext);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [stats, setStats] = useState({ total: 0, pending: 0, confirmed: 0, completed: 0 });

  useFocusEffect(
    useCallback(() => {
      if (userInfo) loadBookings();
    }, [userInfo, activeFilter])
  );

  const loadBookings = async () => {
    setLoading(true);
    try {
      const data = await fetchMyBookings(activeFilter);
      setBookings(data);

      // Calculate stats from all data (not filtered)
      if (activeFilter === 'All') {
        setStats({
          total: data.length,
          pending: data.filter(b => b.status === 'Pending').length,
          confirmed: data.filter(b => b.status === 'Confirmed').length,
          completed: data.filter(b => b.status === 'Completed').length,
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Could not fetch your bookings.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const renderBookingCard = ({ item }) => {
    const statusStyle = STATUS_COLORS[item.status] || STATUS_COLORS['Pending'];
    const companyProfile = item.companyId?.companyProfile || {};

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: '/BookingDetails', params: { bookingId: item._id } })}
      >
        {/* Vehicle Info */}
        <View style={styles.cardTop}>
          <View style={styles.vehicleIconWrap}>
            <Ionicons name="car-sport" size={22} color="#e67e22" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.vehicleTitle}>{item.vehicleInfo?.year} {item.vehicleInfo?.make} {item.vehicleInfo?.model}</Text>
            <Text style={styles.plateText}>{item.vehicleInfo?.plateNumber}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Feather name={statusStyle.icon} size={12} color={statusStyle.text} />
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{item.status}</Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Feather name="briefcase" size={13} color="#636e72" />
            <Text style={styles.detailText}>{companyProfile.companyName || item.companyId?.name || 'Company'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Feather name="package" size={13} color="#636e72" />
            <Text style={styles.detailText}>{item.packageId?.name || 'Package'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={13} color="#636e72" />
            <Text style={styles.detailText}>{formatDate(item.appointmentDate)} at {item.appointmentTime}</Text>
          </View>
        </View>

        {/* Result (if completed) */}
        {item.status === 'Completed' && item.inspectionResult && (
          <View style={styles.resultRow}>
            <View style={[styles.resultBadge, { backgroundColor: item.inspectionResult === 'Pass' ? '#f0faf7' : item.inspectionResult === 'Fail' ? '#fff0f0' : '#fef9f0' }]}>
              <Ionicons
                name={item.inspectionResult === 'Pass' ? 'checkmark-circle' : item.inspectionResult === 'Fail' ? 'close-circle' : 'warning'}
                size={16}
                color={item.inspectionResult === 'Pass' ? '#10ac84' : item.inspectionResult === 'Fail' ? '#e74c3c' : '#f39c12'}
              />
              <Text style={[styles.resultText, { color: item.inspectionResult === 'Pass' ? '#10ac84' : item.inspectionResult === 'Fail' ? '#e74c3c' : '#f39c12' }]}>
                {item.inspectionResult}
              </Text>
            </View>
            {item.overallScore != null && (
              <Text style={styles.scoreText}>Score: {item.overallScore}/100</Text>
            )}
          </View>
        )}

        {/* Price */}
        <View style={styles.cardFooter}>
          <Text style={styles.priceText}>Rs. {Number(item.packageId?.price || 0).toLocaleString()}</Text>
          <Feather name="chevron-right" size={18} color="#dfe6e9" />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && bookings.length === 0) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#e67e22" />
        <Text style={styles.loaderTxt}>Loading your bookings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Feather name="layers" size={18} color="#1a1a2e" />
          <Text style={styles.statNum}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#fef9f0' }]}>
          <Feather name="clock" size={18} color="#e67e22" />
          <Text style={[styles.statNum, { color: '#e67e22' }]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#eef6ff' }]}>
          <Feather name="check-circle" size={18} color="#3498db" />
          <Text style={[styles.statNum, { color: '#3498db' }]}>{stats.confirmed}</Text>
          <Text style={styles.statLabel}>Confirmed</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#f0faf7' }]}>
          <Feather name="check" size={18} color="#10ac84" />
          <Text style={[styles.statNum, { color: '#10ac84' }]}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Done</Text>
        </View>
      </View>

      {/* Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContainer}>
        {STATUS_FILTERS.map(filter => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
            activeOpacity={0.7}
            onPress={() => setActiveFilter(filter)}
          >
            <Text style={[styles.filterChipText, activeFilter === filter && styles.filterChipTextActive]}>{filter}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {bookings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="clipboard-outline" size={56} color="#dfe6e9" />
          <Text style={styles.emptyText}>No bookings found</Text>
          <Text style={styles.emptySubText}>Browse inspection companies to book your first inspection</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item._id}
          renderItem={renderBookingCard}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  loaderTxt: { marginTop: 12, color: '#b2bec3', fontSize: 14 },

  statsRow: { flexDirection: 'row', padding: 16, gap: 8 },
  statCard: { flex: 1, backgroundColor: '#fff', paddingVertical: 14, paddingHorizontal: 8, borderRadius: 14, alignItems: 'center', gap: 4, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 }, android: { elevation: 2 } }) },
  statNum: { fontSize: 22, fontWeight: '800', color: '#1a1a2e' },
  statLabel: { fontSize: 11, color: '#636e72', fontWeight: '600' },

  filterScroll: { maxHeight: 46, marginBottom: 4 },
  filterContainer: { paddingHorizontal: 16, gap: 8 },
  filterChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e9ecef' },
  filterChipActive: { backgroundColor: '#fef0e3', borderColor: '#e67e22' },
  filterChipText: { fontSize: 13, color: '#636e72', fontWeight: '600' },
  filterChipTextActive: { color: '#e67e22' },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12 }, android: { elevation: 3 } }) },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  vehicleIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fef9f0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  vehicleTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  plateText: { fontSize: 13, color: '#b2bec3', fontWeight: '600', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },

  cardDetails: { gap: 8, marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#f1f3f5' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 13, color: '#636e72' },

  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  resultBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  resultText: { fontSize: 13, fontWeight: '700' },
  scoreText: { fontSize: 14, fontWeight: '800', color: '#1a1a2e' },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceText: { fontSize: 17, fontWeight: '800', color: '#e67e22' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#636e72', marginTop: 16 },
  emptySubText: { fontSize: 13, color: '#b2bec3', marginTop: 6, textAlign: 'center' },
});

export default MyBookings;
