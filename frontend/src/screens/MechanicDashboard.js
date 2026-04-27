import React, { useState, useCallback, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList,
  TouchableOpacity, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { fetchMyJobs } from '../api/serviceApi';
import { AuthContext } from '../context/AuthContext';

const ACCENT = '#8e44ad';

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_META = {
  pending_confirmation: { color: '#e67e22', bg: '#fef9f0', icon: 'clock',        label: 'Pending' },
  confirmed:            { color: '#3498db', bg: '#eef6ff', icon: 'check-circle', label: 'Confirmed' },
  in_progress:          { color: '#f39c12', bg: '#fff5ed', icon: 'tool',         label: 'In Progress' },
  ready_for_pickup:     { color: '#5f27cd', bg: '#f0f0ff', icon: 'bell',         label: 'Ready' },
  completed:            { color: '#10ac84', bg: '#f0faf7', icon: 'check',        label: 'Completed' },
  cancelled:            { color: '#e74c3c', bg: '#fff0f0', icon: 'x-circle',     label: 'Cancelled' },
};

// TIME_SLOTS ordering for sort
const TIME_ORDER = [
  '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '1:00 PM',  '2:00 PM',  '3:00 PM',  '4:00 PM',  '5:00 PM',
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

const midnight = (d = new Date()) => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
};

const isToday = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const t = midnight();
  return d >= t && d < new Date(t.getTime() + 86400000);
};

const isUpcoming = (dateStr) => {
  if (!dateStr) return false;
  const d    = new Date(dateStr);
  const from = new Date(midnight().getTime() + 86400000);       // tomorrow midnight
  const to   = new Date(midnight().getTime() + 7 * 86400000);   // 7 days from now
  return d >= from && d < to;
};

const fmtDate = (dateStr, opts) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', opts || {
      weekday: 'short', month: 'short', day: 'numeric',
    });
  } catch { return dateStr; }
};

const sortByTime = (a, b) => {
  const ai = TIME_ORDER.indexOf(a.preferredTime ?? '');
  const bi = TIME_ORDER.indexOf(b.preferredTime ?? '');
  if (ai === -1 && bi === -1) return 0;
  if (ai === -1) return 1;
  if (bi === -1) return -1;
  return ai - bi;
};

const safeJoin = (arr) => {
  if (!Array.isArray(arr) || !arr.length) return 'Service';
  return arr.map((s) => (typeof s === 'object' ? s.name || '' : s)).filter(Boolean).join(', ');
};

// ─── Job Card ──────────────────────────────────────────────────────────────────

