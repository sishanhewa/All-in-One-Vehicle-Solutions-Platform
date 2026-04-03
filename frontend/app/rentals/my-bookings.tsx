import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, Feather } from '@expo/vector-icons';

const statusConfig: Record<string, { color: string; bg: string; icon: string }> = {
  Pending: { color: '#f39c12', bg: '#fef9e7', icon: 'time-outline' },
  Accepted: { color: '#27ae60', bg: '#eafaf1', icon: 'checkmark-circle-outline' },
  Rejected: { color: '#e74c3c', bg: '#fdedec', icon: 'close-circle-outline' },
  Completed: { color: '#3498db', bg: '#ebf5fb', icon: 'flag-outline' },
  Cancelled: { color: '#7f8c8d', bg: '#f2f3f4', icon: 'ban-outline' },
};

export default function MyBookingsScreen() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch('http://10.0.2.2:5000/api/rentals/my-bookings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setBookings(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookings();
  }, []);

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#10ac84" />
        <Text style={styles.loaderText}>Loading your bookings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <Text style={styles.headerSub}>{bookings.length} booking{bookings.length !== 1 ? 's' : ''}</Text>
      </View>

      {bookings.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="calendar-outline" size={48} color="#b2bec3" />
          </View>
          <Text style={styles.emptyTitle}>No Bookings Yet</Text>
          <Text style={styles.emptyText}>You haven't requested any vehicles yet. Browse the rental listings to find your next ride!</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item: any) => item._id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10ac84" colors={['#10ac84']} />}
          renderItem={({ item }) => {
            const config = statusConfig[item.status] || statusConfig.Pending;
            return (
              <View style={styles.card}>
                <View style={styles.cardTopRow}>
                  {/* Vehicle Info */}
                  <View style={styles.cardIconWrap}>
                    <Ionicons name="car-sport" size={24} color="#10ac84" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.vehicleTitle}>{item.vehicle?.make} {item.vehicle?.model}</Text>
                    <Text style={styles.vehicleYear}>{item.vehicle?.year}</Text>
                  </View>
                  {/* Status Badge */}
                  <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
                    <Ionicons name={config.icon as any} size={14} color={config.color} />
                    <Text style={[styles.statusText, { color: config.color }]}>{item.status}</Text>
                  </View>
                </View>

                {/* Details */}
                <View style={styles.detailsWrap}>
                  <View style={styles.detailRow}>
                    <Feather name="user" size={13} color="#b2bec3" />
                    <Text style={styles.detailText}>Owner: {item.owner?.name || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Feather name="calendar" size={13} color="#b2bec3" />
                    <Text style={styles.detailText}>
                      {new Date(item.startDate).toLocaleDateString()} to {new Date(item.endDate).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  loaderText: { marginTop: 12, fontSize: 14, color: '#b2bec3' },

  header: { backgroundColor: '#fff', padding: 20, paddingTop: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1a1a2e' },
  headerSub: { fontSize: 13, color: '#b2bec3', marginTop: 4 },

  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f1f3f5', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a2e', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#b2bec3', textAlign: 'center', lineHeight: 22 },

  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 }, android: { elevation: 2 } }) },
  cardTopRow: { flexDirection: 'row', alignItems: 'center' },
  cardIconWrap: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#f0faf7', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  vehicleTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  vehicleYear: { fontSize: 12, color: '#b2bec3', marginTop: 2 },

  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusText: { fontSize: 12, fontWeight: '700' },

  detailsWrap: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f8f9fa' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  detailText: { fontSize: 13, color: '#636e72' },
});
