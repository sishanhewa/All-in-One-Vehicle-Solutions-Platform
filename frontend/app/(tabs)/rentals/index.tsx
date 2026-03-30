import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RentalsListScreen() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch('http://10.0.2.2:5000/api/rentals', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setVehicles(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#10ac84" style={{ flex: 1 }} />;
  }

  return (
    <View style={styles.container}>
      {vehicles.length === 0 ? (
        <Text style={styles.emptyText}>No rental vehicles available.</Text>
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.card}
              onPress={() => router.push(`/(tabs)/rentals/${item._id}`)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.title}>{item.make} {item.model} ({item.year})</Text>
                <Ionicons name="chevron-forward" size={20} color="#7f8c8d" />
              </View>
              <View style={styles.pricingRow}>
                <Text style={styles.priceItem}>Rs.{item.shortTermDailyRate}/Day</Text>
                <Text style={styles.priceItem}>Rs.{item.longTermMonthlyRate}/Month</Text>
              </View>
              <Text style={styles.limitText}>
                Mileage Limit: {item.mileageLimit} Km {item.mileageLimitType}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa', padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '700', color: '#2c3e50' },
  pricingRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  priceItem: { fontSize: 14, color: '#16a085', fontWeight: 'bold' },
  limitText: { fontSize: 12, color: '#7f8c8d' },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#7f8c8d' }
});
