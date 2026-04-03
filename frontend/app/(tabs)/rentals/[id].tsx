import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';

export default function RentalVehicleDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      const response = await fetch(`http://10.0.2.2:5000/api/rentals/${id}`);
      const data = await response.json();
      if (response.ok) {
        setVehicle(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#10ac84" />
        <Text style={styles.loaderText}>Loading vehicle details...</Text>
      </View>
    );
  }

  if (!vehicle) {
    return (
      <View style={styles.loaderWrap}>
        <Ionicons name="alert-circle-outline" size={48} color="#e74c3c" />
        <Text style={styles.errorText}>Vehicle not found</Text>
      </View>
    );
  }

  const InfoRow = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon as any} size={18} color="#10ac84" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Image Placeholder */}
      <View style={styles.heroWrap}>
        <Ionicons name="car-sport" size={64} color="#10ac84" />
        <View style={[styles.availBadge, { backgroundColor: vehicle.availability ? '#27ae60' : '#e74c3c' }]}>
          <Ionicons name={vehicle.availability ? 'checkmark-circle' : 'close-circle'} size={14} color="#fff" />
          <Text style={styles.availBadgeText}>{vehicle.availability ? 'Available' : 'Rented Out'}</Text>
        </View>
      </View>

      {/* Title Section */}
      <View style={styles.titleSection}>
        <Text style={styles.vehicleTitle}>{vehicle.make} {vehicle.model}</Text>
        <View style={styles.metaRow}>
          <View style={styles.metaTag}>
            <Ionicons name="calendar-outline" size={13} color="#636e72" />
            <Text style={styles.metaText}>{vehicle.year}</Text>
          </View>
          <View style={styles.metaTag}>
            <Ionicons name="settings-outline" size={13} color="#636e72" />
            <Text style={styles.metaText}>{vehicle.transmission}</Text>
          </View>
        </View>
      </View>

      {/* Pricing Cards */}
      <View style={styles.pricingContainer}>
        <View style={styles.priceCard}>
          <Ionicons name="today-outline" size={22} color="#10ac84" />
          <Text style={styles.priceCardLabel}>Daily Rate</Text>
          <Text style={styles.priceCardValue}>Rs. {vehicle.shortTermDailyRate?.toLocaleString()}</Text>
        </View>
        <View style={styles.priceCard}>
          <Ionicons name="calendar-outline" size={22} color="#e67e22" />
          <Text style={styles.priceCardLabel}>Monthly Rate</Text>
          <Text style={[styles.priceCardValue, { color: '#e67e22' }]}>Rs. {vehicle.longTermMonthlyRate?.toLocaleString()}</Text>
        </View>
      </View>

      {/* Rental Terms */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Feather name="file-text" size={18} color="#1a1a2e" />
          <Text style={styles.sectionTitle}>Rental Terms</Text>
        </View>
        <InfoRow icon="speedometer-outline" label="Mileage Limit" value={`${vehicle.mileageLimit} Km per ${vehicle.mileageLimitType}`} />
        <InfoRow icon="trending-up-outline" label="Extra Mileage" value={`Rs. ${vehicle.extraMileageRate} per additional Km`} />
        <InfoRow icon="shield-checkmark-outline" label="Refundable Deposit" value={`Rs. ${vehicle.deposit?.toLocaleString()}`} />
        <InfoRow icon="time-outline" label="Minimum Duration" value="5 days" />
      </View>

      {/* Booking Requirements */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Feather name="clipboard" size={18} color="#1a1a2e" />
          <Text style={styles.sectionTitle}>Booking Requirements</Text>
        </View>
        <View style={styles.reqList}>
          {[
            { icon: 'card-outline', text: 'Valid Driving License' },
            { icon: 'finger-print-outline', text: 'ID Proof (NIC or Passport)' },
            { icon: 'receipt-outline', text: 'Billing Proof (Utility Bill)' },
            { icon: 'people-outline', text: 'One Guarantor (with ID & Billing proof)' },
            { icon: 'cash-outline', text: 'Upfront Payment' },
          ].map((req, idx) => (
            <View key={idx} style={styles.reqItem}>
              <View style={styles.reqNumWrap}>
                <Text style={styles.reqNum}>{idx + 1}</Text>
              </View>
              <Ionicons name={req.icon as any} size={18} color="#636e72" />
              <Text style={styles.reqText}>{req.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Owner Info */}
      {vehicle.owner && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="user" size={18} color="#1a1a2e" />
            <Text style={styles.sectionTitle}>Vehicle Owner</Text>
          </View>
          <View style={styles.ownerCard}>
            <View style={styles.ownerAvatar}>
              <Text style={styles.ownerAvatarText}>{vehicle.owner.name?.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ownerName}>{vehicle.owner.name}</Text>
              {vehicle.owner.phone && (
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${vehicle.owner.phone}`)} style={styles.ownerPhoneRow}>
                  <Feather name="phone" size={12} color="#10ac84" />
                  <Text style={styles.ownerPhone}>{vehicle.owner.phone}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Description */}
      {vehicle.description && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="info" size={18} color="#1a1a2e" />
            <Text style={styles.sectionTitle}>Description</Text>
          </View>
          <Text style={styles.descText}>{vehicle.description}</Text>
        </View>
      )}

      {/* Book Now CTA */}
      <TouchableOpacity
        style={[styles.bookBtn, !vehicle.availability && styles.disabledBtn]}
        disabled={!vehicle.availability}
        onPress={() => router.push({ pathname: '/(tabs)/rentals/book', params: { vehicleId: vehicle._id } })}
        activeOpacity={0.8}
      >
        <Ionicons name={vehicle.availability ? 'flash' : 'lock-closed'} size={22} color="#fff" />
        <Text style={styles.bookBtnText}>
          {vehicle.availability ? 'Book This Vehicle' : 'Currently Unavailable'}
        </Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  loaderText: { marginTop: 12, fontSize: 14, color: '#b2bec3' },
  errorText: { marginTop: 12, fontSize: 16, fontWeight: '600', color: '#e74c3c' },

  heroWrap: { height: 180, backgroundColor: '#f0faf7', justifyContent: 'center', alignItems: 'center' },
  availBadge: { position: 'absolute', top: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  availBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  titleSection: { backgroundColor: '#fff', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  vehicleTitle: { fontSize: 24, fontWeight: '800', color: '#1a1a2e' },
  metaRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  metaTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f8f9fa', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  metaText: { fontSize: 13, color: '#636e72', fontWeight: '600' },

  pricingContainer: { flexDirection: 'row', gap: 12, margin: 16 },
  priceCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 }, android: { elevation: 2 } }) },
  priceCardLabel: { fontSize: 12, color: '#b2bec3', fontWeight: '600', marginTop: 6 },
  priceCardValue: { fontSize: 18, fontWeight: '800', color: '#10ac84', marginTop: 2 },

  section: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, borderRadius: 14, padding: 18, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }, android: { elevation: 2 } }) },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a2e' },

  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f8f9fa' },
  infoIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f0faf7', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  infoLabel: { fontSize: 12, color: '#b2bec3', fontWeight: '500' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#1a1a2e', marginTop: 1 },

  reqList: { gap: 10 },
  reqItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reqNumWrap: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#f0faf7', justifyContent: 'center', alignItems: 'center' },
  reqNum: { fontSize: 11, fontWeight: '700', color: '#10ac84' },
  reqText: { fontSize: 14, color: '#34495e' },

  ownerCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ownerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#10ac84', justifyContent: 'center', alignItems: 'center' },
  ownerAvatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  ownerName: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  ownerPhoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ownerPhone: { fontSize: 13, color: '#10ac84', fontWeight: '600' },

  descText: { fontSize: 14, color: '#636e72', lineHeight: 22 },

  bookBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10ac84', marginHorizontal: 16, padding: 18, borderRadius: 14, marginTop: 8 },
  disabledBtn: { backgroundColor: '#bdc3c7' },
  bookBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
