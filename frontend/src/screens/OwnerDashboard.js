import React, { useState, useCallback, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { fetchOwnerGarage, fetchBookingQueue } from '../api/serviceApi';
import { AuthContext } from '../context/AuthContext';

const ACCENT = '#8e44ad';

// ─── Config ────────────────────────────────────────────────────────────────────

const STATUS_META = {
  pending_confirmation: { color: '#e67e22', bg: '#fef9f0', icon: 'clock',        label: 'Pending' },
  confirmed:            { color: '#3498db', bg: '#eef6ff', icon: 'check-circle', label: 'Confirmed' },
  in_progress:          { color: '#f39c12', bg: '#fff5ed', icon: 'tool',         label: 'In Progress' },
  ready_for_pickup:     { color: '#5f27cd', bg: '#f0f0ff', icon: 'bell',         label: 'Ready' },
  completed:            { color: '#10ac84', bg: '#f0faf7', icon: 'check',        label: 'Completed' },
  cancelled:            { color: '#e74c3c', bg: '#fff0f0', icon: 'x-circle',     label: 'Cancelled' },
};

const QUICK_ACTIONS = [
  { label: 'Booking Queue',   icon: 'list',     color: '#3498db', bg: '#eef6ff', route: '/BookingQueue' },
  { label: 'Manage Services', icon: 'tool',     color: ACCENT,    bg: '#f4ecf7', route: '/ManageOfferings' },
  { label: 'Manage Team',     icon: 'users',    color: '#10ac84', bg: '#f0faf7', route: '/ManageMechanics' },
  { label: 'Garage Profile',  icon: 'settings', color: '#636e72', bg: '#f1f3f5', route: '/GarageProfile' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (d) => {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return ''; }
};

const safeJoin = (arr) => {
  if (!Array.isArray(arr) || !arr.length) return 'Service';
  return arr.map((s) => (typeof s === 'object' ? s.name || '' : s)).filter(Boolean).join(', ');
};

// ─── Sub-components ────────────────────────────────────────────────────────────

const StatCard = ({ icon, iconLib, label, value, color, bg }) => {
  const Icon = iconLib === 'Ionicons' ? Ionicons : Feather;
  return (
    <View style={[styles.statCard, { backgroundColor: bg }]}>
      <Icon name={icon} size={20} color={color} />
      <Text style={[styles.statNum, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
};

const MiniBookingCard = ({ item, onPress }) => {
  const meta = STATUS_META[item.status] ?? STATUS_META.pending_confirmation;
  const customer = item.customerId?.name ?? item.userId?.name ?? 'Customer';
  const vehicle  = item.vehicleInfo
    ? `${item.vehicleInfo.make ?? ''} ${item.vehicleInfo.model ?? ''}`.trim()
    : 'Vehicle';

  return (
    <TouchableOpacity style={styles.miniCard} activeOpacity={0.75} onPress={onPress}>
      <View style={styles.miniCardLeft}>
        <View style={[styles.miniDot, { backgroundColor: meta.color }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.miniCustomer} numberOfLines={1}>{customer}</Text>
          <Text style={styles.miniVehicle} numberOfLines={1}>{vehicle}</Text>
        </View>
      </View>
      <View style={styles.miniCardRight}>
        <View style={[styles.miniBadge, { backgroundColor: meta.bg }]}>
          <Text style={[styles.miniBadgeText, { color: meta.color }]}>{meta.label}</Text>
        </View>
        <Text style={styles.miniDate}>{fmtDate(item.preferredDate)}</Text>
      </View>
    </TouchableOpacity>
  );
};

// ─── Main Screen ───────────────────────────────────────────────────────────────

const OwnerDashboard = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userInfo } = useContext(AuthContext);

  const [garage,  setGarage]  = useState(null);
  const [queue,   setQueue]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats,   setStats]   = useState({
    pending_confirmation: 0,
    confirmed:            0,
    in_progress:          0,
    ready_for_pickup:     0,
  });

  useFocusEffect(
    useCallback(() => {
      if (userInfo) load();
    }, [userInfo])
  );

  const load = async () => {
    setLoading(true);
    try {
      const [garageData, queueData] = await Promise.all([
        fetchOwnerGarage(),
        fetchBookingQueue({}),
      ]);

      const g    = garageData.garage ?? garageData;
      const list = Array.isArray(queueData) ? queueData : (queueData.bookings ?? []);

      // Use server-side counts (aggregated over ALL bookings, not just this page)
      const serverCounts = queueData.counts ?? {};

      setGarage(g);
      setQueue(list);
      setStats({
        pending_confirmation: serverCounts.pending_confirmation ?? list.filter((b) => b.status === 'pending_confirmation').length,
        confirmed:            serverCounts.confirmed            ?? list.filter((b) => b.status === 'confirmed').length,
        in_progress:          serverCounts.in_progress          ?? list.filter((b) => b.status === 'in_progress').length,
        ready_for_pickup:     serverCounts.ready_for_pickup     ?? list.filter((b) => b.status === 'ready_for_pickup').length,
      });
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  // ── Loading splash ──
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  const garageName  = garage?.garageName ?? 'Your Garage';
  const isVerified  = garage?.isVerified ?? false;
  const recentQueue = queue.slice(0, 5);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero header ── */}
      <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <View style={styles.heroTop}>
          <View style={styles.heroAvatar}>
            <Ionicons name="construct" size={26} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroGreeting}>Welcome back 👋</Text>
            <View style={styles.heroNameRow}>
              <Text style={styles.heroName} numberOfLines={1}>{garageName}</Text>
              {isVerified && (
                <Ionicons name="checkmark-circle" size={18} color="#3498db" style={{ marginLeft: 6 }} />
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={load}
            activeOpacity={0.7}
            hitSlop={10}
          >
            <Feather name="refresh-cw" size={18} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>

        {!isVerified && (
          <View style={styles.verifyBanner}>
            <Feather name="alert-circle" size={14} color="#f39c12" />
            <Text style={styles.verifyText}>Your garage is pending verification</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>

        {/* ── Stats grid ── */}
        <Text style={styles.sectionTitle}>Live Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard
            icon="clock" label="Pending"
            value={stats.pending_confirmation}
            color="#e67e22" bg="#fef9f0"
          />
          <StatCard
            icon="check-circle" label="Confirmed"
            value={stats.confirmed}
            color="#3498db" bg="#eef6ff"
          />
          <StatCard
            icon="tool" label="In Progress"
            value={stats.in_progress}
            color="#f39c12" bg="#fff5ed"
          />
          <StatCard
            icon="bell" iconLib="Feather" label="Ready"
            value={stats.ready_for_pickup}
            color="#5f27cd" bg="#f0f0ff"
          />
        </View>

        {/* ── Quick actions ── */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.route}
              style={styles.actionCard}
              activeOpacity={0.75}
              onPress={() => router.push(action.route)}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: action.bg }]}>
                <Feather name={action.icon} size={22} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
              <Feather name="chevron-right" size={16} color="#dfe6e9" style={{ marginTop: 4 }} />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Recent bookings ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Bookings</Text>
          <TouchableOpacity onPress={() => router.push('/BookingQueue')} activeOpacity={0.7}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {recentQueue.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Ionicons name="clipboard-outline" size={44} color="#dfe6e9" />
            <Text style={styles.emptyText}>No bookings yet</Text>
            <Text style={styles.emptySubText}>New repair requests will appear here</Text>
          </View>
        ) : (
          <View style={styles.recentList}>
            {recentQueue.map((item) => (
              <MiniBookingCard
                key={item._id}
                item={item}
                onPress={() =>
                  router.push({ pathname: '/RepairDetail', params: { bookingId: item._id } })
                }
              />
            ))}
            {queue.length > 5 && (
              <TouchableOpacity
                style={styles.viewAllBtn}
                activeOpacity={0.75}
                onPress={() => router.push('/BookingQueue')}
              >
                <Text style={styles.viewAllText}>View all {queue.length} bookings</Text>
                <Feather name="arrow-right" size={15} color={ACCENT} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const cardShadow = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10 },
  android: { elevation: 2 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#b2bec3', fontSize: 14 },

  // ── Hero ──
  hero: {
    backgroundColor: ACCENT,
    paddingHorizontal: 20, paddingBottom: 28,
    ...Platform.select({
      ios:     { shadowColor: ACCENT, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14 },
      android: { elevation: 8 },
    }),
  },
  heroTop:       { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  heroAvatar:    {
    width: 50, height: 50, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  heroGreeting:  { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginBottom: 2 },
  heroNameRow:   { flexDirection: 'row', alignItems: 'center' },
  heroName:      { fontSize: 18, fontWeight: '800', color: '#fff', flexShrink: 1 },
  refreshBtn:    {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },

  verifyBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(243,156,18,0.2)',
    paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 10,
  },
  verifyText: { fontSize: 12, color: '#fde8c8', fontWeight: '600' },

  content: { padding: 16 },

  // ── Section ──
  sectionTitle:  { fontSize: 13, fontWeight: '700', color: '#636e72', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 12, marginTop: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  seeAll:        { fontSize: 13, color: ACCENT, fontWeight: '700' },

  // ── Stats grid ──
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  statCard: {
    width: '47.5%', borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 12,
    alignItems: 'center', gap: 6,
    ...cardShadow,
  },
  statNum:   { fontSize: 26, fontWeight: '800', color: '#1a1a2e' },
  statLabel: { fontSize: 11, color: '#636e72', fontWeight: '600' },

  // ── Quick actions ──
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  actionCard: {
    width: '47.5%', backgroundColor: '#fff',
    borderRadius: 14, padding: 16,
    alignItems: 'flex-start', gap: 10,
    ...cardShadow,
  },
  actionIconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  actionLabel:    { fontSize: 14, fontWeight: '700', color: '#1a1a2e', flex: 1 },

  // ── Recent bookings ──
  recentList:  { gap: 10, marginTop: 4 },
  miniCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 16,
    ...cardShadow,
  },
  miniCardLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 12 },
  miniDot:       { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  miniCustomer:  { fontSize: 14, fontWeight: '700', color: '#1a1a2e' },
  miniVehicle:   { fontSize: 12, color: '#b2bec3', marginTop: 2 },
  miniCardRight: { alignItems: 'flex-end', gap: 5 },
  miniBadge:     { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 12 },
  miniBadgeText: { fontSize: 11, fontWeight: '700' },
  miniDate:      { fontSize: 11, color: '#b2bec3' },

  viewAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#e8d5f5',
  },
  viewAllText: { fontSize: 14, color: ACCENT, fontWeight: '700' },

  // ── Empty ──
  emptyBlock:   { alignItems: 'center', paddingVertical: 32, gap: 8, backgroundColor: '#fff', borderRadius: 14, ...cardShadow },
  emptyText:    { fontSize: 15, fontWeight: '700', color: '#636e72' },
  emptySubText: { fontSize: 13, color: '#b2bec3' },
});

export default OwnerDashboard;
