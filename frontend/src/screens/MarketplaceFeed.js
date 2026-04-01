import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, StatusBar, Platform, ScrollView, Modal, TouchableWithoutFeedback } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchListings, resolveImageUrl } from '../api/marketplaceApi';
import { Ionicons, Feather } from '@expo/vector-icons';

const MAKES = ['All Makes', 'Audi', 'BMW', 'Honda', 'Hyundai', 'Kia', 'Mercedes-Benz', 'Mitsubishi', 'Nissan', 'Suzuki', 'Toyota'];
const CITIES = ['All Cities', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 'Gampaha', 'Jaffna', 'Kalutara', 'Kandy', 'Kurunegala', 'Matara', 'Ratnapura'];
const FUEL_TYPES = ['Any Fuel', 'Diesel', 'Electric', 'Hybrid', 'Petrol'];
const BODY_TYPES = ['Any Type', 'Coupé', 'Hatchback', 'Jeep', 'Pickup', 'SUV', 'Sedan', 'Van'];
const CONDITIONS = ['Any Condition', 'New', 'Reconditioned', 'Used'];
const TRANSMISSIONS = ['Any Gear', 'Automatic', 'Manual', 'Tiptronic'];
const YEARS = ['Any Year', ...Array.from({ length: 27 }, (_, i) => String(2026 - i))];

const MarketplaceFeed = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Listings State
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter Form State
  const [filters, setFilters] = useState({
    make: 'All Makes',
    model: '',
    bodyType: 'Any Type',
    condition: 'Any Condition',
    location: 'All Cities',
    fuelType: 'Any Fuel',
    transmission: 'Any Gear',
    yearMin: 'Any Year',
    yearMax: 'Any Year',
    minPrice: '',
    maxPrice: '',
  });

  // UI State for Custom Selects
  const [pickerVisible, setPickerVisible] = useState(false);
  const [activePicker, setActivePicker] = useState(null); // { field, title, options }

  const loadListings = async (customParams = null) => {
    setLoading(true);
    try {
      const p = customParams || filters;
      // Map display labels to API keys if they differ
      const params = {
        make: p.make === 'All Makes' ? '' : p.make,
        model: p.model,
        bodyType: p.bodyType === 'Any Type' ? '' : p.bodyType,
        condition: p.condition === 'Any Condition' ? '' : p.condition,
        location: p.location === 'All Cities' ? '' : p.location,
        fuelType: p.fuelType === 'Any Fuel' ? '' : p.fuelType,
        transmission: p.transmission === 'Any Gear' ? '' : p.transmission,
        yearMin: p.yearMin === 'Any Year' ? '' : p.yearMin,
        yearMax: p.yearMax === 'Any Year' ? '' : p.yearMax,
        minPrice: p.minPrice,
        maxPrice: p.maxPrice,
      };
      const data = await fetchListings(params);
      setListings(data);
    } catch (error) {
      console.error('Fetch Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => { loadListings(); }, [])
  );

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const openPicker = (field, title, options) => {
    setActivePicker({ field, title, options });
    setPickerVisible(true);
  };

  const selectOption = (val) => {
    if (activePicker) {
      updateFilter(activePicker.field, val);
    }
    setPickerVisible(false);
  };

  const formatPrice = (p) => `Rs. ${Number(p).toLocaleString()}`;

  const renderListing = ({ item }) => {
    const imageUri = item.images && item.images.length > 0
      ? resolveImageUrl(item.images[0])
      : 'https://via.placeholder.com/400x200?text=No+Image';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => router.push({ pathname: '/ListingDetails', params: { listingId: item._id } })}
      >
        <Image source={{ uri: imageUri }} style={styles.cardImage} />
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.year} {item.make} {item.model}</Text>
          <Text style={styles.cardPrice}>{formatPrice(item.price)}</Text>
          <View style={styles.specsRow}>
            <View style={styles.specChip}><Ionicons name="speedometer-outline" size={12} color="#636e72" /><Text style={styles.specText}>{item.mileage?.toLocaleString() || 0} km</Text></View>
            <View style={styles.specChip}><Ionicons name="flash-outline" size={12} color="#636e72" /><Text style={styles.specText}>{item.fuelType}</Text></View>
            <View style={styles.specChip}><Ionicons name="cog-outline" size={12} color="#636e72" /><Text style={styles.specText}>{item.condition || 'Used'}</Text></View>
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
    <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? insets.top : 10 }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0f7ff" />
      
      <FlatList
        data={listings}
        keyExtractor={(item) => item._id}
        renderItem={renderListing}
        ListHeaderComponent={
          <View style={styles.advancedFilterContainer}>
            <Text style={styles.filterTitle}>Find The Best Vehicle For You</Text>
            
            <View style={styles.filterGrid}>
              <SelectBox label={filters.make} onPress={() => openPicker('make', 'Select Make', MAKES)} width="31%" />
              <InputBox placeholder="Model (e.g. Civic)" value={filters.model} onChangeText={v => updateFilter('model', v)} width="31%" />
              <SelectBox label={filters.bodyType} onPress={() => openPicker('bodyType', 'Vehicle Type', BODY_TYPES)} width="31%" />
              
              <SelectBox label={filters.condition} onPress={() => openPicker('condition', 'Condition', CONDITIONS)} width="31%" />
              <SelectBox label={filters.location} onPress={() => openPicker('location', 'Location', CITIES)} width="31%" />
              <SelectBox label={filters.fuelType} onPress={() => openPicker('fuelType', 'Fuel Type', FUEL_TYPES)} width="31%" />
              
              <SelectBox label={filters.transmission} onPress={() => openPicker('transmission', 'Transmission', TRANSMISSIONS)} width="31%" />
              <SelectBox label={filters.yearMin} onPress={() => openPicker('yearMin', 'Year Min', YEARS)} width="31%" />
              <SelectBox label={filters.yearMax} onPress={() => openPicker('yearMax', 'Year Max', YEARS)} width="31%" />
              
              <InputBox placeholder="Min Price" value={filters.minPrice} onChangeText={v => updateFilter('minPrice', v)} width="31%" keyboardType="numeric" />
              <InputBox placeholder="Max Price" value={filters.maxPrice} onChangeText={v => updateFilter('maxPrice', v)} width="31%" keyboardType="numeric" />
              
              <TouchableOpacity style={styles.searchButton} activeOpacity={0.8} onPress={() => loadListings()}>
                <Feather name="search" size={18} color="#fff" />
                <Text style={styles.searchButtonText}>Search Vehicles</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <Ionicons name="car-outline" size={64} color="#dfe6e9" />
              <Text style={styles.emptyText}>No vehicles found</Text>
              <Text style={styles.emptySubText}>Try adjusting your filters</Text>
            </View>
          )
        }
      />

      {loading && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="#10ac84" />
        </View>
      )}

      {/* Custom Picker Modal */}
      <Modal visible={pickerVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setPickerVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>{activePicker?.title}</Text>
                <FlatList
                  data={activePicker?.options}
                  keyExtractor={i => i}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.optionItem} onPress={() => selectOption(item)}>
                      <Text style={[styles.optionText, filters[activePicker.field] === item && styles.optionTextActive]}>{item}</Text>
                      {filters[activePicker.field] === item && <Ionicons name="checkmark" size={18} color="#10ac84" />}
                    </TouchableOpacity>
                  )}
                  style={{ maxHeight: 400 }}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const SelectBox = ({ label, onPress, width }) => (
  <TouchableOpacity style={[styles.fieldBox, { width }]} activeOpacity={0.7} onPress={onPress}>
    <Text style={styles.fieldText} numberOfLines={1}>{label}</Text>
    <Ionicons name="chevron-down" size={14} color="#b2bec3" />
  </TouchableOpacity>
);

