import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, StatusBar, Platform, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchAllCompanies, resolveInspectionImageUrl } from '../api/inspectionApi';
import { Ionicons, Feather } from '@expo/vector-icons';

const CITIES = ['All Cities', 'Colombo', 'Kandy', 'Gampaha', 'Kurunegala', 'Kalutara', 'Galle', 'Matara', 'Ratnapura', 'Anuradhapura', 'Jaffna', 'Batticaloa', 'Badulla'];

const InspectionHome = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [searchText, setSearchText] = useState('');

  useFocusEffect(
    useCallback(() => { loadCompanies(); }, [selectedCity])
  );

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const data = await fetchAllCompanies({ city: selectedCity, search: searchText });
      setCompanies(data);
    } catch (error) {
      console.error('Fetch Companies Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => { loadCompanies(); };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= Math.round(rating) ? 'star' : 'star-outline'}
          size={14}
          color={i <= Math.round(rating) ? '#f39c12' : '#dfe6e9'}
        />
      );
    }
    return stars;
  };

  const renderCompanyCard = ({ item }) => {
    const profile = item.companyProfile || {};
    const logoUri = profile.logo
      ? resolveInspectionImageUrl(profile.logo)
      : null;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: '/CompanyDetails', params: { companyId: item._id } })}
      >
        <View style={styles.cardTop}>
          {logoUri ? (
            <Image source={{ uri: logoUri }} style={styles.companyLogo} />
          ) : (
            <View style={styles.companyLogoPlaceholder}>
              <Feather name="shield" size={24} color="#fff" />
            </View>
          )}
          <View style={styles.cardInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.companyName} numberOfLines={1}>{profile.companyName || item.name}</Text>
              {profile.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#3498db" />
                </View>
              )}
            </View>
            <View style={styles.cityRow}>
              <Ionicons name="location-outline" size={13} color="#636e72" />
              <Text style={styles.cityText}>{profile.city || 'Unknown'}</Text>
            </View>
            <View style={styles.ratingRow}>
              <View style={styles.stars}>{renderStars(profile.rating || 0)}</View>
              <Text style={styles.reviewCount}>({profile.totalReviews || 0} reviews)</Text>
            </View>
          </View>
        </View>

        {profile.description ? (
          <Text style={styles.descText} numberOfLines={2}>{profile.description}</Text>
        ) : null}

        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <Ionicons name="time-outline" size={14} color="#636e72" />
            <Text style={styles.footerText}>{profile.operatingHours || 'Not specified'}</Text>
          </View>
          <View style={styles.footerItem}>
            <Feather name="package" size={14} color="#10ac84" />
            <Text style={[styles.footerText, { color: '#10ac84', fontWeight: '700' }]}>
              {item.packageCount || 0} package{(item.packageCount || 0) !== 1 ? 's' : ''}
            </Text>
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
        <Text style={styles.logo}>Vehicle<Text style={styles.logoAccent}>Inspect</Text></Text>
        <Text style={styles.subHeader}>Find Trusted Inspection Companies</Text>

        {/* Search Bar */}
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <Feather name="search" size={16} color="#b2bec3" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search companies..."
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

        {/* City Filter Chips */}
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
      </View>

      {/* Result Count */}
      {!loading && (
        <View style={styles.resultBar}>
          <Text style={styles.resultTxt}>{companies.length} compan{companies.length !== 1 ? 'ies' : 'y'} found</Text>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#10ac84" />
          <Text style={styles.loaderTxt}>Finding inspection companies...</Text>
        </View>
      ) : companies.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="shield-outline" size={64} color="#dfe6e9" />
          <Text style={styles.emptyText}>No inspection companies found</Text>
          <Text style={styles.emptySubText}>Try a different city or search term</Text>
        </View>
      ) : (
        <FlatList
          data={companies}
          keyExtractor={(item) => item._id}
          renderItem={renderCompanyCard}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },

  header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 }, android: { elevation: 4 } }) },
  logo: { fontSize: 24, fontWeight: '800', color: '#1a1a2e', letterSpacing: -0.5, marginBottom: 4 },
  logoAccent: { color: '#e67e22' },
  subHeader: { fontSize: 14, color: '#636e72', marginBottom: 14 },

  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  searchInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 12, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: '#e9ecef', gap: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#1a1a2e' },
  searchBtn: { width: 46, height: 46, borderRadius: 12, backgroundColor: '#e67e22', justifyContent: 'center', alignItems: 'center', ...Platform.select({ ios: { shadowColor: '#e67e22', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }, android: { elevation: 4 } }) },

  chipScroll: { marginHorizontal: -20, paddingHorizontal: 0 },
  chipContainer: { paddingHorizontal: 20, gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#f1f3f5', borderWidth: 1, borderColor: '#e9ecef' },
  chipActive: { backgroundColor: '#fef0e3', borderColor: '#e67e22' },
  chipText: { fontSize: 13, color: '#636e72', fontWeight: '600' },
  chipTextActive: { color: '#e67e22' },

  resultBar: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  resultTxt: { color: '#636e72', fontSize: 13, fontWeight: '600' },

  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderTxt: { marginTop: 12, color: '#b2bec3', fontSize: 14 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#636e72', marginTop: 16 },
  emptySubText: { fontSize: 13, color: '#b2bec3', marginTop: 6 },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12 }, android: { elevation: 3 } }) },
  cardTop: { flexDirection: 'row', marginBottom: 12 },
  companyLogo: { width: 56, height: 56, borderRadius: 14, resizeMode: 'cover', marginRight: 14 },
  companyLogoPlaceholder: { width: 56, height: 56, borderRadius: 14, backgroundColor: '#e67e22', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  cardInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  companyName: { fontSize: 17, fontWeight: '700', color: '#1a1a2e', flex: 1 },
  verifiedBadge: { marginLeft: 2 },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  cityText: { fontSize: 13, color: '#636e72' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stars: { flexDirection: 'row', gap: 2 },
  reviewCount: { fontSize: 12, color: '#b2bec3' },
  descText: { fontSize: 13, color: '#636e72', lineHeight: 20, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f3f5' },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerText: { fontSize: 12, color: '#636e72' },
});

export default InspectionHome;
