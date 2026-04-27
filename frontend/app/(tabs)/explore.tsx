import React, { useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Platform, Alert,
} from 'react-native';
import { AuthContext } from '../../src/context/AuthContext';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';

const ACCENT = '#8e44ad';

// ─── Role meta ─────────────────────────────────────────────────────────────────
const ROLE_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  User:        { label: 'Customer',     color: '#10ac84', bg: '#e8f8f5', icon: 'person' },
  GarageOwner: { label: 'Garage Owner', color: ACCENT,    bg: '#f4ecf7', icon: 'business' },
  Mechanic:    { label: 'Mechanic',     color: '#f39c12', bg: '#fff5ed', icon: 'hammer' },
  Admin:       { label: 'Admin',        color: '#e74c3c', bg: '#fce4e4', icon: 'shield' },
};

// ─── Role-specific menu items ───────────────────────────────────────────────────
const MENUS: Record<string, { icon: string; title: string; subtitle: string; route: string; color: string }[]> = {
  User: [
    { icon: 'construct-outline', title: 'Browse Services',  subtitle: 'Find garages and book repairs',              route: '/services',    color: ACCENT },
    { icon: 'receipt-outline',   title: 'My Repairs',       subtitle: 'Track all your repair bookings',             route: '/MyRepairs',   color: '#3498db' },
    { icon: 'cart-outline',      title: 'Marketplace',      subtitle: 'Buy and sell vehicles',                      route: '/marketplace', color: '#10ac84' },
    { icon: 'shield-checkmark-outline', title: 'Inspections', subtitle: 'Book vehicle inspections',               route: '/inspections', color: '#e67e22' },
  ],
  GarageOwner: [
    { icon: 'business-outline',  title: 'Dashboard',        subtitle: 'Garage overview and live stats',             route: '/ownerDashboard',  color: ACCENT },
    { icon: 'list-outline',      title: 'Booking Queue',    subtitle: 'Review and manage customer bookings',        route: '/bookingQueue',    color: '#3498db' },
    { icon: 'tool',              title: 'Manage Services',  subtitle: 'Add and edit your service offerings',        route: '/ManageOfferings', color: '#10ac84' },
    { icon: 'users',             title: 'Manage Team',      subtitle: 'Add, edit and deactivate mechanics',         route: '/ManageMechanics', color: '#f39c12' },
    { icon: 'settings-outline',  title: 'Garage Profile',   subtitle: 'Edit your garage details and business info', route: '/GarageProfile',   color: '#636e72' },
  ],
  Mechanic: [
    { icon: 'hammer-outline',    title: 'My Jobs',          subtitle: 'View and manage your assigned jobs',         route: '/myJobs',          color: ACCENT },
    { icon: 'person-outline',    title: 'My Profile',       subtitle: 'Update your name, phone and password',       route: '/MechanicProfile', color: '#3498db' },
  ],
  Admin: [
    { icon: 'shield-outline',    title: 'Admin Dashboard',  subtitle: 'Platform stats, garages and users',          route: '/adminDashboard',  color: '#e74c3c' },
    { icon: 'construct-outline', title: 'Browse Services',  subtitle: 'View the service marketplace',               route: '/services',        color: ACCENT },
  ],
};

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function AccountTab() {
  const { userInfo, logout } = useContext(AuthContext);
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  // ── Guest view ──
  if (!userInfo) {
    return (
      <View style={[styles.guestWrap, { paddingTop: insets.top + 24 }]}>
        <View style={styles.guestIcon}>
          <Feather name="user" size={40} color="#b2bec3" />
        </View>
        <Text style={styles.guestTitle}>Welcome to VehicleHub</Text>
        <Text style={styles.guestSub}>Sign in to access your account and all features</Text>
        <TouchableOpacity style={styles.guestLoginBtn} onPress={() => router.push('/login')} activeOpacity={0.85}>
          <Feather name="log-in" size={18} color="#fff" />
          <Text style={styles.guestLoginTxt}>Sign In</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.guestRegBtn} onPress={() => router.push('/register')} activeOpacity={0.75}>
          <Text style={styles.guestRegTxt}>Create Account</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const role     = userInfo.role ?? 'User';
  const roleMeta = ROLE_META[role] ?? ROLE_META.User;
  const items    = MENUS[role] ?? MENUS.User;
  const initials = userInfo.name?.charAt(0).toUpperCase() ?? 'U';

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Profile Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={[styles.avatar, { backgroundColor: roleMeta.color }]}>
          <Text style={styles.avatarTxt}>{initials}</Text>
        </View>
        <Text style={styles.headerName}>{userInfo.name}</Text>
        <Text style={styles.headerEmail}>{userInfo.email}</Text>
        {userInfo.phone ? (
          <View style={styles.phoneRow}>
            <Feather name="phone" size={12} color="rgba(255,255,255,0.6)" />
            <Text style={styles.headerPhone}>{userInfo.phone}</Text>
          </View>
        ) : null}
        {/* Role badge */}
        <View style={[styles.roleBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
          <Ionicons name={roleMeta.icon as any} size={13} color="#fff" />
          <Text style={styles.roleBadgeTxt}>{roleMeta.label}</Text>
        </View>
      </View>

      {/* ── Menu items ── */}
      <View style={styles.menuCard}>
        {items.map((item, idx) => (
          <TouchableOpacity
            key={item.route}
            style={[styles.menuItem, idx < items.length - 1 && styles.menuItemBorder]}
            activeOpacity={0.6}
            onPress={() => router.push(item.route as any)}
          >
            <View style={[styles.menuIcon, { backgroundColor: `${item.color}15` }]}>
              <Ionicons name={item.icon as any} size={20} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSub}>{item.subtitle}</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#dfe6e9" />
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Sign Out ── */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
        <Feather name="log-out" size={18} color="#e74c3c" />
        <Text style={styles.logoutTxt}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.versionTxt}>VehicleHub v1.0 · Service &amp; Repair Module</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },

  // ── Guest ──
  guestWrap: { flex: 1, alignItems: 'center', padding: 30, backgroundColor: '#f8f9fa' },
  guestIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#f1f3f5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  guestTitle: { fontSize: 22, fontWeight: '800', color: '#1a1a2e', marginBottom: 8 },
  guestSub: { fontSize: 14, color: '#b2bec3', textAlign: 'center', marginBottom: 32, lineHeight: 21 },
  guestLoginBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: ACCENT, paddingVertical: 14, paddingHorizontal: 40,
    borderRadius: 25, marginBottom: 14, width: '80%', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  guestLoginTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  guestRegBtn: { borderWidth: 2, borderColor: ACCENT, paddingVertical: 12, paddingHorizontal: 40, borderRadius: 25, width: '80%', alignItems: 'center' },
  guestRegTxt: { color: ACCENT, fontWeight: '700', fontSize: 16 },

  // ── Header ──
  header: {
    backgroundColor: ACCENT,
    alignItems: 'center', paddingHorizontal: 24, paddingBottom: 32,
    ...Platform.select({
      ios:     { shadowColor: ACCENT, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14 },
      android: { elevation: 8 },
    }),
  },
  avatar: { width: 76, height: 76, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  avatarTxt:    { fontSize: 32, color: '#fff', fontWeight: '800' },
  headerName:   { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 3 },
  headerEmail:  { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  phoneRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  headerPhone:  { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  roleBadge:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 14, borderRadius: 20 },
  roleBadgeTxt: { fontSize: 13, color: '#fff', fontWeight: '700' },

  // ── Menu ──
  menuCard: {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 20,
    borderRadius: 18, overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 12 },
      android: { elevation: 3 },
    }),
  },
  menuItem:       { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 18 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: '#f8f9fa' },
  menuIcon:       { width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  menuTitle:      { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginBottom: 2 },
  menuSub:        { fontSize: 12, color: '#b2bec3' },

  // ── Logout ──
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    margin: 16, padding: 16, backgroundColor: '#fff',
    borderRadius: 14, borderWidth: 1, borderColor: '#fce4e4',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  logoutTxt: { color: '#e74c3c', fontWeight: '700', fontSize: 16 },

  versionTxt: { textAlign: 'center', fontSize: 11, color: '#b2bec3', marginTop: 8, fontWeight: '600', letterSpacing: 0.4 },
});