const InputBox = ({ placeholder, value, onChangeText, width, keyboardType }) => (
  <TextInput
    style={[styles.fieldBox, { width }]}
    placeholder={placeholder}
    placeholderTextColor="#b2bec3"
    value={value}
    onChangeText={onChangeText}
    keyboardType={keyboardType || 'default'}
  />
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  
  advancedFilterContainer: { backgroundColor: '#f0f7ff', padding: 15, paddingBottom: 25 },
  filterTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a2e', textAlign: 'center', marginBottom: 20 },
  filterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  
  fieldBox: { height: 44, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e1e8ef', paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 },
  fieldText: { fontSize: 13, color: '#2d3436', flex: 1 },
  
  searchButton: { width: '31%', height: 44, backgroundColor: '#00a651', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  searchButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  card: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16, borderRadius: 12, overflow: 'hidden', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 }, android: { elevation: 3 } }) },
  cardImage: { width: '100%', height: 200, resizeMode: 'cover' },
  cardBody: { padding: 15 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 5 },
  cardPrice: { fontSize: 18, fontWeight: '800', color: '#10ac84', marginBottom: 10 },
  specsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  specChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f1f3f5', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
  specText: { fontSize: 11, color: '#636e72', fontWeight: '600' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 12, color: '#636e72' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 50, marginTop: 50 },
  emptyText: { fontSize: 16, color: '#636e72', fontWeight: '700', marginTop: 15 },
  emptySubText: { fontSize: 13, color: '#b2bec3', marginTop: 5 },

  loaderOverlay: { position: 'absolute', top: 300, left: 0, right: 0, alignItems: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 30 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a2e', marginBottom: 15, textAlign: 'center' },
  optionItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f3f5' },
  optionText: { fontSize: 15, color: '#2d3436' },
  optionTextActive: { color: '#10ac84', fontWeight: '700' },
});

export default MarketplaceFeed;
