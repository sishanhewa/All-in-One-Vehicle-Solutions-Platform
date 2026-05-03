import React, { useState, useCallback, useContext } from 'react';
import {
  View, Text, FlatList, Image, StyleSheet, TouchableOpacity,
  ActivityIndicator, TextInput, StatusBar, Platform, ScrollView,
  Modal, TouchableWithoutFeedback, LayoutAnimation, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchParts, resolveImageUrl } from '../api/sparePartsApi';
import { AuthContext } from '../context/AuthContext';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';

const CATEGORIES = ['All Categories', 'Engine', 'Brakes', 'Suspension', 'Electrical', 'Body', 'Interior', 'Exhaust', 'Transmission', 'Wheels & Tires', 'Other'];
const CONDITIONS = ['Any Condition', 'New', 'Used', 'Refurbished'];
const MAKES = ['All Makes', 'Audi', 'BMW', 'Honda', 'Hyundai', 'Kia', 'Mercedes-Benz', 'Mitsubishi', 'Nissan', 'Suzuki', 'Toyota'];

const CATEGORY_ICONS = {
  'Engine': 'settings-outline',
  'Brakes': 'disc-outline',
  'Suspension': 'git-merge-outline',
  'Electrical': 'flash-outline',
  'Body': 'car-outline',
  'Interior': 'grid-outline',
  'Exhaust': 'cloud-outline',
  'Transmission': 'cog-outline',
  'Wheels & Tires': 'ellipse-outline',
  'Other': 'construct-outline',
};

