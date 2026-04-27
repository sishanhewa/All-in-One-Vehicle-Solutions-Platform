import React, { useState, useCallback, useContext, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { fetchAllGarages, resolveServiceImageUrl } from '../api/serviceApi';
import { AuthContext } from '../context/AuthContext';

const CITIES = ['All Cities', 'Colombo', 'Kandy', 'Gampaha', 'Kurunegala', 'Kalutara', 'Galle', 'Matara', 'Ratnapura', 'Anuradhapura', 'Jaffna', 'Batticaloa', 'Badulla'];
const CATEGORIES = ['All', 'Oil Change', 'Engine', 'Brakes', 'Tires', 'AC', 'Electrical', 'Bodywork', 'Diagnostics', 'Transmission'];

const ACCENT = '#8e44ad';

const ServiceHome = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userInfo } = useContext(AuthContext);

  const [garages, setGarages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const searchTextRef = useRef(searchText);
  searchTextRef.current = searchText;

  const loadGarages = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        const params = {};
        if (selectedCity !== 'All Cities') params.city = selectedCity;
        if (selectedCategory !== 'All') params.category = selectedCategory;
        const term = searchTextRef.current.trim();
        if (term) {
          params.search = term;
        }
        const data = await fetchAllGarages(params);
        const list = Array.isArray(data?.garages) ? data.garages : Array.isArray(data) ? data : [];
        setGarages(list);
      } catch (error) {
        console.error('Fetch garages error:', error);
      } finally {
        if (isRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [selectedCity, selectedCategory]
  );

  useFocusEffect(
    useCallback(() => {
      loadGarages(false);
    }, [loadGarages])
  );

  const handleSearch = () => {
    loadGarages(false);
  };

  const onRefresh = () => {
    loadGarages(true);
  };

  const renderStars = (rating) => {
    const stars = [];
    const r = Math.round(Number(rating) || 0);
    for (let i = 1; i <= 5; i += 1) {
      stars.push(
        <Text key={i} style={[styles.starGlyph, i > r && styles.starGlyphEmpty]}>
          ★
        </Text>
      );
    }
    return stars;
  };

  const renderGarageCard = ({ item: garage }) => {
    const logoUri = garage.logo ? resolveServiceImageUrl(garage.logo) : null;
    const offeringCount = garage.offeringCount ?? 0;
    const rating = garage.rating ?? 0;
    const totalReviews = garage.totalReviews ?? 0;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: '/GarageDetails', params: { garageId: garage._id } })}
      >
        <View style={styles.cardInner}>
          {logoUri ? (
            <Image source={{ uri: logoUri }} style={styles.garageLogo} />
          ) : (
            <View style={styles.garageLogoPlaceholder}>
              <Ionicons name="construct" size={24} color="#fff" />
            </View>
          )}
          <View style={styles.cardInfo}>
            <Text style={styles.garageName} numberOfLines={1}>
              {garage.garageName}
            </Text>
            <View style={styles.cityRow}>
              <Ionicons name="location-outline" size={13} color="#636e72" />
              <Text style={styles.cityText}>{garage.city || '—'}</Text>
            </View>
            <View style={styles.ratingRow}>
              <View style={styles.stars}>{renderStars(rating)}</View>
              <Text style={styles.reviewCount}>
                ({totalReviews} review{totalReviews !== 1 ? 's' : ''})
              </Text>
            </View>
            <Text style={styles.offeringLine}>{offeringCount} services</Text>
            {Array.isArray(garage.serviceCategories) && garage.serviceCategories.length > 0 && (
              <View style={styles.catChipRow}>
                {garage.serviceCategories.slice(0, 3).map((cat) => (
                  <View key={cat} style={styles.catChip}>
                    <Text style={styles.catChipText}>{cat}</Text>
                  </View>
                ))}
                {garage.serviceCategories.length > 3 && (
                  <View style={styles.catChip}>
                    <Text style={styles.catChipText}>+{garage.serviceCategories.length - 3}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const showGarageRegisterFooter = !userInfo || userInfo.role === 'User';

  const listFooter = () =>
    showGarageRegisterFooter ? (
      <TouchableOpacity style={styles.footerLink} activeOpacity={0.7} onPress={() => router.push('/GarageRegister')}>
        <Text style={styles.footerLinkText}>
          Are you a garage? Register here <Text style={styles.footerArrow}>→</Text>
        </Text>
      </TouchableOpacity>
    ) : (
      <View style={styles.footerSpacer} />
    );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <Text style={styles.logo}>
          Vehicle <Text style={styles.logoAccent}>Services</Text>
        </Text>
        <Text style={styles.subHeader}>Find garages for repairs and maintenance</Text>

        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <Feather name="search" size={16} color="#b2bec3" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search garages..."
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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipContainer}>
          {CITIES.map((city) => (
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

        {/* ── Category chips ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.chipScroll, { marginTop: 8 }]} contentContainerStyle={styles.chipContainer}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, selectedCategory === cat && styles.chipCatActive]}
              activeOpacity={0.7}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.chipText, selectedCategory === cat && styles.chipCatTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {!loading && (
        <View style={styles.resultBar}>
          <Text style={styles.resultTxt}>
            {garages.length} garage{garages.length !== 1 ? 's' : ''} found
          </Text>
        </View>
      )}

      {loading && !refreshing ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loaderTxt}>Finding garages...</Text>
        </View>
      ) : (
        <FlatList
          data={garages}
          keyExtractor={(item) => item._id}
          renderItem={renderGarageCard}
          contentContainerStyle={garages.length === 0 ? styles.listContentEmpty : styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} colors={[ACCENT]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="construct-outline" size={64} color="#dfe6e9" />
              <Text style={styles.emptyText}>No garages found</Text>
              <Text style={styles.emptySubText}>Try a different city or search term</Text>
            </View>
          }
          ListFooterComponent={listFooter}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 4 },
    }),
  },
  logo: { fontSize: 24, fontWeight: '800', color: '#1a1a2e', letterSpacing: -0.5, marginBottom: 4 },
  logoAccent: { color: ACCENT },
  subHeader: { fontSize: 14, color: '#636e72', marginBottom: 14 },

  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: '#e9ecef',
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#1a1a2e' },
  searchBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },

  chipScroll: { marginHorizontal: -20, paddingHorizontal: 0 },
  chipContainer: { paddingHorizontal: 20, gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#f1f3f5', borderWidth: 1, borderColor: '#e9ecef' },
  chipActive:        { backgroundColor: '#f4ecf7', borderColor: ACCENT },
  chipCatActive:     { backgroundColor: '#fff5ed', borderColor: '#e67e22' },
  chipText:          { fontSize: 13, color: '#636e72', fontWeight: '600' },
  chipTextActive:    { color: ACCENT },
  chipCatTextActive: { color: '#e67e22' },

  catChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  catChip:    { backgroundColor: '#f4ecf7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  catChipText: { fontSize: 10, color: ACCENT, fontWeight: '700' },

  resultBar: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  resultTxt: { color: '#636e72', fontSize: 13, fontWeight: '600' },

  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderTxt: { marginTop: 12, color: '#b2bec3', fontSize: 14 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#636e72', marginTop: 16 },
  emptySubText: { fontSize: 13, color: '#b2bec3', marginTop: 6 },

  listContent: { padding: 16, paddingBottom: 100 },
  listContentEmpty: { flexGrow: 1, padding: 16, paddingBottom: 100 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: ACCENT,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 10 },
      android: { elevation: 4 },
    }),
  },
  cardInner: { flexDirection: 'row', padding: 18 },
  garageLogo: { width: 56, height: 56, borderRadius: 14, resizeMode: 'cover', marginRight: 14 },
  garageLogoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardInfo: { flex: 1 },
  garageName: { fontSize: 17, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  cityText: { fontSize: 13, color: '#636e72' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  stars: { flexDirection: 'row', alignItems: 'center' },
  starGlyph: { fontSize: 14, color: '#f39c12', marginRight: 2 },
  starGlyphEmpty: { color: '#dfe6e9' },
  reviewCount: { fontSize: 12, color: '#b2bec3' },
  offeringLine: { fontSize: 13, color: ACCENT, fontWeight: '700', marginTop: 2 },

  footerLink: { paddingVertical: 24, paddingHorizontal: 16, alignItems: 'center' },
  footerLinkText: { fontSize: 14, color: ACCENT, fontWeight: '600' },
  footerArrow: { fontWeight: '800' },
  footerSpacer: { height: 24 },
});

export default ServiceHome;
