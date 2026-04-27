import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Platform, RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import {
  adminFetchStats,
  adminFetchGarages, adminVerifyGarage, adminSuspendGarage, adminDeleteGarage,
  adminFetchUsers, adminChangeUserRole, adminToggleUserActive,
} from '../api/serviceApi';

const ACCENT = '#e74c3c';  // Admin red

// ─── Sub-components ────────────────────────────────────────────────────────────

const StatCard = ({ icon, label, value, color = '#1a1a2e' }) => (
  <View style={styles.statCard}>
    <Feather name={icon} size={20} color={color} />
    <Text style={[styles.statNum, { color }]}>{value ?? '—'}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const SectionTitle = ({ title }) => (
  <Text style={styles.sectionTitle}>{title}</Text>
);

// ─── Main Screen ───────────────────────────────────────────────────────────────

const AdminDashboard = () => {
  const [stats,      setStats]      = useState(null);
  const [garages,    setGarages]    = useState([]);
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab,        setTab]        = useState('garages'); // 'garages' | 'users'

  useFocusEffect(
    useCallback(() => { load(); }, [])
  );

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [s, g, u] = await Promise.all([
        adminFetchStats(),
        adminFetchGarages(),
        adminFetchUsers(),
      ]);
      setStats(s);
      setGarages(Array.isArray(g) ? g : (g?.garages ?? []));
      setUsers(Array.isArray(u) ? u : (u?.users ?? []));
    } catch (e) {
      Alert.alert('Error', 'Could not load admin data: ' + (e.message || ''));
    } finally {
      if (isRefresh) setRefreshing(false); else setLoading(false);
    }
  };

  // ── Garage actions ──
  const handleVerify = async (garage) => {
    try {
      const updated = await adminVerifyGarage(garage._id, !garage.isVerified);
      setGarages((prev) => prev.map((g) => (g._id === garage._id ? updated : g)));
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const handleSuspend = async (garage) => {
    try {
      const updated = await adminSuspendGarage(garage._id);
      setGarages((prev) => prev.map((g) => (g._id === garage._id ? updated : g)));
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const handleDeleteGarage = (garage) => {
    Alert.alert(
      'Delete Garage',
      `Permanently delete "${garage.garageName}" and all its data?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await adminDeleteGarage(garage._id);
              setGarages((prev) => prev.filter((g) => g._id !== garage._id));
            } catch (e) { Alert.alert('Error', e.message); }
          },
        },
      ]
    );
  };

  // ── User actions ──
  const handleRoleChange = async (user) => {
    const ROLES = ['User', 'Admin'];
    const next  = ROLES.find((r) => r !== user.role) ?? 'User';
    Alert.alert(
      'Change Role',
      `Change ${user.name}'s role to ${next}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Make ${next}`,
          onPress: async () => {
            try {
              const updated = await adminChangeUserRole(user._id, next);
              setUsers((prev) => prev.map((u) => (u._id === user._id ? updated : u)));
            } catch (e) { Alert.alert('Error', e.message); }
          },
        },
      ]
    );
  };

  const handleToggleUser = async (user) => {
    try {
      const updated = await adminToggleUserActive(user._id);
      setUsers((prev) => prev.map((u) => (u._id === user._id ? updated : u)));
    } catch (e) { Alert.alert('Error', e.message); }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Loading admin dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 80 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={ACCENT} colors={[ACCENT]} />
      }
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <Text style={styles.headerSub}>Platform-wide overview & controls</Text>
      </View>

      {/* ── Stats ── */}
      {stats && (
        <View style={styles.statsRow}>
          <StatCard icon="home"         label="Garages"  value={stats.garages?.total}           color="#8e44ad" />
          <StatCard icon="list"         label="Bookings" value={stats.bookings?.total}           color="#3498db" />
          <StatCard icon="users"        label="Customers" value={stats.customers?.total}          color="#10ac84" />
          <StatCard icon="check-circle" label="Verified" value={stats.garages?.verified}         color="#f39c12" />
        </View>
      )}

      {/* ── Tabs ── */}
      <View style={styles.tabRow}>
        {[['garages', 'Garages'], ['users', 'Users']].map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[styles.tabBtn, tab === key && styles.tabBtnActive]}
            onPress={() => setTab(key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, tab === key && styles.tabBtnTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.listPad}>

        {/* ── Garage list ── */}
        {tab === 'garages' && (
          <>
            <SectionTitle title={`${garages.length} Garage${garages.length !== 1 ? 's' : ''}`} />
            {garages.map((g) => (
              <View key={g._id} style={styles.listCard}>
                <View style={styles.listCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listCardName} numberOfLines={1}>{g.garageName}</Text>
                    <Text style={styles.listCardSub}>{g.city} · {g.ownerId?.email ?? '—'}</Text>
                  </View>
                  <View style={styles.badgeRow}>
                    <View style={[styles.badge, g.isVerified ? styles.badgeGreen : styles.badgeGrey]}>
                      <Text style={[styles.badgeText, g.isVerified ? { color: '#10ac84' } : { color: '#636e72' }]}>
                        {g.isVerified ? 'Verified' : 'Unverified'}
                      </Text>
                    </View>
                    <View style={[styles.badge, g.isActive ? styles.badgeBlue : styles.badgeRed]}>
                      <Text style={[styles.badgeText, g.isActive ? { color: '#3498db' } : { color: '#e74c3c' }]}>
                        {g.isActive ? 'Active' : 'Suspended'}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.actionRow}>
                  <TouchableOpacity style={[styles.actionChip, g.isVerified && styles.actionChipDim]} onPress={() => handleVerify(g)} activeOpacity={0.8}>
                    <Feather name={g.isVerified ? 'x' : 'check'} size={13} color={g.isVerified ? '#e74c3c' : '#10ac84'} />
                    <Text style={[styles.actionChipText, { color: g.isVerified ? '#e74c3c' : '#10ac84' }]}>
                      {g.isVerified ? 'Unverify' : 'Verify'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionChip} onPress={() => handleSuspend(g)} activeOpacity={0.8}>
                    <Feather name={g.isActive ? 'pause-circle' : 'play-circle'} size={13} color="#f39c12" />
                    <Text style={[styles.actionChipText, { color: '#f39c12' }]}>
                      {g.isActive ? 'Suspend' : 'Activate'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionChip} onPress={() => handleDeleteGarage(g)} activeOpacity={0.8}>
                    <Feather name="trash-2" size={13} color="#e74c3c" />
                    <Text style={[styles.actionChipText, { color: '#e74c3c' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {/* ── User list ── */}
        {tab === 'users' && (
          <>
            <SectionTitle title={`${users.length} User${users.length !== 1 ? 's' : ''}`} />
            {users.map((u) => (
              <View key={u._id} style={styles.listCard}>
                <View style={styles.listCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listCardName} numberOfLines={1}>{u.name}</Text>
                    <Text style={styles.listCardSub}>{u.email} · {u.role}</Text>
                  </View>
                  <View style={[styles.badge, u.isActive !== false ? styles.badgeBlue : styles.badgeRed]}>
                    <Text style={[styles.badgeText, u.isActive !== false ? { color: '#3498db' } : { color: '#e74c3c' }]}>
                      {u.isActive !== false ? 'Active' : 'Suspended'}
                    </Text>
                  </View>
                </View>
                <View style={styles.actionRow}>
                  {['GarageOwner', 'Mechanic'].includes(u.role) ? null : (
                    <TouchableOpacity style={styles.actionChip} onPress={() => handleRoleChange(u)} activeOpacity={0.8}>
                      <Feather name="shield" size={13} color="#8e44ad" />
                      <Text style={[styles.actionChipText, { color: '#8e44ad' }]}>Change Role</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.actionChip} onPress={() => handleToggleUser(u)} activeOpacity={0.8}>
                    <Feather name={u.isActive !== false ? 'user-x' : 'user-check'} size={13} color="#f39c12" />
                    <Text style={[styles.actionChipText, { color: '#f39c12' }]}>
                      {u.isActive !== false ? 'Suspend' : 'Activate'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

      </View>
    </ScrollView>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const shadow = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10 },
  android: { elevation: 2 },
});

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f8f9fa' },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 },
  loadingText: { color: '#b2bec3', fontSize: 14 },

  header: {
    backgroundColor: '#1a1a2e',
    padding: 20,
    paddingTop: 28,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  headerSub:   { fontSize: 13, color: '#b2bec3', marginTop: 4 },

  statsRow: { flexDirection: 'row', padding: 16, gap: 8 },
  statCard: {
    flex: 1, backgroundColor: '#fff',
    paddingVertical: 14, paddingHorizontal: 6,
    borderRadius: 14, alignItems: 'center', gap: 4,
    ...shadow,
  },
  statNum:   { fontSize: 20, fontWeight: '800', color: '#1a1a2e' },
  statLabel: { fontSize: 10, color: '#636e72', fontWeight: '600', textAlign: 'center' },

  tabRow:        { flexDirection: 'row', marginHorizontal: 16, marginBottom: 4, backgroundColor: '#f1f3f5', borderRadius: 12, padding: 4 },
  tabBtn:        { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabBtnActive:  { backgroundColor: '#fff', ...shadow },
  tabBtnText:    { fontSize: 14, fontWeight: '700', color: '#b2bec3' },
  tabBtnTextActive: { color: '#1a1a2e' },

  listPad: { padding: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#636e72', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10, marginTop: 4 },

  listCard: {
    backgroundColor: '#fff', borderRadius: 14,
    padding: 16, marginBottom: 12,
    ...shadow,
  },
  listCardTop:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  listCardName: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  listCardSub:  { fontSize: 12, color: '#636e72', marginTop: 3 },

  badgeRow: { flexDirection: 'column', alignItems: 'flex-end', gap: 4 },
  badge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  badgeGreen: { backgroundColor: '#f0faf7' },
  badgeGrey:  { backgroundColor: '#f1f3f5' },
  badgeBlue:  { backgroundColor: '#eef6ff' },
  badgeRed:   { backgroundColor: '#fff0f0' },

  actionRow:         { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionChip:        { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#e9ecef' },
  actionChipDim:     { opacity: 0.7 },
  actionChipText:    { fontSize: 12, fontWeight: '700' },
});

export default AdminDashboard;
