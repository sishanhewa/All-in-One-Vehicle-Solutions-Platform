import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Linking, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { fetchCompanyById, resolveInspectionImageUrl } from '../api/inspectionApi';
import { Ionicons, Feather } from '@expo/vector-icons';

const CompanyDetails = () => {
  const router = useRouter();
  const { companyId } = useLocalSearchParams();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompany();
  }, [companyId]);

  const loadCompany = async () => {
    try {
      const data = await fetchCompanyById(companyId);
      setCompany(data);
    } catch (error) {
      Alert.alert('Error', 'Could not load company details');
    } finally {
      setLoading(false);
    }
  };

  const handleCall = () => {
    if (company?.phone) {
      Linking.openURL(`tel:${company.phone}`);
    } else {
      Alert.alert('No Contact', 'Company has not provided a contact number.');
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons key={i} name={i <= Math.round(rating) ? 'star' : 'star-outline'} size={16} color={i <= Math.round(rating) ? '#f39c12' : '#dfe6e9'} />
      );
    }
    return stars;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e67e22" />
        <Text style={styles.loadingTxt}>Loading company details...</Text>
      </View>
    );
  }

  if (!company) {
    return (
      <View style={styles.center}>
        <Feather name="alert-circle" size={48} color="#dfe6e9" />
        <Text style={styles.errorText}>Company not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={16} color="#fff" />
          <Text style={styles.backBtnTxt}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const profile = company.companyProfile || {};
  const packages = company.packages || [];
  const logoUri = profile.logo ? resolveInspectionImageUrl(profile.logo) : null;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Section */}
      <View style={styles.hero}>
        {logoUri ? (
          <Image source={{ uri: logoUri }} style={styles.heroLogo} />
        ) : (
          <View style={styles.heroLogoPlaceholder}>
            <Feather name="shield" size={36} color="#fff" />
          </View>
        )}
        <View style={styles.heroNameRow}>
          <Text style={styles.heroName}>{profile.companyName || company.name}</Text>
          {profile.isVerified && <Ionicons name="checkmark-circle" size={20} color="#3498db" />}
        </View>
        <View style={styles.heroCityRow}>
          <Ionicons name="location-outline" size={15} color="#636e72" />
          <Text style={styles.heroCityText}>{profile.city || 'Unknown'}</Text>
        </View>
        <View style={styles.heroRatingRow}>
          <View style={styles.starsRow}>{renderStars(profile.rating || 0)}</View>
          <Text style={styles.heroReviewCount}>{profile.rating?.toFixed(1) || '0.0'} ({profile.totalReviews || 0} reviews)</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Description */}
        {profile.description ? (
          <>
            <Text style={styles.sectionTitle}>About</Text>
            <View style={styles.infoCard}>
              <Text style={styles.description}>{profile.description}</Text>
            </View>
          </>
        ) : null}

        {/* Contact Info */}
        <Text style={styles.sectionTitle}>Contact & Hours</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Feather name="phone" size={15} color="#e67e22" />
            <Text style={styles.infoText}>{company.phone || 'Not provided'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Feather name="mail" size={15} color="#e67e22" />
            <Text style={styles.infoText}>{company.email || 'Not provided'}</Text>
          </View>
          {profile.website ? (
            <TouchableOpacity style={styles.infoRow} onPress={() => Linking.openURL(profile.website)}>
              <Feather name="globe" size={15} color="#e67e22" />
              <Text style={[styles.infoText, { color: '#3498db' }]}>{profile.website}</Text>
            </TouchableOpacity>
          ) : null}
          <View style={styles.infoRow}>
            <Feather name="clock" size={15} color="#e67e22" />
            <Text style={styles.infoText}>{profile.operatingHours || 'Not specified'}</Text>
          </View>
          {profile.address ? (
            <View style={styles.infoRow}>
              <Feather name="map-pin" size={15} color="#e67e22" />
              <Text style={styles.infoText}>{profile.address}</Text>
            </View>
          ) : null}
        </View>

        {/* Packages */}
        <Text style={styles.sectionTitle}>Available Packages ({packages.length})</Text>

        {packages.length === 0 ? (
          <View style={styles.emptyPackages}>
            <Feather name="package" size={36} color="#dfe6e9" />
            <Text style={styles.emptyText}>No packages available yet</Text>
          </View>
        ) : (
          packages.map((pkg) => (
            <View key={pkg._id} style={styles.packageCard}>
              <View style={styles.pkgHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pkgName}>{pkg.name}</Text>
                  <Text style={styles.pkgDesc} numberOfLines={2}>{pkg.description}</Text>
                </View>
                <View style={styles.pkgPriceBox}>
                  <Text style={styles.pkgPriceLabel}>Price</Text>
                  <Text style={styles.pkgPrice}>Rs. {Number(pkg.price).toLocaleString()}</Text>
                </View>
              </View>

              <View style={styles.pkgMeta}>
                <View style={styles.pkgMetaItem}>
                  <Ionicons name="time-outline" size={14} color="#636e72" />
                  <Text style={styles.pkgMetaText}>{pkg.duration} mins</Text>
                </View>
                {pkg.vehicleTypes && pkg.vehicleTypes.length > 0 && (
                  <View style={styles.pkgMetaItem}>
                    <Ionicons name="car-outline" size={14} color="#636e72" />
                    <Text style={styles.pkgMetaText}>{pkg.vehicleTypes.join(', ')}</Text>
                  </View>
                )}
              </View>

              {pkg.checklistItems && pkg.checklistItems.length > 0 && (
                <View style={styles.checklistPreview}>
                  {pkg.checklistItems.slice(0, 4).map((item, idx) => (
                    <View key={idx} style={styles.checkItem}>
                      <Ionicons name="checkmark-circle" size={14} color="#10ac84" />
                      <Text style={styles.checkItemText}>{item}</Text>
                    </View>
                  ))}
                  {pkg.checklistItems.length > 4 && (
                    <Text style={styles.moreItems}>+{pkg.checklistItems.length - 4} more items</Text>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={styles.bookBtn}
                activeOpacity={0.8}
                onPress={() => router.push({
                  pathname: '/BookInspection',
                  params: {
                    packageId: pkg._id,
                    companyId: company._id,
                    packageName: pkg.name,
                    packagePrice: pkg.price,
                    packageDuration: pkg.duration,
                    companyName: profile.companyName || company.name,
                    checklistItems: JSON.stringify(pkg.checklistItems || []),
                  }
                })}
              >
                <Feather name="calendar" size={16} color="#fff" />
                <Text style={styles.bookBtnText}>Book Now</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Call Button */}
        <TouchableOpacity style={styles.callButton} activeOpacity={0.8} onPress={handleCall}>
          <Feather name="phone" size={20} color="#fff" />
          <Text style={styles.callButtonText}>Call {profile.companyName || company.name}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, gap: 12 },
  loadingTxt: { marginTop: 12, color: '#b2bec3', fontSize: 14 },
  errorText: { fontSize: 16, color: '#636e72' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#3498db', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
  backBtnTxt: { color: '#fff', fontWeight: '600' },

  hero: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  heroLogo: { width: 80, height: 80, borderRadius: 20, resizeMode: 'cover', marginBottom: 14 },
  heroLogoPlaceholder: { width: 80, height: 80, borderRadius: 20, backgroundColor: '#e67e22', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  heroNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  heroName: { fontSize: 22, fontWeight: '800', color: '#1a1a2e' },
  heroCityRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  heroCityText: { fontSize: 14, color: '#636e72' },
  heroRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  starsRow: { flexDirection: 'row', gap: 2 },
  heroReviewCount: { fontSize: 13, color: '#636e72' },

  content: { padding: 20 },

  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a2e', marginBottom: 12, marginTop: 8 },

  infoCard: { backgroundColor: '#fff', padding: 18, borderRadius: 14, marginBottom: 20, gap: 14, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 }, android: { elevation: 2 } }) },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoText: { fontSize: 14, color: '#4a4a4a', flex: 1 },

  description: { fontSize: 15, color: '#4a4a4a', lineHeight: 24 },

  emptyPackages: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 14, color: '#b2bec3' },

  packageCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12 }, android: { elevation: 3 } }) },
  pkgHeader: { flexDirection: 'row', marginBottom: 12 },
  pkgName: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  pkgDesc: { fontSize: 13, color: '#636e72', lineHeight: 18 },
  pkgPriceBox: { alignItems: 'flex-end', marginLeft: 12 },
  pkgPriceLabel: { fontSize: 11, color: '#b2bec3', textTransform: 'uppercase', fontWeight: '600' },
  pkgPrice: { fontSize: 18, fontWeight: '800', color: '#e67e22' },
  pkgMeta: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  pkgMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pkgMetaText: { fontSize: 12, color: '#636e72' },

  checklistPreview: { marginBottom: 14 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  checkItemText: { fontSize: 13, color: '#4a4a4a' },
  moreItems: { fontSize: 12, color: '#b2bec3', marginLeft: 22, fontStyle: 'italic' },

  bookBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#e67e22', paddingVertical: 14, borderRadius: 12, ...Platform.select({ ios: { shadowColor: '#e67e22', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }, android: { elevation: 4 } }) },
  bookBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  callButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#10ac84', paddingVertical: 16, borderRadius: 30, marginTop: 10, ...Platform.select({ ios: { shadowColor: '#10ac84', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }, android: { elevation: 4 } }) },
  callButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});

export default CompanyDetails;