const SparePartsFeed = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userInfo } = useContext(AuthContext);

  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [activePicker, setActivePicker] = useState(null);

  const [filters, setFilters] = useState({
    search: '',
    category: 'All Categories',
    condition: 'Any Condition',
    make: 'All Makes',
    minPrice: '',
    maxPrice: '',
  });

  const loadParts = async (customFilters = null) => {
    setLoading(true);
    try {
      const f = customFilters || filters;
      const params = {
        search: f.search,
        category: f.category === 'All Categories' ? '' : f.category,
        condition: f.condition === 'Any Condition' ? '' : f.condition,
        make: f.make === 'All Makes' ? '' : f.make,
        minPrice: f.minPrice,
        maxPrice: f.maxPrice,
      };
      const data = await fetchParts(params);
      setParts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadParts();
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { loadParts(); }, []));

  const toggleFilters = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowFilters(!showFilters);
  };

  const updateFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  const openPicker = (type) => {
    setActivePicker(type);
    setPickerVisible(true);
  };

  const getPickerOptions = () => {
    switch (activePicker) {
      case 'category': return CATEGORIES;
      case 'condition': return CONDITIONS;
      case 'make': return MAKES;
      default: return [];
    }
  };

  const getPickerValue = () => {
    switch (activePicker) {
      case 'category': return filters.category;
      case 'condition': return filters.condition;
      case 'make': return filters.make;
      default: return '';
    }
  };

  const formatPrice = (p) => `Rs. ${Number(p).toLocaleString()}`;

  const getCategoryColor = (cat) => {
    const colors = {
      'Engine': '#e74c3c', 'Brakes': '#e67e22', 'Suspension': '#f1c40f',
      'Electrical': '#3498db', 'Body': '#9b59b6', 'Interior': '#1abc9c',
      'Exhaust': '#95a5a6', 'Transmission': '#e91e63', 'Wheels & Tires': '#2c3e50',
      'Other': '#7f8c8d',
    };
    return colors[cat] || '#7f8c8d';
  };

  const renderPart = ({ item }) => {
    const imageUri = item.images?.length ? resolveImageUrl(item.images[0]) : 'https://via.placeholder.com/400x200?text=No+Image';
    const compatibility = item.compatibility;
    const compatText = compatibility?.make
      ? `${compatibility.make}${compatibility.model ? ' ' + compatibility.model : ''}${compatibility.yearFrom ? ' (' + compatibility.yearFrom + (compatibility.yearTo ? '-' + compatibility.yearTo : '+') + ')' : ''}`
      : null;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => router.push({ pathname: '/SparePartDetails', params: { partId: item._id } })}
      >
        <Image source={{ uri: imageUri }} style={styles.cardImage} />
        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <View style={[styles.categoryBadge, { backgroundColor: `${getCategoryColor(item.category)}15` }]}>
              <Ionicons name={CATEGORY_ICONS[item.category] || 'construct-outline'} size={12} color={getCategoryColor(item.category)} />
              <Text style={[styles.categoryBadgeText, { color: getCategoryColor(item.category) }]}>{item.category}</Text>
            </View>
            <View style={[styles.conditionBadge, { backgroundColor: item.condition === 'New' ? '#e8f5e9' : item.condition === 'Refurbished' ? '#fff3e0' : '#f5f5f5' }]}>
              <Text style={[styles.conditionText, { color: item.condition === 'New' ? '#2e7d32' : item.condition === 'Refurbished' ? '#e65100' : '#616161' }]}>{item.condition}</Text>
            </View>
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.partName}</Text>
          {compatText && (
            <View style={styles.compatRow}>
              <Ionicons name="car-sport-outline" size={13} color="#b2bec3" />
              <Text style={styles.compatText} numberOfLines={1}>{compatText}</Text>
            </View>
          )}
          <View style={styles.cardFooter}>
            <Text style={styles.cardPrice}>{formatPrice(item.price)}</Text>
            {item.location && (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={13} color="#b2bec3" />
                <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
              </View>
            )}
          </View>
          {item.quantity > 1 && (
            <Text style={styles.qtyText}>Qty: {item.quantity} available</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="construct-outline" size={64} color="#dfe6e9" />
      <Text style={styles.emptyTitle}>No Spare Parts Found</Text>
      <Text style={styles.emptyText}>Try adjusting your filters or check back later</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="car-wrench" size={26} color="#10ac84" />
          <Text style={styles.headerTitle}>Spare Parts</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerBtn} onPress={toggleFilters}>
            <Ionicons name="options-outline" size={22} color={showFilters ? '#10ac84' : '#636e72'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#b2bec3" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search parts, part numbers, makes..."
          placeholderTextColor="#b2bec3"
          value={filters.search}
          onChangeText={(text) => updateFilter('search', text)}
          onSubmitEditing={() => loadParts()}
          returnKeyType="search"
        />
        {filters.search ? (
          <TouchableOpacity onPress={() => { updateFilter('search', ''); loadParts({ ...filters, search: '' }); }}>
            <Ionicons name="close-circle" size={18} color="#b2bec3" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Chips */}
      {showFilters && (
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            <TouchableOpacity style={[styles.chip, filters.category !== 'All Categories' && styles.chipActive]} onPress={() => openPicker('category')}>
              <Ionicons name="layers-outline" size={14} color={filters.category !== 'All Categories' ? '#fff' : '#636e72'} />
              <Text style={[styles.chipText, filters.category !== 'All Categories' && styles.chipTextActive]}>{filters.category}</Text>
              <Ionicons name="chevron-down" size={12} color={filters.category !== 'All Categories' ? '#fff' : '#b2bec3'} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.chip, filters.condition !== 'Any Condition' && styles.chipActive]} onPress={() => openPicker('condition')}>
              <Ionicons name="checkmark-circle-outline" size={14} color={filters.condition !== 'Any Condition' ? '#fff' : '#636e72'} />
              <Text style={[styles.chipText, filters.condition !== 'Any Condition' && styles.chipTextActive]}>{filters.condition}</Text>
              <Ionicons name="chevron-down" size={12} color={filters.condition !== 'Any Condition' ? '#fff' : '#b2bec3'} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.chip, filters.make !== 'All Makes' && styles.chipActive]} onPress={() => openPicker('make')}>
              <Ionicons name="car-outline" size={14} color={filters.make !== 'All Makes' ? '#fff' : '#636e72'} />
              <Text style={[styles.chipText, filters.make !== 'All Makes' && styles.chipTextActive]}>{filters.make}</Text>
              <Ionicons name="chevron-down" size={12} color={filters.make !== 'All Makes' ? '#fff' : '#b2bec3'} />
            </TouchableOpacity>
          </ScrollView>
          <View style={styles.priceFilterRow}>
            <TextInput
              style={styles.priceInput}
              placeholder="Min Price"
              placeholderTextColor="#b2bec3"
              keyboardType="numeric"
              value={filters.minPrice}
              onChangeText={(v) => updateFilter('minPrice', v)}
            />
            <Text style={styles.priceDash}>—</Text>
            <TextInput
              style={styles.priceInput}
              placeholder="Max Price"
              placeholderTextColor="#b2bec3"
              keyboardType="numeric"
              value={filters.maxPrice}
              onChangeText={(v) => updateFilter('maxPrice', v)}
            />
            <TouchableOpacity style={styles.applyBtn} onPress={() => loadParts()}>
              <Text style={styles.applyBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Parts List */}
      {loading && !refreshing ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#10ac84" />
          <Text style={styles.loaderText}>Loading spare parts...</Text>
        </View>
      ) : (
        <FlatList
          data={parts}
          keyExtractor={(item) => item._id}
          renderItem={renderPart}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState />}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10ac84" />}
        />
      )}

      {/* FAB - Add Spare Part */}
      {userInfo && (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.85}
          onPress={() => router.push('/CreateSparePart')}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Bottom Picker Modal */}
      <Modal visible={pickerVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setPickerVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>
                  {activePicker === 'category' ? 'Select Category' : activePicker === 'condition' ? 'Select Condition' : 'Select Make'}
                </Text>
                <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                  {getPickerOptions().map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[styles.modalOption, getPickerValue() === option && styles.modalOptionActive]}
                      onPress={() => {
                        updateFilter(activePicker, option);
                        setPickerVisible(false);
                        loadParts({ ...filters, [activePicker]: option });
                      }}
                    >
                      <Text style={[styles.modalOptionText, getPickerValue() === option && styles.modalOptionTextActive]}>
                        {option}
                      </Text>
                      {getPickerValue() === option && <Ionicons name="checkmark" size={20} color="#10ac84" />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f3f5' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1a1a2e' },
  headerRight: { flexDirection: 'row', gap: 4 },
  headerBtn: { padding: 8, borderRadius: 12, backgroundColor: '#f8f9fa' },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, marginBottom: 4, borderRadius: 14, paddingHorizontal: 14, height: 48, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }, android: { elevation: 2 } }) },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#1a1a2e' },

  filterSection: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 8, borderRadius: 14, padding: 12, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }, android: { elevation: 2 } }) },
  chipRow: { marginBottom: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#f8f9fa', borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#eee' },
  chipActive: { backgroundColor: '#10ac84', borderColor: '#10ac84' },
  chipText: { fontSize: 13, color: '#636e72', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  priceFilterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceInput: { flex: 1, backgroundColor: '#f8f9fa', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1a1a2e', borderWidth: 1, borderColor: '#eee' },
  priceDash: { color: '#b2bec3', fontSize: 16 },
  applyBtn: { backgroundColor: '#10ac84', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100 },
  card: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 14, overflow: 'hidden', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 12 }, android: { elevation: 3 } }) },
  cardImage: { width: '100%', height: 180, backgroundColor: '#f1f3f5' },
  cardBody: { padding: 14 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  categoryBadgeText: { fontSize: 11, fontWeight: '700' },
  conditionBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  conditionText: { fontSize: 11, fontWeight: '700' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 6 },
  compatRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  compatText: { fontSize: 13, color: '#b2bec3', flex: 1 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardPrice: { fontSize: 18, fontWeight: '800', color: '#10ac84' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locationText: { fontSize: 12, color: '#b2bec3', maxWidth: 120 },
  qtyText: { fontSize: 12, color: '#636e72', marginTop: 4, fontWeight: '600' },

  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 12, color: '#b2bec3', fontSize: 14 },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#636e72', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#b2bec3', marginTop: 6 },

  fab: { position: 'absolute', bottom: 24, right: 20, width: 58, height: 58, borderRadius: 29, backgroundColor: '#10ac84', justifyContent: 'center', alignItems: 'center', ...Platform.select({ ios: { shadowColor: '#10ac84', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10 }, android: { elevation: 8 } }) },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40, maxHeight: '60%' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#dfe6e9', alignSelf: 'center', marginTop: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a2e', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  modalScroll: { paddingHorizontal: 20 },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f8f9fa' },
  modalOptionActive: { backgroundColor: '#f0faf7', marginHorizontal: -20, paddingHorizontal: 20, borderRadius: 0 },
  modalOptionText: { fontSize: 16, color: '#636e72' },
  modalOptionTextActive: { color: '#10ac84', fontWeight: '700' },
});

export default SparePartsFeed;
