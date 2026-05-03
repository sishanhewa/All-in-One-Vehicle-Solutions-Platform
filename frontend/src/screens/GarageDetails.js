import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { fetchGarageById, resolveServiceImageUrl } from '../api/serviceApi';

const ACCENT = '#8e44ad';

const normalizeId = (param) => {
  if (param == null) return '';
  return Array.isArray(param) ? param[0] : param;
};

const formatReviewDate = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

const openWebsite = (raw) => {
  if (!raw || !String(raw).trim()) return;
  let url = String(raw).trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  Linking.openURL(url).catch(() => Alert.alert('Unable to open link', 'Check the website address and try again.'));
};

const GarageDetails = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const garageId = normalizeId(params.garageId);

  const [garage, setGarage] = useState(null);
  const [offerings, setOfferings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!garageId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchGarageById(garageId);
      setGarage(data.garage ?? null);
      setOfferings(Array.isArray(data.offerings) ? data.offerings : []);
      setReviews(Array.isArray(data.reviews) ? data.reviews : []);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not load garage details');
      setGarage(null);
      setOfferings([]);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [garageId]);

  useEffect(() => {
    load();
  }, [load]);

  const renderStars = (rating, size = 16) => {
    const r = Math.round(Number(rating) || 0);
    const stars = [];
    for (let i = 1; i <= 5; i += 1) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= r ? 'star' : 'star-outline'}
          size={size}
          color={i <= r ? '#f39c12' : '#dfe6e9'}
        />
      );
    }
    return stars;
  };

  const handleCall = () => {
    const raw = garage?.phone;
    if (!raw || !String(raw).trim()) {
      Alert.alert('No phone', 'This garage has not listed a phone number.');
      return;
    }
    const tel = String(raw).replace(/\s/g, '');
    Linking.openURL(`tel:${tel}`);
  };

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingTxt}>Loading garage...</Text>
      </View>
    );
  }

  if (!garage) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Feather name="tool" size={48} color="#dfe6e9" />
        <Text style={styles.errorText}>Garage not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Feather name="arrow-left" size={16} color="#fff" />
          <Text style={styles.backBtnTxt}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const logoUri = garage.logo ? resolveServiceImageUrl(garage.logo) : null;
  const totalReviews = garage.totalReviews ?? 0;
  const rating = garage.rating ?? 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.hero, { paddingTop: 20 + insets.top }]}>
        <TouchableOpacity
          style={[styles.backFab, { top: insets.top + 8, left: 16 }]}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={22} color="#1a1a2e" />
        </TouchableOpacity>

        {logoUri ? (
          <Image source={{ uri: logoUri }} style={styles.heroLogo} />
        ) : (
          <View style={styles.heroLogoPlaceholder}>
            <Ionicons name="construct" size={36} color="#fff" />
          </View>
        )}

        <View style={styles.heroNameRow}>
          <Text style={styles.heroName}>{garage.garageName}</Text>
          {garage.isVerified ? <Ionicons name="checkmark-circle" size={22} color="#3498db" /> : null}
        </View>

        <View style={styles.heroCityRow}>
          <Ionicons name="location-outline" size={15} color="#636e72" />
          <Text style={styles.heroCityText}>{garage.city || '—'}</Text>
        </View>
        {garage.address ? <Text style={styles.heroAddress}>{garage.address}</Text> : null}

        <View style={styles.heroRatingRow}>
          <View style={styles.starsRow}>{renderStars(rating)}</View>
          <Text style={styles.heroReviewCount}>
            {Number(rating).toFixed(1)} ({totalReviews} review{totalReviews !== 1 ? 's' : ''})
          </Text>
        </View>

        {garage.phone ? (
          <TouchableOpacity style={styles.phoneRow} onPress={handleCall} activeOpacity={0.7}>
            <Ionicons name="call-outline" size={18} color={ACCENT} />
            <Text style={styles.phoneText}>{garage.phone}</Text>
          </TouchableOpacity>
        ) : null}

        {garage.website ? (
          <TouchableOpacity style={styles.websiteRow} onPress={() => openWebsite(garage.website)} activeOpacity={0.7}>
            <Ionicons name="globe-outline" size={18} color={ACCENT} />
            <Text style={styles.websiteText} numberOfLines={1}>
              {garage.website}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.content}>
        {garage.description ? (
          <>
            <Text style={styles.sectionTitle}>About</Text>
            <View style={styles.infoCard}>
              <Text style={styles.description}>{garage.description}</Text>
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Our Services</Text>
        {offerings.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Ionicons name="clipboard-outline" size={40} color="#dfe6e9" />
            <Text style={styles.emptyText}>No services listed yet</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.offeringsRow}
          >
            {offerings.map((offering) => (
              <View key={offering._id} style={styles.offeringCard}>
                <Text style={styles.offeringName} numberOfLines={2}>
                  {offering.name}
                </Text>
                <View style={styles.categoryPill}>
                  <Text style={styles.categoryPillText}>{offering.category}</Text>
                </View>
                <Text style={styles.offeringPrice}>Rs. {Number(offering.estimatedPrice).toLocaleString()}</Text>
                <View style={styles.offeringMeta}>
                  <Ionicons name="time-outline" size={14} color="#636e72" />
                  <Text style={styles.offeringMetaText}>{offering.estimatedDuration} mins</Text>
                </View>
                {Array.isArray(offering.vehicleTypes) && offering.vehicleTypes.length > 0 ? (
                  <View style={styles.chipsWrap}>
                    {offering.vehicleTypes.map((vt, idx) => (
                      <View key={`${offering._id}-vt-${idx}`} style={styles.chip}>
                        <Text style={styles.chipText}>{vt}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                <TouchableOpacity
                  style={styles.bookBtn}
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push({
                      pathname: '/BookService',
                      params: { garageId: String(garage._id), offeringId: String(offering._id) },
                    })
                  }
                >
                  <Text style={styles.bookBtnText}>Book This Service</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        <Text style={styles.sectionTitle}>Customer Reviews</Text>
        {reviews.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Ionicons name="chatbubbles-outline" size={40} color="#dfe6e9" />
            <Text style={styles.emptyText}>No reviews yet</Text>
          </View>
        ) : (
          <View style={styles.reviewsList}>
            {reviews.map((rev) => {
              const name = rev.customerId?.name || 'Customer';
              const comment = rev.comment || '';
              const stars = rev.garageRating ?? 0;
              return (
                <View key={rev._id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewName}>{name}</Text>
                    <Text style={styles.reviewDate}>{formatReviewDate(rev.createdAt)}</Text>
                  </View>
                  <View style={styles.starsRowSmall}>{renderStars(stars, 14)}</View>
                  {comment ? <Text style={styles.reviewComment}>{comment}</Text> : null}
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, gap: 12 },
  loadingTxt: { marginTop: 12, color: '#b2bec3', fontSize: 14 },
  errorText: { fontSize: 16, color: '#636e72' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ACCENT, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, marginTop: 8 },
  backBtnTxt: { color: '#fff', fontWeight: '600' },

  hero: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    position: 'relative',
    minHeight: 120,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  backFab: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f3f5',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  heroLogo: { width: 88, height: 88, borderRadius: 22, resizeMode: 'cover', marginBottom: 14 },
  heroLogoPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap', justifyContent: 'center' },
  heroName: { fontSize: 22, fontWeight: '800', color: '#1a1a2e', textAlign: 'center', maxWidth: '90%' },
  heroCityRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, justifyContent: 'center' },
  heroCityText: { fontSize: 14, color: '#636e72', textAlign: 'center' },
  heroAddress: { fontSize: 13, color: '#636e72', textAlign: 'center', paddingHorizontal: 16, marginBottom: 10, lineHeight: 20 },
  heroRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  starsRow: { flexDirection: 'row', gap: 2 },
  starsRowSmall: { flexDirection: 'row', gap: 2, marginBottom: 8 },
  heroReviewCount: { fontSize: 13, color: '#636e72' },

  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, paddingVertical: 8, paddingHorizontal: 12 },
  phoneText: { fontSize: 16, color: ACCENT, fontWeight: '700' },
  websiteRow: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '100%', paddingHorizontal: 12, paddingBottom: 4 },
  websiteText: { fontSize: 14, color: '#3498db', flex: 1, textDecorationLine: 'underline' },

  content: { padding: 20 },

  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a2e', marginBottom: 12, marginTop: 8 },

  infoCard: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 14,
    marginBottom: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  description: { fontSize: 15, color: '#4a4a4a', lineHeight: 24 },

  emptyBlock: { alignItems: 'center', paddingVertical: 28, gap: 10 },
  emptyText: { fontSize: 14, color: '#b2bec3' },

  offeringsRow: { paddingRight: 20, gap: 14, paddingBottom: 4 },
  offeringCard: {
    width: 280,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: ACCENT,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 3 },
    }),
  },
  offeringName: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 8 },
  categoryPill: { alignSelf: 'flex-start', backgroundColor: '#f4ecf7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 10 },
  categoryPillText: { fontSize: 12, fontWeight: '600', color: ACCENT },
  offeringPrice: { fontSize: 20, fontWeight: '800', color: ACCENT, marginBottom: 6 },
  offeringMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  offeringMetaText: { fontSize: 13, color: '#636e72' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  chip: { backgroundColor: '#f1f3f5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  chipText: { fontSize: 11, color: '#636e72', fontWeight: '600' },

  bookBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  bookBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  reviewsList: { gap: 12 },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reviewName: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', flex: 1 },
  reviewDate: { fontSize: 12, color: '#b2bec3' },
  reviewComment: { fontSize: 14, color: '#4a4a4a', lineHeight: 21, marginTop: 4 },
});

export default GarageDetails;
