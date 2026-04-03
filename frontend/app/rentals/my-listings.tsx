import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Platform, Alert, Image, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, Feather } from '@expo/vector-icons';

export default function MyRentalListingsScreen() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchMyVehicles();
  }, []);

  const fetchMyVehicles = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch('http://192.168.8.100:5000/api/rentals', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        // Get current user ID from stored info
        const userInfoStr = await AsyncStorage.getItem('userInfo');
        if (userInfoStr) {
          const userInfo = JSON.parse(userInfoStr);
          const myVehicles = data.filter((v: any) => v.owner?._id === userInfo._id);
          setVehicles(myVehicles);
        }
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
    fetchMyVehicles();
  }, []);

  const deleteVehicle = async (id: string) => {
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to remove this vehicle listing? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              const response = await fetch(`http://192.168.8.100:5000/api/rentals/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (response.ok) {
                Alert.alert('Deleted', 'Vehicle listing removed successfully.');
                fetchMyVehicles();
              }
            } catch (err) {
              console.error(err);
              Alert.alert('Error', 'Failed to delete listing.');
            }
          }
        }
      ]
    );
  };

  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`http://192.168.8.100:5000/api/rentals/${id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ availability: !currentStatus })
      });
      if (response.ok) {
        fetchMyVehicles();
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to update availability.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#10ac84" />
        <Text style={styles.loaderText}>Loading your listings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Rental Listings</Text>
        <Text style={styles.headerSub}>{vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} listed</Text>
      </View>

      {vehicles.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="car-outline" size={48} color="#b2bec3" />
          </View>
          <Text style={styles.emptyTitle}>No Listings Yet</Text>
          <Text style={styles.emptyText}>You haven't listed any vehicles for rent.</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/rentals/add-rental')} activeOpacity={0.8}>
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.addBtnText}>List Your First Vehicle</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10ac84" colors={['#10ac84']} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => router.push(`/(tabs)/rentals/${item._id}`)}
            >
              <View style={styles.cardImagePlaceholder}>
                {item.images && item.images.length > 0 ? (
                  <Image source={{ uri: `http://192.168.8.100:5000${item.images[0]}` }} style={{ width: '100%', height: '100%', borderRadius: 12 }} resizeMode="cover" />
                ) : (
                  <Ionicons name="car-sport" size={36} color="#10ac84" />
                )}
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.vehicleName} numberOfLines={1}>{item.make} {item.model}</Text>
                  <TouchableOpacity onPress={() => deleteVehicle(item._id)}>
                    <Feather name="trash-2" size={18} color="#e74c3c" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.vehicleYear}>{item.year} · {item.transmission}</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.priceTag}>Rs. {item.shortTermDailyRate}/day</Text>
                  <Text style={styles.priceDivider}>|</Text>
                  <Text style={styles.priceTag}>Rs. {item.longTermMonthlyRate}/month</Text>
                </View>
                <View style={styles.availRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
                    <Ionicons name={item.availability ? 'checkmark-circle' : 'close-circle'} size={14} color={item.availability ? '#27ae60' : '#e74c3c'} />
                    <Text style={[styles.availText, { color: item.availability ? '#27ae60' : '#e74c3c' }]}>
                      {item.availability ? 'Available' : 'Rented Out'}
                    </Text>
                  </View>
                  <Switch 
                    value={item.availability} 
                    onValueChange={() => toggleAvailability(item._id, item.availability)}
                    trackColor={{ true: '#10ac84' }}
                    style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                  />
                </View>
              </View>
            </TouchableOpacity>
          )}
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
  emptyText: { fontSize: 14, color: '#b2bec3', marginBottom: 24, textAlign: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#10ac84', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 25 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 }, android: { elevation: 2 } }) },
  cardImagePlaceholder: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#f0faf7', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  cardBody: { flex: 1 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  vehicleName: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', flex: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 8 },
  vehicleYear: { fontSize: 13, color: '#b2bec3', marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  priceTag: { fontSize: 12, fontWeight: '600', color: '#10ac84' },
  priceDivider: { marginHorizontal: 6, color: '#dfe6e9' },
  availRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  availText: { fontSize: 11, fontWeight: '600' },
});
