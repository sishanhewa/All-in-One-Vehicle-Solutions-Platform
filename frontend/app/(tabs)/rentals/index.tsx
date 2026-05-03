import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RentalsListScreen() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch('https://all-in-one-vehicle-solutions-platform.onrender.com/api/rentals', {
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
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchVehicles();
  }, []);

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#10ac84" />
        <Text style={styles.loaderText}>Finding available vehicles...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Rental Vehicles</Text>
          <Text style={styles.headerSub}>{vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} available</Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="car-sport" size={24} color="#10ac84" />
        </View>
      </View>

      {vehicles.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="search-outline" size={48} color="#b2bec3" />
          </View>
          <Text style={styles.emptyTitle}>No Vehicles Available</Text>
          <Text style={styles.emptyText}>There are no rental vehicles available at the moment. Check back later!</Text>
        </View>
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10ac84" colors={['#10ac84']} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => router.push(`/(tabs)/rentals/${item._id}`)}
            >
              <View style={styles.cardImageWrap}>
                {item.images && item.images.length > 0 ? (
                  <Image source={{ uri: item.images[0].startsWith('http') ? item.images[0] : `https://all-in-one-vehicle-solutions-platform.onrender.com${item.images[0]}` }} style={{ width: '100%', height: '100%', borderRadius: 12 }} resizeMode="cover" />
                ) : (
                  <Ionicons name="car-sport" size={40} color="#10ac84" />
                )}
              </View>

              {/* Card Content */}
              <View style={styles.cardContent}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.make} {item.model}</Text>
                  <View style={styles.yearBadge}>
                    <Text style={styles.yearBadgeText}>{item.year}</Text>
                  </View>
                </View>

                {/* Tags Row */}
                <View style={styles.tagsRow}>
                  <View style={styles.tag}>
                    <Ionicons name="settings-outline" size={11} color="#636e72" />
                    <Text style={styles.tagText}>{item.transmission}</Text>
                  </View>
                  <View style={styles.tag}>
                    <Ionicons name="speedometer-outline" size={11} color="#636e72" />
                    <Text style={styles.tagText}>{item.mileageLimit} Km/{item.mileageLimitType}</Text>
                  </View>
                </View>

                {/* Owner */}
                {item.owner && (
                  <View style={styles.ownerRow}>
                    <Feather name="user" size={12} color="#b2bec3" />
                    <Text style={styles.ownerText}>{item.owner.name}</Text>
                  </View>
                )}

                {/* Pricing */}
                <View style={styles.pricingRow}>
                  <View style={styles.priceBox}>
                    <Text style={styles.priceLabel}>Daily</Text>
                    <Text style={styles.priceValue}>Rs. {item.shortTermDailyRate?.toLocaleString()}</Text>
                  </View>
                  <View style={styles.priceDivider} />
                  <View style={styles.priceBox}>
                    <Text style={styles.priceLabel}>Monthly</Text>
                    <Text style={styles.priceValue}>Rs. {item.longTermMonthlyRate?.toLocaleString()}</Text>
                  </View>
                </View>
              </View>

              {/* Arrow */}
              <View style={styles.arrowWrap}>
                <Feather name="chevron-right" size={20} color="#dfe6e9" />
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

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1a1a2e' },
  headerSub: { fontSize: 13, color: '#b2bec3', marginTop: 2 },
  headerIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f0faf7', justifyContent: 'center', alignItems: 'center' },

  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f1f3f5', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a2e', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#b2bec3', textAlign: 'center', lineHeight: 22 },

  card: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 14, overflow: 'hidden', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 }, android: { elevation: 2 } }) },
  cardImageWrap: { height: 100, backgroundColor: '#f0faf7', justifyContent: 'center', alignItems: 'center' },
  cardContent: { padding: 16 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e', flex: 1 },
  yearBadge: { backgroundColor: '#f0faf7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  yearBadgeText: { fontSize: 12, fontWeight: '700', color: '#10ac84' },

  tagsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f8f9fa', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tagText: { fontSize: 11, color: '#636e72', fontWeight: '600' },

  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  ownerText: { fontSize: 12, color: '#b2bec3' },

  pricingRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 10, paddingVertical: 10 },
  priceBox: { flex: 1, alignItems: 'center' },
  priceLabel: { fontSize: 10, color: '#b2bec3', fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  priceValue: { fontSize: 15, fontWeight: '700', color: '#10ac84' },
  priceDivider: { width: 1, height: 30, backgroundColor: '#eee' },

  arrowWrap: { position: 'absolute', right: 16, top: '50%', marginTop: -10 },
});