const JobCard = ({ item, onPress, compact = false }) => {
  const meta    = STATUS_META[item.status] ?? STATUS_META.confirmed;
  const vehicle = item.vehicleInfo
    ? `${item.vehicleInfo.make ?? ''} ${item.vehicleInfo.model ?? ''} · ${item.vehicleInfo.plateNumber ?? ''}`.trim()
    : '—';
  const customer  = item.customerId?.name ?? item.userId?.name ?? 'Customer';
  const services  = safeJoin(item.serviceOfferingIds);
  const dateLabel = fmtDate(item.preferredDate, compact
    ? { month: 'short', day: 'numeric' }
    : { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <TouchableOpacity
      style={[styles.card, compact && styles.cardCompact]}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <View style={styles.cardTop}>
        {/* Time bubble */}
        {item.preferredTime ? (
          <View style={styles.timeBubble}>
            <Text style={styles.timeBubbleText}>{item.preferredTime.replace(' ', '\n')}</Text>
          </View>
        ) : (
          <View style={[styles.timeBubble, { backgroundColor: '#f1f3f5' }]}>
            <Feather name="clock" size={18} color="#b2bec3" />
          </View>
        )}

        <View style={{ flex: 1 }}>
          <View style={styles.cardNameRow}>
            <Text style={styles.cardCustomer} numberOfLines={1}>{customer}</Text>
            <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
              <Feather name={meta.icon} size={11} color={meta.color} />
              <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
            </View>
          </View>
          <Text style={styles.cardVehicle} numberOfLines={1}>{vehicle}</Text>
          <Text style={styles.cardServices} numberOfLines={compact ? 1 : 2}>{services}</Text>
        </View>
      </View>

      {!compact && (
        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <Ionicons name="calendar-outline" size={13} color="#b2bec3" />
            <Text style={styles.footerText}>{dateLabel}</Text>
          </View>
          <Feather name="chevron-right" size={16} color="#dfe6e9" />
        </View>
      )}

      {compact && (
        <View style={styles.compactDateRow}>
          <Ionicons name="calendar-outline" size={12} color="#b2bec3" />
          <Text style={styles.compactDate}>{dateLabel}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ─── Section header ────────────────────────────────────────────────────────────

const SectionHeader = ({ title, count, icon }) => (
  <View style={styles.sectionHeader}>
    <Feather name={icon} size={14} color={ACCENT} />
    <Text style={styles.sectionTitle}>{title}</Text>
    {count != null && (
      <View style={styles.countBadge}>
        <Text style={styles.countBadgeText}>{count}</Text>
      </View>
    )}
  </View>
);

// ─── Main Screen ───────────────────────────────────────────────────────────────

const MechanicDashboard = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userInfo } = useContext(AuthContext);

  const [jobs,    setJobs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats,   setStats]   = useState({ today: 0, inProgress: 0, completed: 0 });

  useFocusEffect(
    useCallback(() => {
      if (userInfo) load();
    }, [userInfo])
  );

  const load = async () => {
    setLoading(true);
    try {
      // 'All' → backend returns all statuses (including completed/cancelled)
      // so the stats panel has accurate counts across the full history.
      // Today/upcoming filtering is then done client-side from this full list.
      const data = await fetchMyJobs('All');
      const list = Array.isArray(data) ? data : (data.jobs ?? []);
      setJobs(list);
      setStats({
        today:      list.filter((j) => isToday(j.preferredDate) && j.status !== 'cancelled').length,
        inProgress: list.filter((j) => j.status === 'in_progress').length,
        completed:  list.filter((j) => j.status === 'completed').length,
      });
    } catch {
      Alert.alert('Error', 'Could not load your jobs.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Loading your jobs...</Text>
      </View>
    );
  }

  const todayJobs    = jobs.filter((j) => isToday(j.preferredDate)).sort(sortByTime);
  const upcomingJobs = jobs.filter((j) => isUpcoming(j.preferredDate)).sort((a, b) => {
    const da = new Date(a.preferredDate);
    const db = new Date(b.preferredDate);
    if (da < db) return -1;
    if (da > db) return 1;
    return sortByTime(a, b);
  });

  const navigate = (bookingId) =>
    router.push({ pathname: '/JobDetail', params: { bookingId } });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero header ── */}
      <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
        <View style={styles.heroLeft}>
          <View style={styles.heroAvatar}>
            <Feather name="tool" size={22} color="#fff" />
          </View>
          <View>
            <Text style={styles.heroGreeting}>Good {greeting()},</Text>
            <Text style={styles.heroName} numberOfLines={1}>
              {userInfo?.name ?? 'Mechanic'}
            </Text>
          </View>
        </View>
        <View style={styles.heroRight}>
          <TouchableOpacity style={styles.refreshBtn} onPress={load} hitSlop={10} activeOpacity={0.7}>
            <Feather name="refresh-cw" size={18} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => router.push('/MechanicProfile')}
            hitSlop={10}
            activeOpacity={0.7}
          >
            <Feather name="user" size={18} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Stats row ── */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: '#fef9f0' }]}>
          <Ionicons name="today-outline" size={20} color="#e67e22" />
          <Text style={[styles.statNum, { color: '#e67e22' }]}>{stats.today}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#fff5ed' }]}>
          <Feather name="tool" size={20} color="#f39c12" />
          <Text style={[styles.statNum, { color: '#f39c12' }]}>{stats.inProgress}</Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#f0faf7' }]}>
          <Feather name="check-circle" size={20} color="#10ac84" />
          <Text style={[styles.statNum, { color: '#10ac84' }]}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      <View style={styles.content}>

        {/* ── Today's jobs ── */}
        <SectionHeader title="Today's Jobs" count={todayJobs.length} icon="sun" />

        {todayJobs.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Ionicons name="checkmark-done-circle-outline" size={36} color="#dfe6e9" />
            <Text style={styles.emptyText}>No jobs scheduled for today</Text>
          </View>
        ) : (
          todayJobs.map((item) => (
            <JobCard
              key={item._id}
              item={item}
              compact
              onPress={() => navigate(item._id)}
            />
          ))
        )}

        {/* ── Upcoming jobs ── */}
        <SectionHeader title="Upcoming (Next 7 Days)" count={upcomingJobs.length} icon="calendar" />

        {upcomingJobs.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Feather name="calendar" size={36} color="#dfe6e9" />
            <Text style={styles.emptyText}>No upcoming jobs in the next 7 days</Text>
          </View>
        ) : (
          upcomingJobs.map((item) => (
            <JobCard
              key={item._id}
              item={item}
              compact={false}
              onPress={() => navigate(item._id)}
            />
          ))
        )}

        {/* ── All jobs empty state ── */}
        {jobs.length === 0 && (
          <View style={styles.fullEmptyWrap}>
            <View style={styles.fullEmptyIcon}>
              <Feather name="tool" size={40} color="#dfe6e9" />
            </View>
            <Text style={styles.fullEmptyTitle}>No jobs assigned yet</Text>
            <Text style={styles.fullEmptySubtitle}>
              Your garage owner will assign jobs to you when bookings are confirmed
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

// ─── Greeting helper ───────────────────────────────────────────────────────────

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const cardShadow = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10 },
  android: { elevation: 2 },
});

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f8f9fa' },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#b2bec3', fontSize: 14 },

  // ── Hero ──
  hero: {
    backgroundColor: ACCENT,
    paddingHorizontal: 20, paddingBottom: 24,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    ...Platform.select({
      ios:     { shadowColor: ACCENT, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14 },
      android: { elevation: 8 },
    }),
  },
  heroLeft:    { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroAvatar:  {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  heroGreeting:{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  heroName:    { fontSize: 18, fontWeight: '800', color: '#fff', maxWidth: 220 },
  heroRight:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  refreshBtn:  {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },

  // ── Stats ──
  statsRow: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingVertical: 16,
  },
  statCard: {
    flex: 1, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 8,
    alignItems: 'center', gap: 5, ...cardShadow,
  },
  statNum:   { fontSize: 24, fontWeight: '800', color: '#1a1a2e' },
  statLabel: { fontSize: 11, color: '#636e72', fontWeight: '600', textAlign: 'center' },

  // ── Content ──
  content: { paddingHorizontal: 16 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 12, marginTop: 8,
  },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: '#636e72',
    textTransform: 'uppercase', letterSpacing: 0.7, flex: 1,
  },
  countBadge: {
    backgroundColor: ACCENT, borderRadius: 12,
    paddingVertical: 2, paddingHorizontal: 9,
  },
  countBadgeText: { fontSize: 12, fontWeight: '800', color: '#fff' },

  // ── Card ──
  card: {
    backgroundColor: '#fff', borderRadius: 14,
    padding: 16, marginBottom: 10, ...cardShadow,
  },
  cardCompact: { padding: 14 },

  cardTop:     { flexDirection: 'row', gap: 12, marginBottom: 4 },
  timeBubble:  {
    width: 52, minHeight: 52, borderRadius: 12,
    backgroundColor: '#f4ecf7',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  timeBubbleText: {
    fontSize: 11, fontWeight: '800', color: ACCENT,
    textAlign: 'center', lineHeight: 16,
  },

  cardNameRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  cardCustomer:   { fontSize: 15, fontWeight: '700', color: '#1a1a2e', flex: 1 },
  statusBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 20 },
  statusText:     { fontSize: 10, fontWeight: '700' },
  cardVehicle:    { fontSize: 12, color: '#b2bec3', marginBottom: 3, fontWeight: '600' },
  cardServices:   { fontSize: 13, color: '#636e72', lineHeight: 18 },

  cardFooter:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f3f5' },
  footerItem:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerText:     { fontSize: 13, color: '#636e72' },

  compactDateRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  compactDate:    { fontSize: 12, color: '#b2bec3' },

  // ── Empty ──
  emptyBlock: {
    alignItems: 'center', paddingVertical: 24, gap: 8,
    backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, ...cardShadow,
  },
  emptyText: { fontSize: 14, color: '#b2bec3' },

  fullEmptyWrap: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  fullEmptyIcon: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: '#f1f3f5',
    justifyContent: 'center', alignItems: 'center',
  },
  fullEmptyTitle:    { fontSize: 16, fontWeight: '700', color: '#636e72' },
  fullEmptySubtitle: { fontSize: 13, color: '#b2bec3', textAlign: 'center', lineHeight: 20 },
});

export default MechanicDashboard;
