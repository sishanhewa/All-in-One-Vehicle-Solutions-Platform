import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function RentalVehicleDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      const response = await fetch(`http://10.0.2.2:5000/api/rentals/${id}`);
      const data = await response.json();
      if (response.ok) {
        setVehicle(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <ActivityIndicator size="large" color="#10ac84" style={{ flex: 1 }} />;
  if (!vehicle) return <Text style={{ textAlign: 'center', marginTop: 50 }}>Vehicle not found</Text>;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{vehicle.make} {vehicle.model} ({vehicle.year})</Text>
        <Text style={styles.transmission}>{vehicle.transmission}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rental Terms</Text>
        <Text style={styles.listItem}>• Duration: Short-term & Long-term (Min 5 days)</Text>
        <Text style={styles.listItem}>• Mileage: {vehicle.mileageLimit} Km per {vehicle.mileageLimitType}</Text>
        <Text style={styles.listItem}>• Extra Mileage: Rs. {vehicle.extraMileageRate} per additional 1 Km</Text>
        <Text style={styles.listItem}>• Refundable Deposit: Rs. {vehicle.deposit}</Text>
        <Text style={styles.listItem}>• Short Term Rate: Rs. {vehicle.shortTermDailyRate} / Day</Text>
        <Text style={styles.listItem}>• Long Term Rate: Rs. {vehicle.longTermMonthlyRate} / Month</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Simple Booking Process</Text>
        <Text style={styles.paragraph}>To get behind the wheel, you just need:</Text>
        <Text style={styles.listItem}>1️⃣ Valid Driving License</Text>
        <Text style={styles.listItem}>2️⃣ ID Proof (NIC or Passport)</Text>
        <Text style={styles.listItem}>3️⃣ Billing Proof (Utility Bill)</Text>
        <Text style={styles.listItem}>4️⃣ One Guarantor (with ID & Billing proof)</Text>
        <Text style={styles.listItem}>5️⃣ Upfront Payment</Text>
      </View>

      <TouchableOpacity 
        style={[styles.bookBtn, !vehicle.availability && styles.disabledBtn]} 
        disabled={!vehicle.availability}
        onPress={() => router.push({ pathname: '/(tabs)/rentals/book', params: { vehicleId: vehicle._id } })}
      >
        <Text style={styles.bookBtnText}>
          {vehicle.availability ? 'Book Now' : 'Currently Unavailable'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9', padding: 16 },
  header: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50' },
  transmission: { fontSize: 16, color: '#7f8c8d', marginTop: 4 },
  section: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 16, elevation: 1 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2980b9', marginBottom: 10 },
  listItem: { fontSize: 14, color: '#34495e', marginBottom: 6, lineHeight: 20 },
  paragraph: { fontSize: 14, color: '#34495e', marginBottom: 10 },
  bookBtn: { backgroundColor: '#16a085', padding: 16, borderRadius: 8, alignItems: 'center', marginVertical: 20 },
  disabledBtn: { backgroundColor: '#bdc3c7' },
  bookBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
