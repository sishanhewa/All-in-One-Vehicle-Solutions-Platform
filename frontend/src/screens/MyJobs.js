import React, { useState, useCallback, useContext } from 'react';
import {
  View, Text, FlatList, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { fetchMyJobs } from '../api/serviceApi';
import { AuthContext } from '../context/AuthContext';

const ACCENT = '#8e44ad';

// ─── Config ────────────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { value: 'All',              label: 'All' },
  { value: 'confirmed',        label: 'Confirmed' },
  { value: 'in_progress',      label: 'In Progress' },
  { value: 'ready_for_pickup', label: 'Ready' },
  { value: 'completed',        label: 'Completed' },
];

const STATUS_META = {
  pending_confirmation: { color: '#e67e22', bg: '#fef9f0', icon: 'clock',        label: 'Pending' },
  confirmed:            { color: '#3498db', bg: '#eef6ff', icon: 'check-circle', label: 'Confirmed' },
  in_progress:          { color: '#f39c12', bg: '#fff5ed', icon: 'tool',         label: 'In Progress' },
  ready_for_pickup:     { color: '#5f27cd', bg: '#f0f0ff', icon: 'bell',         label: 'Ready' },
  completed:            { color: '#10ac84', bg: '#f0faf7', icon: 'check',        label: 'Completed' },
  cancelled:            { color: '#e74c3c', bg: '#fff0f0', icon: 'x-circle',     label: 'Cancelled' },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (d) => {
  if (!d) return 'N/A';
  try {
    return new Date(d).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
  } catch { return d; }
};

const safeJoin = (arr) => {
  if (!Array.isArray(arr) || !arr.length) return 'Service';
  return arr.map((s) => (typeof s === 'object' ? s.name || '' : s)).filter(Boolean).join(', ');
};

const customerFirstName = (job) => {
  const name = job.customerId?.name ?? job.userId?.name ?? '';
  return name.trim().split(' ')[0] || 'Customer';
};

// ─── Main Screen ───────────────────────────────────────────────────────────────

const MyJobs = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userInfo } = useContext(AuthContext);

  const [jobs,      setJobs]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('All');

  useFocusEffect(
    useCallback(() => {
      if (userInfo) load();
    }, [userInfo, activeTab])
  );

  const load = async () => {
    setLoading(true);
    try {
      // Pass 'All' string when user selects All tab → backend returns every status.
      // Pass status value for specific tabs → backend filters by that status.
      // No param (initial) → backend defaults to active statuses only (confirmed/in_progress/ready).
      const filterValue = activeTab === 'All' ? 'All' : activeTab;
      const data = await fetchMyJobs(filterValue);
      // Handle both old format (array) and new paginated format
      const list = Array.isArray(data) ? data : (data.bookings || data.jobs || []);
      setJobs(list);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not load your jobs.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render card ──
  const renderCard = ({ item }) => {
    const meta     = STATUS_META[item.status] ?? STATUS_META.confirmed;
    const vehicle  = item.vehicleInfo
      ? `${item.vehicleInfo.year ? item.vehicleInfo.year + ' ' : ''}${item.vehicleInfo.make ?? ''} ${item.vehicleInfo.model ?? ''}`.trim()
      : '—';
    const plate    = item.vehicleInfo?.plateNumber ?? '';
    const vtype    = item.vehicleInfo?.vehicleType ?? '';
    const services = safeJoin(item.serviceOfferingIds);
    const customer = customerFirstName(item);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.75}
        onPress={() => router.push({ pathname: '/JobDetail', params: { bookingId: item._id } })}
      >
        {/* ── Top row ── */}
        <View style={styles.cardTop}>
          <View style={styles.vehicleIconWrap}>
            <Ionicons name="construct-outline" size={20} color={ACCENT} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.vehicleName} numberOfLines={1}>{vehicle}</Text>
            <Text style={styles.vehicleSub} numberOfLines={1}>
              {plate}{vtype ? ` · ${vtype}` : ''}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
            <Feather name={meta.icon} size={11} color={meta.color} />
            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        {/* ── Details ── */}
        <View style={styles.detailBlock}>
          <View style={styles.detailRow}>
            <Feather name="tool" size={13} color="#b2bec3" />
            <Text style={styles.detailText} numberOfLines={2}>{services}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={13} color="#b2bec3" />
            <Text style={styles.detailText}>
              {fmtDate(item.preferredDate)}
              {item.preferredTime ? ` · ${item.preferredTime}` : ''}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Feather name="user" size={13} color="#b2bec3" />
            <Text style={styles.detailText}>{customer}</Text>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={styles.cardFooter}>
          <Text style={styles.tapHint}>Tap to view job details</Text>
          <Feather name="chevron-right" size={16} color="#dfe6e9" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
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

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loaderText}>Loading your jobs...</Text>
        </View>
      ) : jobs.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="construct-outline" size={56} color="#dfe6e9" />
          <Text style={styles.emptyTitle}>No jobs found</Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'All'
              ? 'Jobs assigned to you will appear here'
              : `No ${activeTab.replace(/_/g, ' ')} jobs`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item._id}
          renderItem={renderCard}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
          showsVerticalScrollIndicator={false}
          onRefresh={load}
          refreshing={loading}
        />
      )}
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const cardShadow = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10 },
  android: { elevation: 2 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },

  // ── Filters ──
  filterScroll:         { maxHeight: 52, marginVertical: 10 },
  filterContainer:      { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  filterChip:           { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e9ecef' },
  filterChipActive:     { backgroundColor: '#f4ecf7', borderColor: ACCENT },
  filterChipText:       { fontSize: 13, color: '#636e72', fontWeight: '600' },
  filterChipTextActive: { color: ACCENT },

  // ── States ──
  loaderWrap:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderText:    { color: '#b2bec3', fontSize: 14 },
  emptyWrap:     { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 10 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: '#636e72' },
  emptySubtitle: { fontSize: 13, color: '#b2bec3', textAlign: 'center' },

  // ── Card ──
  card: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 18, marginBottom: 12, ...cardShadow,
  },
  cardTop:         { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 12 },
  vehicleIconWrap: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: '#f4ecf7',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  vehicleName:  { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  vehicleSub:   { fontSize: 12, color: '#b2bec3', fontWeight: '600', marginTop: 2 },
  statusBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 20 },
  statusText:   { fontSize: 10, fontWeight: '700' },

  detailBlock: { gap: 8, paddingBottom: 12, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f3f5' },
  detailRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  detailText:  { fontSize: 13, color: '#636e72', flex: 1, lineHeight: 19 },

  cardFooter:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tapHint:     { fontSize: 12, color: '#b2bec3' },
});

export default MyJobs;
