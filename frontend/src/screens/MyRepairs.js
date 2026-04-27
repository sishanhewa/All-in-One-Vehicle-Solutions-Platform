import React, { useState, useCallback, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { fetchMyRepairBookings } from '../api/serviceApi';
import { AuthContext } from '../context/AuthContext';

const ACCENT = '#8e44ad';

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { value: 'All',                  label: 'All' },
  { value: 'pending_confirmation', label: 'Pending' },
  { value: 'confirmed',            label: 'Confirmed' },
  { value: 'in_progress',          label: 'In Progress' },
  { value: 'ready_for_pickup',     label: 'Ready' },
  { value: 'completed',            label: 'Completed' },
  { value: 'cancelled',            label: 'Cancelled' },
];

const STATUS_BADGE_COLORS = {
  pending_confirmation: { bg: '#fef9f0', text: '#e67e22', icon: 'clock',         label: 'Pending' },
  confirmed:            { bg: '#eef6ff', text: '#3498db', icon: 'check-circle',  label: 'Confirmed' },
  in_progress:          { bg: '#fff5ed', text: '#f39c12', icon: 'tool',          label: 'In Progress' },
  ready_for_pickup:     { bg: '#f0f0ff', text: '#5f27cd', icon: 'bell',          label: 'Ready' },
  completed:            { bg: '#f0faf7', text: '#10ac84', icon: 'check',         label: 'Completed' },
  cancelled:            { bg: '#fff0f0', text: '#e74c3c', icon: 'x-circle',      label: 'Cancelled' },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const safeJoin = (arr, key) => {
  if (!Array.isArray(arr) || arr.length === 0) return 'Service';
  return arr.map((s) => (typeof s === 'object' ? s[key] || '' : s)).filter(Boolean).join(', ');
};

// ─── Main Screen ───────────────────────────────────────────────────────────────

const MyRepairs = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userInfo } = useContext(AuthContext);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [stats, setStats] = useState({ total: 0, pending: 0, confirmed: 0, completed: 0 });

  // ── Fetch on focus / tab change ──
  useFocusEffect(
    useCallback(() => {
      if (userInfo) {
        loadBookings();
      }
    }, [userInfo, activeTab])
  );

  const loadBookings = async () => {
    setLoading(true);
    try {
      const filterValue = activeTab === 'All' ? '' : activeTab;
      const data = await fetchMyRepairBookings(filterValue);
      const list = Array.isArray(data) ? data : [];
      setBookings(list);

      // Stats only computed from the full unfiltered list
      if (activeTab === 'All') {
        setStats({
          total:     list.length,
          pending:   list.filter((b) => b.status === 'pending_confirmation').length,
          confirmed: list.filter((b) => b.status === 'confirmed').length,
          completed: list.filter((b) => b.status === 'completed').length,
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Could not fetch your repair bookings.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render card ──
  const renderCard = ({ item }) => {
    const badge = STATUS_BADGE_COLORS[item.status] ?? {
      bg: '#f8f9fa', text: '#636e72', icon: 'circle', label: item.status,
    };

    const garageName = item.garageId?.garageName ?? 'Garage';
    const services   = safeJoin(item.serviceOfferingIds, 'name');
    const vehicle    = item.vehicleInfo
      ? `${item.vehicleInfo.make ?? ''} ${item.vehicleInfo.model ?? ''} · ${item.vehicleInfo.plateNumber ?? ''}`.trim()
      : 'Vehicle';
    const dateLabel  = formatDate(item.preferredDate);
    const isCompleted = item.status === 'completed';
    const hasReview   = item.hasReview === true || !!item.review;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.75}
        onPress={() =>
          router.push({ pathname: '/RepairDetail', params: { bookingId: item._id } })
        }
      >
        {/* ── Card top: vehicle + badge ── */}
        <View style={styles.cardTop}>
          <View style={styles.vehicleIconWrap}>
            <Ionicons name="construct-outline" size={22} color={ACCENT} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.vehicleTitle} numberOfLines={1}>{vehicle}</Text>
            <Text style={styles.garageText} numberOfLines={1}>{garageName}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Feather name={badge.icon} size={12} color={badge.text} />
            <Text style={[styles.statusText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>

        {/* ── Detail rows ── */}
        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Feather name="tool" size={13} color="#636e72" />
            <Text style={styles.detailText} numberOfLines={2}>{services}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={13} color="#636e72" />
            <Text style={styles.detailText}>{dateLabel}</Text>
            {item.preferredTime ? (
              <Text style={styles.timeText}> at {item.preferredTime}</Text>
            ) : null}
          </View>
        </View>

        {/* ── Footer: leave review OR chevron ── */}
        <View style={styles.cardFooter}>
          {isCompleted && !hasReview ? (
            <TouchableOpacity
              style={styles.reviewLink}
              activeOpacity={0.75}
              onPress={(e) => {
                e.stopPropagation?.();
                router.push({ pathname: '/LeaveReview', params: { bookingId: item._id } });
              }}
            >
              <Feather name="star" size={14} color={ACCENT} />
              <Text style={styles.reviewLinkText}>Leave a Review</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}
          <Feather name="chevron-right" size={18} color="#dfe6e9" />
        </View>
      </TouchableOpacity>
    );
  };

  // ── Loading splash ──
  if (loading && bookings.length === 0) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loaderText}>Loading your repairs...</Text>
      </View>
    );
  }

  // ── Main render ──
  return (
    <View style={styles.container}>
      {/* ── Stats row ── */}
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

      {/* ── Filter tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        {STATUS_TABS.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <TouchableOpacity
              key={tab.value}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              activeOpacity={0.7}
              onPress={() => setActiveTab(tab.value)}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── List or empty state ── */}
      {bookings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="construct-outline" size={60} color="#dfe6e9" />
          <Text style={styles.emptyTitle}>No bookings found</Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'All'
              ? 'Book a garage service to get started'
              : 'No bookings match this status'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item._id}
          renderItem={renderCard}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
          onRefresh={loadBookings}
          refreshing={loading}
        />
      )}
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },

  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa', gap: 12 },
  loaderText: { color: '#b2bec3', fontSize: 14 },

  // ── Stats ──
  statsRow: { flexDirection: 'row', padding: 16, gap: 8 },
  statCard: {
    flex: 1, backgroundColor: '#fff',
    paddingVertical: 14, paddingHorizontal: 8,
    borderRadius: 14, alignItems: 'center', gap: 4,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  statNum:   { fontSize: 22, fontWeight: '800', color: '#1a1a2e' },
  statLabel: { fontSize: 11, color: '#636e72', fontWeight: '600' },

  // ── Filters ──
  filterScroll:    { maxHeight: 48, marginBottom: 4 },
  filterContainer: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  filterChip: {
    paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 20, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#e9ecef',
  },
  filterChipActive:     { backgroundColor: '#f4ecf7', borderColor: ACCENT },
  filterChipText:       { fontSize: 13, color: '#636e72', fontWeight: '600' },
  filterChipTextActive: { color: ACCENT },

  // ── Card ──
  card: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 18, marginBottom: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 3 },
    }),
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  vehicleIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#f4ecf7',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  vehicleTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  garageText:   { fontSize: 13, color: '#636e72', marginTop: 2 },

  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20,
  },
  statusText: { fontSize: 11, fontWeight: '700' },

  cardDetails: {
    gap: 8, marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#f1f3f5',
  },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  detailText: { fontSize: 13, color: '#636e72', flex: 1, lineHeight: 19 },
  timeText:   { fontSize: 13, color: '#636e72' },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reviewLinkText: { fontSize: 13, color: ACCENT, fontWeight: '700' },

  // ── Empty ──
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 10 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: '#636e72', marginTop: 6 },
  emptySubtitle: { fontSize: 13, color: '#b2bec3', textAlign: 'center' },
});

export default MyRepairs;
