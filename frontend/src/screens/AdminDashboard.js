import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchDashboardStats } from '../api/adminApi';
import { Feather, Ionicons } from '@expo/vector-icons';

const AdminDashboard = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      const data = await fetchDashboardStats();
      setStats(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadStats(); }, []));

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#10ac84" />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#1a1a2e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <View style={{ width: 40 }} />
      </View>

      {stats && (
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Overview</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.users.total}</Text>
              <Text style={styles.statLabel}>Users</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.listings.total + stats.rentals.total + stats.parts.total}</Text>
              <Text style={styles.statLabel}>Total Ads</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#e74c3c' }]}>{stats.tickets.open}</Text>
              <Text style={styles.statLabel}>Open Tickets</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Management</Text>
          
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionCard} activeOpacity={0.8} onPress={() => router.push('/AdminUserManagement')}>
              <View style={[styles.iconWrap, { backgroundColor: '#e8f8f5' }]}>
                <Feather name="users" size={24} color="#10ac84" />
              </View>
              <Text style={styles.actionTitle}>Users</Text>
              <Text style={styles.actionSub}>{stats.users.admins} Admins</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} activeOpacity={0.8} onPress={() => router.push('/AdminAdManagement')}>
              <View style={[styles.iconWrap, { backgroundColor: '#fdf2e9' }]}>
                <Feather name="grid" size={24} color="#e67e22" />
              </View>
              <Text style={styles.actionTitle}>Ads & Content</Text>
              <Text style={styles.actionSub}>Review listings</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} activeOpacity={0.8} onPress={() => router.push('/AdminTicketManagement')}>
              <View style={[styles.iconWrap, { backgroundColor: '#fde8e8' }]}>
                <Feather name="life-buoy" size={24} color="#e74c3c" />
              </View>
              <Text style={styles.actionTitle}>Support Tickets</Text>
              <Text style={styles.actionSub}>{stats.tickets.total} total tickets</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} activeOpacity={0.8} onPress={() => router.push('/AdminInspectionManagement')}>
              <View style={[styles.iconWrap, { backgroundColor: '#eef2ff' }]}>
                <Feather name="search" size={24} color="#3498db" />
              </View>
              <Text style={styles.actionTitle}>Inspections</Text>
              <Text style={styles.actionSub}>{stats.inspections.pending} pending</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e' },
  
  content: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a2e', marginBottom: 16, marginTop: 8 },
  
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  statCard: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 16, marginHorizontal: 4, alignItems: 'center', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }, android: { elevation: 2 } }) },
  statValue: { fontSize: 24, fontWeight: '800', color: '#1a1a2e', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#b2bec3', fontWeight: '600' },

  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  actionCard: { width: '48%', backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 16, alignItems: 'center', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }, android: { elevation: 2 } }) },
  iconWrap: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  actionTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  actionSub: { fontSize: 12, color: '#b2bec3' },
});

export default AdminDashboard;
