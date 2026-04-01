import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, StatusBar, Platform, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchListings, resolveImageUrl } from '../api/marketplaceApi';
import { Ionicons, Feather } from '@expo/vector-icons';

const CITIES = ['All Cities', 'Colombo', 'Kandy', 'Gampaha', 'Kurunegala', 'Kalutara', 'Galle', 'Matara', 'Ratnapura', 'Negombo', 'Jaffna'];
const FUEL_TYPES = ['Any Fuel', 'Petrol', 'Diesel', 'Hybrid', 'Electric'];
const BODY_TYPES = ['Any Body', 'Sedan', 'SUV', 'Hatchback', 'Van', 'Truck', 'Coupe', 'Wagon'];

const MarketplaceFeed = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedFuel, setSelectedFuel] = useState('Any Fuel');
  const [searchText, setSearchText] = useState('');

  useFocusEffect(
    useCallback(() => { loadListings(); }, [selectedCity, selectedFuel])
  );

  const loadListings = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCity !== 'All Cities') params.location = selectedCity;
      if (selectedFuel !== 'Any Fuel') params.fuelType = selectedFuel;
      if (searchText.trim()) params.search = searchText.trim();
      const data = await fetchListings(params);
      setListings(data);
    } catch (error) {
      console.error('Fetch Listings Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => { loadListings(); };
  const formatPrice = (p) => `Rs. ${Number(p).toLocaleString()}`;

  const renderListing = ({ item }) => {
    const imageUri = item.images && item.images.length > 0
      ? resolveImageUrl(item.images[0])
      : 'https://via.placeholder.com/400x200?text=No+Image';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: '/ListingDetails', params: { listingId: item._id } })}
      >
        <Image source={{ uri: imageUri }} style={styles.cardImage} />
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.year} {item.make} {item.model}</Text>
          <Text style={styles.cardPrice}>{formatPrice(item.price)}</Text>
          <View style={styles.specsRow}>
            <View style={styles.specChip}>
              <Ionicons name="speedometer-outline" size={12} color="#636e72" />
              <Text style={styles.specText}>{item.mileage?.toLocaleString() || 0} km</Text>
            </View>
            <View style={styles.specChip}>
              <Ionicons name="flash-outline" size={12} color="#636e72" />
              <Text style={styles.specText}>{item.fuelType}</Text>
            </View>
            <View style={styles.specChip}>
              <Ionicons name="cog-outline" size={12} color="#636e72" />
              <Text style={styles.specText}>{item.transmission}</Text>
            </View>
          </View>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color="#636e72" />
            <Text style={styles.locationText}>{item.location}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>Vehicle<Text style={styles.logoAccent}>Market</Text></Text>
        <Text style={styles.subHeader}>Buy &amp; Sell Vehicles in Sri Lanka</Text>

        {/* Search */}
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <Feather name="search" size={16} color="#b2bec3" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search make or model..."
              placeholderTextColor="#b2bec3"
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity style={styles.searchBtn} activeOpacity={0.8} onPress={handleSearch}>
            <Feather name="search" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* City Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipContainer}>
          {CITIES.map(city => (
            <TouchableOpacity
              key={city}
              style={[styles.chip, selectedCity === city && styles.chipActive]}
              activeOpacity={0.7}
              onPress={() => setSelectedCity(city)}
            >
              <Text style={[styles.chipText, selectedCity === city && styles.chipTextActive]}>{city}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Fuel Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipContainer}>
          {FUEL_TYPES.map(fuel => (
            <TouchableOpacity
              key={fuel}
              style={[styles.chip, selectedFuel === fuel && styles.chipActiveAlt]}
              activeOpacity={0.7}
              onPress={() => setSelectedFuel(fuel)}
            >
              <Text style={[styles.chipText, selectedFuel === fuel && styles.chipTextActiveAlt]}>{fuel}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Result count + Post Ad button */}
      {!loading && (
        <View style={styles.resultBar}>
          <Text style={styles.resultTxt}>{listings.length} listing{listings.length !== 1 ? 's' : ''} found</Text>
          <TouchableOpacity style={styles.postBtn} activeOpacity={0.8} onPress={() => router.push('/CreateListing')}>
            <Ionicons name="add-circle" size={18} color="#fff" />
            <Text style={styles.postBtnText}>Post Ad</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#10ac84" />
          <Text style={styles.loaderTxt}>Finding vehicles...</Text>
        </View>
      ) : listings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="car-outline" size={64} color="#dfe6e9" />
          <Text style={styles.emptyText}>No vehicles found</Text>
          <Text style={styles.emptySubText}>Try a different search or filter</Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item._id}
          renderItem={renderListing}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },

  header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 }, android: { elevation: 4 } }) },
  logo: { fontSize: 24, fontWeight: '800', color: '#1a1a2e', letterSpacing: -0.5, marginBottom: 4 },
  logoAccent: { color: '#10ac84' },
  subHeader: { fontSize: 14, color: '#636e72', marginBottom: 14 },

  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  searchInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 12, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: '#e9ecef', gap: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#1a1a2e' },
  searchBtn: { width: 46, height: 46, borderRadius: 12, backgroundColor: '#10ac84', justifyContent: 'center', alignItems: 'center', ...Platform.select({ ios: { shadowColor: '#10ac84', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }, android: { elevation: 4 } }) },

  chipScroll: { marginHorizontal: -20, paddingHorizontal: 0, marginBottom: 4 },
  chipContainer: { paddingHorizontal: 20, gap: 8 },
  chip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#f1f3f5', borderWidth: 1, borderColor: '#e9ecef' },
  chipActive: { backgroundColor: '#e8f8f5', borderColor: '#10ac84' },
  chipActiveAlt: { backgroundColor: '#fef0e3', borderColor: '#e67e22' },
  chipText: { fontSize: 13, color: '#636e72', fontWeight: '600' },
  chipTextActive: { color: '#10ac84' },
  chipTextActiveAlt: { color: '#e67e22' },

  resultBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  resultTxt: { color: '#636e72', fontSize: 13, fontWeight: '600' },
  postBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#10ac84', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  postBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderTxt: { marginTop: 12, color: '#b2bec3', fontSize: 14 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#636e72', marginTop: 16 },
  emptySubText: { fontSize: 13, color: '#b2bec3', marginTop: 6 },

  card: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 14, overflow: 'hidden', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12 }, android: { elevation: 3 } }) },
  cardImage: { width: '100%', height: 180, resizeMode: 'cover' },
  cardBody: { padding: 16 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  cardPrice: { fontSize: 20, fontWeight: '800', color: '#10ac84', marginBottom: 10 },
  specsRow: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  specChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f1f3f5', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  specText: { fontSize: 12, color: '#636e72', fontWeight: '600' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 13, color: '#636e72' },
});

export default MarketplaceFeed;
