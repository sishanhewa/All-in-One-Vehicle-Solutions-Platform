import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, StatusBar, Platform, ScrollView, Modal, TouchableWithoutFeedback, LayoutAnimation } from 'react-native';
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

  // UI State
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [activePicker, setActivePicker] = useState(null);

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

  const loadListings = async (customParams = null) => {
    setLoading(true);
    try {
      const p = customParams || filters;
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

  const toggleAdvanced = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowAdvanced(!showAdvanced);
  };

  const updateFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  const openPicker = (field, title, options) => {
    setActivePicker({ field, title, options });
    setPickerVisible(true);
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Restore Previous Header */}
      <View style={styles.mainHeader}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.logo}>Vehicle<Text style={styles.logoAccent}>Market</Text></Text>
            <Text style={styles.subHeader}>Buy & Sell Vehicles in Sri Lanka</Text>
          </View>
          <TouchableOpacity style={styles.postBtnSmall} onPress={() => router.push('/CreateListing')}>
            <Ionicons name="add-circle" size={18} color="#fff" />
            <Text style={styles.postBtnText}>Post Ad</Text>
          </TouchableOpacity>
        </View>

        {/* Search & Toggle Row */}
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <Feather name="search" size={18} color="#b2bec3" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by model or brand..."
              value={filters.model}
              onChangeText={v => updateFilter('model', v)}
              onSubmitEditing={() => loadListings()}
            />
          </View>
          <TouchableOpacity 
            style={[styles.toggleBtn, showAdvanced && styles.toggleBtnActive]} 
            onPress={toggleAdvanced}
          >
            <Ionicons name={showAdvanced ? "options" : "options-outline"} size={20} color={showAdvanced ? "#fff" : "#10ac84"} />
            <Text style={[styles.toggleBtnText, showAdvanced && styles.toggleBtnTextActive]}>Filters</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Toggleable Advanced Filter Section */}
      {showAdvanced && (
        <View style={styles.advancedFilterArea}>
          <Text style={styles.advTitle}>Advanced Filters</Text>
          <View style={styles.filterGrid}>
            <SelectBox label={filters.make} onPress={() => openPicker('make', 'Select Make', MAKES)} width="31%" />
            <SelectBox label={filters.bodyType} onPress={() => openPicker('bodyType', 'Type', BODY_TYPES)} width="31%" />
            <SelectBox label={filters.condition} onPress={() => openPicker('condition', 'Condition', CONDITIONS)} width="31%" />
            
            <SelectBox label={filters.location} onPress={() => openPicker('location', 'City', CITIES)} width="31%" />
            <SelectBox label={filters.fuelType} onPress={() => openPicker('fuelType', 'Fuel', FUEL_TYPES)} width="31%" />
            <SelectBox label={filters.transmission} onPress={() => openPicker('transmission', 'Gear', TRANSMISSIONS)} width="31%" />
            
            <SelectBox label={filters.yearMin} onPress={() => openPicker('yearMin', 'Year Min', YEARS)} width="48%" />
            <SelectBox label={filters.yearMax} onPress={() => openPicker('yearMax', 'Year Max', YEARS)} width="48%" />
            
            <InputBox placeholder="Min Price" value={filters.minPrice} onChangeText={v => updateFilter('minPrice', v)} width="48%" keyboardType="numeric" />
            <InputBox placeholder="Max Price" value={filters.maxPrice} onChangeText={v => updateFilter('maxPrice', v)} width="48%" keyboardType="numeric" />
            
            <TouchableOpacity style={styles.applyBtn} onPress={() => { loadListings(); setShowAdvanced(false); }}>
              <Text style={styles.applyBtnText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#10ac84" />
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item._id}
          renderItem={renderListing}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="car-outline" size={64} color="#dfe6e9" />
              <Text style={styles.emptyText}>No results found</Text>
              <Text style={styles.emptySubText}>Try simplifying your search</Text>
            </View>
          }
        />
      )}

      {/* Picker Modal */}
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
                    <TouchableOpacity style={styles.optionItem} onPress={() => { updateFilter(activePicker.field, item); setPickerVisible(false); }}>
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
  <TouchableOpacity style={[styles.fieldBox, { width }]} onPress={onPress}>
    <Text style={styles.fieldText} numberOfLines={1}>{label}</Text>
    <Ionicons name="chevron-down" size={12} color="#b2bec3" />
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
  container: { flex: 1, backgroundColor: '#fcfcfc' },
  
  mainHeader: { paddingHorizontal: 20, paddingBottom: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f3f5' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 15 },
  logo: { fontSize: 24, fontWeight: '800', color: '#1a1a2e', letterSpacing: -0.5 },
  logoAccent: { color: '#10ac84' },
  subHeader: { fontSize: 13, color: '#636e72', marginTop: 2 },
  postBtnSmall: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#10ac84', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  postBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  searchRow: { flexDirection: 'row', gap: 10 },
  searchInputWrap: { flex: 1, height: 48, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 12, paddingHorizontal: 15, borderWidth: 1, borderColor: '#e9ecef' },
  searchInput: { flex: 1, fontSize: 15, marginLeft: 8, color: '#1a1a2e' },
  toggleBtn: { height: 48, paddingHorizontal: 15, borderRadius: 12, borderWidth: 1, borderColor: '#10ac84', flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleBtnActive: { backgroundColor: '#10ac84' },
  toggleBtnText: { color: '#10ac84', fontSize: 14, fontWeight: '700' },
  toggleBtnTextActive: { color: '#fff' },

  advancedFilterArea: { backgroundColor: '#f0f7ff', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e1e8ef' },
  advTitle: { fontSize: 15, fontWeight: '800', color: '#1a1a2e', marginBottom: 15 },
  filterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  fieldBox: { height: 42, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e1e8ef', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fieldText: { fontSize: 13, color: '#2d3436', flex: 1 },
  applyBtn: { width: '100%', height: 46, backgroundColor: '#10ac84', borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  applyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  card: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16, borderRadius: 15, overflow: 'hidden', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 10 }, android: { elevation: 3 } }) },
  cardImage: { width: '100%', height: 210, resizeMode: 'cover' },
  cardBody: { padding: 16 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a2e', marginBottom: 6 },
  cardPrice: { fontSize: 19, fontWeight: '800', color: '#10ac84', marginBottom: 12 },
  specsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  specChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#f3f5f7', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8 },
  specText: { fontSize: 12, color: '#636e72', fontWeight: '600' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  locationText: { fontSize: 13, color: '#636e72' },

  loaderWrap: { padding: 50, alignItems: 'center' },
  emptyContainer: { padding: 60, alignItems: 'center' },
  emptyText: { fontSize: 17, color: '#636e72', fontWeight: '700', marginTop: 15 },
  emptySubText: { fontSize: 14, color: '#b2bec3', marginTop: 6 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 30 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 25 },
  modalTitle: { fontSize: 19, fontWeight: '800', color: '#1a1a2e', marginBottom: 20, textAlign: 'center' },
  optionItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f3f5' },
  optionText: { fontSize: 16, color: '#2d3436' },
  optionTextActive: { color: '#10ac84', fontWeight: '700' },
});

export default MarketplaceFeed;
