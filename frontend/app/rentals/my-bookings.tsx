import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MyBookingsScreen() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

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
    }
  };

  if (loading) return <ActivityIndicator size="large" color="#e67e22" style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>My Rental Bookings</Text>
      {bookings.length === 0 ? (
        <Text style={styles.emptyText}>You haven't requested any vehicles yet.</Text>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item: any) => item._id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.vehicleTitle}>{item.vehicle?.make} {item.vehicle?.model}</Text>
                <Text style={[styles.statusBadge, item.status === 'Pending' ? styles.statusPending : (item.status === 'Accepted' ? styles.statusAccepted : styles.statusRejected)]}>
                  {item.status}
                </Text>
              </View>
              <Text style={styles.detail}>Owner: {item.owner?.name}</Text>
              <Text style={styles.detail}>Dates: {new Date(item.startDate).toLocaleDateString()} to {new Date(item.endDate).toLocaleDateString()}</Text>
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
  vehicleTitle: { fontSize: 18, fontWeight: 'bold', color: '#e67e22' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontSize: 12, fontWeight: 'bold', overflow: 'hidden' },
  statusPending: { backgroundColor: '#f39c12', color: '#fff' },
  statusAccepted: { backgroundColor: '#27ae60', color: '#fff' },
  statusRejected: { backgroundColor: '#e74c3c', color: '#fff' },
  detail: { fontSize: 14, color: '#34495e', marginBottom: 4 }
});
