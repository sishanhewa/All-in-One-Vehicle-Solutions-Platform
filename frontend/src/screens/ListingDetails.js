import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Platform, Alert, Dimensions } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { resolveImageUrl } from '../api/marketplaceApi';
import { Ionicons, Feather } from '@expo/vector-icons';

const ListingDetails = () => {
  const { listingId } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    loadListing();
  }, [listingId]);

  const loadListing = async () => {
    try {
      const API_URL = 'https://all-in-one-vehicle-solutions-platform.onrender.com/api/marketplace';
      const response = await fetch(`${API_URL}/${listingId}`);
      const data = await response.json();
      setListing(data);
    } catch (error) {
      console.error('Error loading listing:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (p) => `Rs. ${Number(p).toLocaleString()}`;

  const handleCall = () => {
    if (listing?.sellerId?.phone) {
      Linking.openURL(`tel:${listing.sellerId.phone}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#10ac84" />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={styles.loaderWrap}>
        <Ionicons name="alert-circle-outline" size={48} color="#dfe6e9" />
        <Text style={styles.errorText}>Listing not found</Text>
      </View>
    );
  }

  const images = listing.images?.length > 0
    ? listing.images.map(resolveImageUrl)
    : ['https://via.placeholder.com/400x250?text=No+Image'];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Image Gallery */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width);
          setActiveImageIndex(idx);
        }}
      >
        {images.map((uri, i) => (
          <Image key={i} source={{ uri }} style={styles.heroImage} />
        ))}
      </ScrollView>

      {/* Dots */}
      {images.length > 1 && (
        <View style={styles.dotRow}>
          {images.map((_, i) => (
            <View key={i} style={[styles.dot, activeImageIndex === i && styles.dotActive]} />
          ))}
        </View>
      )}

      {/* Main Info */}
      <View style={styles.section}>
        <Text style={styles.title}>{listing.year} {listing.make} {listing.model}</Text>
        <Text style={styles.price}>{formatPrice(listing.price)}</Text>

        <View style={styles.specsGrid}>
          {[
            { icon: 'speedometer-outline', label: 'Mileage', value: `${listing.mileage?.toLocaleString() || 0} km` },
            { icon: 'flash-outline', label: 'Fuel', value: listing.fuelType },
            { icon: 'cog-outline', label: 'Transmission', value: listing.transmission },
            { icon: 'car-outline', label: 'Body', value: listing.bodyType },
            { icon: 'location-outline', label: 'Location', value: listing.location },
            { icon: 'calendar-outline', label: 'Year', value: String(listing.year) },
          ].map(({ icon, label, value }) => (
            <View key={label} style={styles.specItem}>
              <Ionicons name={icon} size={18} color="#10ac84" />
              <Text style={styles.specLabel}>{label}</Text>
              <Text style={styles.specValue}>{value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Description */}
      {listing.description ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descText}>{listing.description}</Text>
        </View>
      ) : null}

      {/* Seller */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Seller Information</Text>
        <View style={styles.sellerCard}>
          <View style={styles.sellerAvatar}>
            <Ionicons name="person" size={24} color="#fff" />
          </View>
          <View style={styles.sellerInfo}>
            <Text style={styles.sellerName}>{listing.sellerId?.name || 'Unknown'}</Text>
            <Text style={styles.sellerPhone}>{listing.sellerId?.phone || ''}</Text>
          </View>
          <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
            <Ionicons name="call" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Contact Button */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.contactBtn} activeOpacity={0.8} onPress={handleCall}>
          <Ionicons name="call" size={20} color="#fff" />
          <Text style={styles.contactBtnText}>Call Seller</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  errorText: { fontSize: 16, color: '#636e72', marginTop: 12 },

  heroImage: { width: screenWidth, height: 260, resizeMode: 'cover' },
  dotRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#dfe6e9' },
  dotActive: { backgroundColor: '#10ac84', width: 20 },

  section: { backgroundColor: '#fff', marginTop: 10, padding: 20 },
  title: { fontSize: 22, fontWeight: '800', color: '#1a1a2e', marginBottom: 6 },
  price: { fontSize: 26, fontWeight: '800', color: '#10ac84', marginBottom: 16 },

  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a2e', marginBottom: 12 },

  specsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  specItem: { width: '46%', backgroundColor: '#f8f9fa', borderRadius: 12, padding: 14, alignItems: 'center' },
  specLabel: { fontSize: 11, color: '#b2bec3', marginTop: 6, fontWeight: '600' },
  specValue: { fontSize: 14, color: '#1a1a2e', fontWeight: '700', marginTop: 2 },

  descText: { fontSize: 15, color: '#636e72', lineHeight: 24 },

  sellerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 14, padding: 16 },
  sellerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#10ac84', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  sellerInfo: { flex: 1 },
  sellerName: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  sellerPhone: { fontSize: 14, color: '#636e72', marginTop: 2 },
  callBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#10ac84', justifyContent: 'center', alignItems: 'center' },

  bottomActions: { padding: 20 },
  contactBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10ac84', paddingVertical: 16, borderRadius: 14, ...Platform.select({ ios: { shadowColor: '#10ac84', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }, android: { elevation: 4 } }) },
  contactBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

export default ListingDetails;
