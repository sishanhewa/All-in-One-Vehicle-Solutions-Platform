import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, Feather } from '@expo/vector-icons';

const statusConfig: Record<string, { color: string; bg: string; icon: string }> = {
  Pending: { color: '#f39c12', bg: '#fef9e7', icon: 'time-outline' },
  Accepted: { color: '#27ae60', bg: '#eafaf1', icon: 'checkmark-circle-outline' },
  Rejected: { color: '#e74c3c', bg: '#fdedec', icon: 'close-circle-outline' },
  Completed: { color: '#3498db', bg: '#ebf5fb', icon: 'flag-outline' },
  Cancelled: { color: '#7f8c8d', bg: '#f2f3f4', icon: 'ban-outline' },
};

export default function RentalRequestsScreen() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch('http://10.0.2.2:5000/api/rentals/owner/bookings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setRequests(data);
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
    fetchRequests();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    Alert.alert(
      'Confirm Action',
      `Are you sure you want to ${status.toLowerCase()} this booking?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: status === 'Rejected' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              const response = await fetch(`http://10.0.2.2:5000/api/rentals/bookings/${id}/status`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
              });
              if (response.ok) {
                Alert.alert('Success', `Booking has been ${status.toLowerCase()}.`);
                fetchRequests();
              }
            } catch (error) {
              console.error(error);
              Alert.alert('Error', 'Failed to update booking status.');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#10ac84" />
        <Text style={styles.loaderText}>Loading requests...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rental Requests</Text>
        <Text style={styles.headerSub}>{requests.length} request{requests.length !== 1 ? 's' : ''}</Text>
      </View>

      {requests.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="mail-open-outline" size={48} color="#b2bec3" />
          </View>
          <Text style={styles.emptyTitle}>No Requests</Text>
          <Text style={styles.emptyText}>No one has requested to rent your vehicles yet. Your requests will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item: any) => item._id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10ac84" colors={['#10ac84']} />}
          renderItem={({ item }) => {
            const config = statusConfig[item.status] || statusConfig.Pending;
            return (
              <View style={styles.card}>
                {/* Card Header */}
                <View style={styles.cardTopRow}>
                  <View style={styles.cardIconWrap}>
                    <Ionicons name="car-sport" size={24} color="#10ac84" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.vehicleTitle}>{item.vehicle?.make} {item.vehicle?.model}</Text>
                    <Text style={styles.vehicleYear}>{item.vehicle?.year}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
                    <Ionicons name={config.icon as any} size={14} color={config.color} />
                    <Text style={[styles.statusText, { color: config.color }]}>{item.status}</Text>
                  </View>
                </View>

                {/* Renter Details */}
                <View style={styles.detailsWrap}>
                  <View style={styles.detailRow}>
                    <Feather name="user" size={13} color="#b2bec3" />
                    <Text style={styles.detailText}>Renter: {item.renter?.name || 'N/A'}</Text>
                  </View>
                  {item.renter?.phone && (
                    <View style={styles.detailRow}>
                      <Feather name="phone" size={13} color="#b2bec3" />
                      <Text style={styles.detailText}>{item.renter.phone}</Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Feather name="calendar" size={13} color="#b2bec3" />
                    <Text style={styles.detailText}>
                      {new Date(item.startDate).toLocaleDateString()} to {new Date(item.endDate).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                {item.status === 'Pending' && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => updateStatus(item._id, 'Rejected')}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close-circle" size={18} color="#fff" />
                      <Text style={styles.actionBtnText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.acceptBtn]}
                      onPress={() => updateStatus(item._id, 'Accepted')}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      <Text style={styles.actionBtnText}>Accept</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {item.status === 'Accepted' && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#3498db', flex: 1 }]}
                      onPress={() => updateStatus(item._id, 'Completed')}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="flag" size={18} color="#fff" />
                      <Text style={styles.actionBtnText}>Mark as Completed</Text>
                    </TouchableOpacity>
                  </View>
                )}
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

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#f8f9fa' },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10 },
  rejectBtn: { backgroundColor: '#e74c3c' },
  acceptBtn: { backgroundColor: '#27ae60' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
