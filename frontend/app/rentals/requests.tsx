import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function RentalRequestsScreen() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

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
    }
  };

  const updateStatus = async (id: string, status: string) => {
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
        Alert.alert('Success', `Booking marked as ${status}`);
        fetchRequests();
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  if (loading) return <ActivityIndicator size="large" color="#f39c12" style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Manage Rental Requests</Text>
      {requests.length === 0 ? (
        <Text style={styles.emptyText}>No requests found for your vehicles.</Text>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item: any) => item._id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.vehicleTitle}>{item.vehicle.make} {item.vehicle.model}</Text>
                <Text style={[styles.statusBadge, item.status === 'Pending' ? styles.statusPending : (item.status === 'Accepted' ? styles.statusAccepted : styles.statusRejected)]}>
                  {item.status}
                </Text>
              </View>
              <Text style={styles.detail}>Renter: {item.renter.name} ({item.renter.phone})</Text>
              <Text style={styles.detail}>Dates: {new Date(item.startDate).toLocaleDateString()} to {new Date(item.endDate).toLocaleDateString()}</Text>
              
              {item.status === 'Pending' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity style={[styles.btn, styles.rejectBtn]} onPress={() => updateStatus(item._id, 'Rejected')}>
                    <Text style={styles.btnText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btn, styles.acceptBtn]} onPress={() => updateStatus(item._id, 'Accepted')}>
                    <Text style={styles.btnText}>Accept</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9', padding: 16 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50', marginBottom: 20 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#7f8c8d' },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 16, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  vehicleTitle: { fontSize: 18, fontWeight: 'bold', color: '#2980b9' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontSize: 12, fontWeight: 'bold', overflow: 'hidden' },
  statusPending: { backgroundColor: '#f39c12', color: '#fff' },
  statusAccepted: { backgroundColor: '#27ae60', color: '#fff' },
  statusRejected: { backgroundColor: '#e74c3c', color: '#fff' },
  detail: { fontSize: 14, color: '#34495e', marginBottom: 4 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 10 },
  btn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 6 },
  acceptBtn: { backgroundColor: '#27ae60' },
  rejectBtn: { backgroundColor: '#e74c3c' },
  btnText: { color: '#fff', fontWeight: 'bold' }
});
