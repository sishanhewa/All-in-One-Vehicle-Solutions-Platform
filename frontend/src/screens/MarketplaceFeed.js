import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, StatusBar, Platform, ScrollView, Modal, TouchableWithoutFeedback, LayoutAnimation } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchListings, resolveImageUrl } from '../api/marketplaceApi';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';

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
  
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [activePicker, setActivePicker] = useState(null);

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

  const loadListings = async (customFilters = null) => {
    setLoading(true);
    try {
      const f = customFilters || filters;
      const params = {
        make: f.make === 'All Makes' ? '' : f.make,
        model: f.model,
        bodyType: f.bodyType === 'Any Type' ? '' : f.bodyType,
        condition: f.condition === 'Any Condition' ? '' : f.condition,
        location: f.location === 'All Cities' ? '' : f.location,
        fuelType: f.fuelType === 'Any Fuel' ? '' : f.fuelType,
        transmission: f.transmission === 'Any Gear' ? '' : f.transmission,
        yearMin: f.yearMin === 'Any Year' ? '' : f.yearMin,
        yearMax: f.yearMax === 'Any Year' ? '' : f.yearMax,
        minPrice: f.minPrice,
        maxPrice: f.maxPrice,
      };
      const data = await fetchListings(params);
      setListings(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadListings(); }, []));

  const toggleAdvanced = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowAdvanced(!showAdvanced);
  };

  const updateFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  const formatPrice = (p) => `Rs. ${Number(p).toLocaleString()}`;

  const renderListing = ({ item }) => {
    const imageUri = item.images?.length ? resolveImageUrl(item.images[0]) : 'https://via.placeholder.com/400x200?text=No+Image';
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={() => router.push({ pathname: '/ListingDetails', params: { listingId: item._id } })}>
        <Image source={{ uri: imageUri }} style={styles.cardImage} />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.year} {item.make} {item.model}</Text>
          <Text style={styles.cardPrice}>{formatPrice(item.price)}</Text>
          <View style={styles.cardMeta}>
            <View style={styles.metaItem}><Ionicons name="speedometer-outline" size={14} color="#636e72" /><Text style={styles.metaText}>{item.mileage?.toLocaleString()} km</Text></View>
            <View style={styles.metaItem}><Ionicons name="location-outline" size={14} color="#636e72" /><Text style={styles.metaText}>{item.location}</Text></View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      
      {/* RESTORED CLEAN PREVIOUS HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.logo}>Vehicle<Text style={styles.logoAccent}>Market</Text></Text>
            <Text style={styles.subHeader}>Buy & Sell Vehicles in Sri Lanka</Text>
          </View>
          <TouchableOpacity style={styles.postBtn} onPress={() => router.push('/CreateListing')}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.postText}>Post</Text>
          </TouchableOpacity>
        </View>

        {/* CLEAN SEARCH BAR WITH INTEGRATED TOGGLE */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Feather name="search" size={18} color="#b2bec3" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search make or model..."
              value={filters.model}
              onChangeText={v => updateFilter('model', v)}
              onSubmitEditing={() => loadListings()}
            />
            {filters.model !== '' && (
              <TouchableOpacity onPress={() => { updateFilter('model', ''); loadListings({ ...filters, model: '' }); }}>
                <Ionicons name="close-circle" size={18} color="#b2bec3" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
            style={[styles.filterToggle, showAdvanced && styles.filterToggleActive]} 
            onPress={toggleAdvanced}
          >
            <MaterialCommunityIcons name={showAdvanced ? "filter-variant-remove" : "filter-variant"} size={22} color={showAdvanced ? "#fff" : "#10ac84"} />
          </TouchableOpacity>
        </View>
      </View>

      {/* CLEAN ADVANCED FILTER GRID (TOGGLEABLE) */}
      {showAdvanced && (
        <View style={styles.advFilterArea}>
          <View style={styles.grid}>
            <FilterSelect active={filters.make} label="Make" options={MAKES} onSelect={v => updateFilter('make', v)} />
            <FilterSelect active={filters.bodyType} label="Type" options={BODY_TYPES} onSelect={v => updateFilter('bodyType', v)} />
            <FilterSelect active={filters.condition} label="Condition" options={CONDITIONS} onSelect={v => updateFilter('condition', v)} />
            <FilterSelect active={filters.location} label="City" options={CITIES} onSelect={v => updateFilter('location', v)} />
            <FilterSelect active={filters.yearMin} label="Year Min" options={YEARS} onSelect={v => updateFilter('yearMin', v)} />
            <FilterSelect active={filters.yearMax} label="Year Max" options={YEARS} onSelect={v => updateFilter('yearMax', v)} />
            
            <TextInput style={styles.gridInput} placeholder="Min Price" keyboardType="numeric" value={filters.minPrice} onChangeText={v => updateFilter('minPrice', v)} />
            <TextInput style={styles.gridInput} placeholder="Max Price" keyboardType="numeric" value={filters.maxPrice} onChangeText={v => updateFilter('maxPrice', v)} />
            
            <TouchableOpacity style={styles.applyButton} onPress={() => { loadListings(); setShowAdvanced(false); }}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#10ac84" /></View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={i => i._id}
          renderItem={renderListing}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="car-outline" size={64} color="#dfe6e9" />
              <Text style={styles.emptyText}>No vehicles found</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const FilterSelect = ({ active, label, options, onSelect }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity style={styles.gridBox} onPress={() => setOpen(true)}>
        <Text style={styles.gridText} numberOfLines={1}>{active.startsWith('Any') || active.startsWith('All') ? label : active}</Text>
        <Ionicons name="chevron-down" size={12} color="#b2bec3" />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{label}</Text>
              <FlatList
                data={options}
                keyExtractor={i => i}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.option} onPress={() => { onSelect(item); setOpen(false); }}>
                    <Text style={[styles.optionText, active === item && styles.optionActive]}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { backgroundColor: '#fff', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 15 },
  logo: { fontSize: 24, fontWeight: '800', color: '#1a1a2e', letterSpacing: -0.5 },
  logoAccent: { color: '#10ac84' },
  subHeader: { fontSize: 13, color: '#636e72', marginTop: 2 },
  postBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#10ac84', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  postText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  
  searchContainer: { flexDirection: 'row', gap: 10 },
  searchBar: { flex: 1, height: 46, backgroundColor: '#f1f3f5', borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: '#1a1a2e' },
  filterToggle: { width: 46, height: 46, borderRadius: 12, borderWidth: 1, borderColor: '#10ac84', alignItems: 'center', justifyContent: 'center' },
  filterToggleActive: { backgroundColor: '#10ac84' },

  advFilterArea: { backgroundColor: '#fff', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridBox: { width: '48.5%', height: 40, backgroundColor: '#f8f9fa', borderRadius: 8, borderWidth: 1, borderColor: '#e9ecef', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 },
  gridText: { fontSize: 12, color: '#2d3436' },
  gridInput: { width: '48.5%', height: 40, backgroundColor: '#f8f9fa', borderRadius: 8, borderWidth: 1, borderColor: '#e9ecef', paddingHorizontal: 10, fontSize: 12 },
  applyButton: { width: '100%', height: 44, backgroundColor: '#10ac84', borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
  applyButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  card: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16, borderRadius: 16, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  cardImage: { width: '100%', height: 200 },
  cardContent: { padding: 15 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a2e' },
  cardPrice: { fontSize: 19, fontWeight: '800', color: '#10ac84', marginVertical: 5 },
  cardMeta: { flexDirection: 'row', gap: 15 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#636e72' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#636e72', marginTop: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 40 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 15 },
  option: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f3f5' },
  optionText: { fontSize: 15, color: '#2d3436' },
  optionActive: { color: '#10ac84', fontWeight: '800' },
});

export default MarketplaceFeed;
