import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Platform, Image, TouchableOpacity, Linking, Dimensions, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, Feather } from '@expo/vector-icons';

const API_BASE = 'https://all-in-one-vehicle-solutions-platform.onrender.com';
const { width } = Dimensions.get('window');

const statusConfig: Record<string, { color: string; bg: string; icon: string }> = {
  Pending: { color: '#f39c12', bg: '#fef9e7', icon: 'time-outline' },
  Accepted: { color: '#27ae60', bg: '#eafaf1', icon: 'checkmark-circle-outline' },
  Rejected: { color: '#e74c3c', bg: '#fdedec', icon: 'close-circle-outline' },
  Completed: { color: '#3498db', bg: '#ebf5fb', icon: 'flag-outline' },
  Cancelled: { color: '#7f8c8d', bg: '#f2f3f4', icon: 'ban-outline' },
};

export default function BookingDetailScreen() {
  const { bookingId } = useLocalSearchParams();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchBooking();
  }, [bookingId]);

  const fetchBooking = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_BASE}/api/rentals/bookings/${bookingId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setBooking(data);
      }
      
      const userInfoStr = await AsyncStorage.getItem('userInfo');
      if (userInfoStr) {
        const userInfo = JSON.parse(userInfoStr);
        setUserId(userInfo._id);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status: string) => {
    Alert.alert(
      'Update Status',
      `Are you sure you want to ${status.toLowerCase()} this booking?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              const response = await fetch(`${API_BASE}/api/rentals/bookings/${bookingId}/status`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
              });
              if (response.ok) {
                Alert.alert('Success', `Booking has been ${status.toLowerCase()}.`);
                fetchBooking();
              }
            } catch (error) {
              console.error(error);
              Alert.alert('Error', 'Failed to update status.');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#10ac84" />
        <Text style={styles.loaderText}>Loading booking details...</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.loaderWrap}>
        <Ionicons name="alert-circle-outline" size={48} color="#e74c3c" />
        <Text style={styles.errorText}>Booking not found</Text>
      </View>
    );
  }

  const config = statusConfig[booking.status] || statusConfig.Pending;

  const DocumentCard = ({ title, path, icon }: { title: string; path: string; icon: string }) => (
    <View style={styles.docCard}>
      <View style={styles.docHeader}>
        <Ionicons name={icon as any} size={18} color="#10ac84" />
        <Text style={styles.docTitle}>{title}</Text>
      </View>
      <Image
        source={{ uri: path.startsWith('http') ? path : `${API_BASE}${path}` }}
        style={styles.docImage}
        resizeMode="cover"
      />
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Status Header */}
      <View style={[styles.statusHeader, { backgroundColor: config.bg }]}>
        <Ionicons name={config.icon as any} size={32} color={config.color} />
        <Text style={[styles.statusTitle, { color: config.color }]}>{booking.status}</Text>
        <Text style={styles.statusSub}>
          {booking.status === 'Pending' ? 'Waiting for owner response' :
           booking.status === 'Accepted' ? 'Booking has been approved' :
           booking.status === 'Rejected' ? 'Booking was declined' :
           booking.status === 'Completed' ? 'Rental has been completed' : 'Booking was cancelled'}
        </Text>
      </View>

      {/* Vehicle Info */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="car-sport" size={18} color="#1a1a2e" />
          <Text style={styles.sectionTitle}>Vehicle</Text>
        </View>
        <View style={styles.vehicleCard}>
          <View style={styles.vehicleIconWrap}>
            <Ionicons name="car-sport" size={28} color="#10ac84" />
          </View>
          <View>
            <Text style={styles.vehicleName}>{booking.vehicle?.make} {booking.vehicle?.model}</Text>
            <Text style={styles.vehicleMeta}>{booking.vehicle?.year} · {booking.vehicle?.transmission}</Text>
          </View>
        </View>
      </View>

      {/* Rental Period */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Feather name="calendar" size={18} color="#1a1a2e" />
          <Text style={styles.sectionTitle}>Rental Period</Text>
        </View>
        <View style={styles.dateRow}>
          <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>Start Date</Text>
            <Text style={styles.dateValue}>{new Date(booking.startDate).toLocaleDateString()}</Text>
          </View>
          <View style={styles.dateArrow}>
            <Feather name="arrow-right" size={18} color="#b2bec3" />
          </View>
          <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>End Date</Text>
            <Text style={styles.dateValue}>{new Date(booking.endDate).toLocaleDateString()}</Text>
          </View>
        </View>
        {(booking.totalDays > 0 || booking.totalMonths > 0) && (
          <Text style={styles.durationText}>
            Duration: {booking.totalDays > 0 ? `${booking.totalDays} days` : ''}{booking.totalMonths > 0 ? ` ${booking.totalMonths} months` : ''}
          </Text>
        )}
      </View>

      {/* Renter Info */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Feather name="user" size={18} color="#1a1a2e" />
          <Text style={styles.sectionTitle}>Renter</Text>
        </View>
        <View style={styles.personCard}>
          <View style={styles.personAvatar}>
            <Text style={styles.personAvatarText}>{booking.renter?.name?.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.personName}>{booking.renter?.name}</Text>
            <Text style={styles.personEmail}>{booking.renter?.email}</Text>
          </View>
          {booking.renter?.phone && (
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => Linking.openURL(`tel:${booking.renter.phone}`)}
            >
              <Feather name="phone" size={16} color="#10ac84" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Owner Info */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Feather name="briefcase" size={18} color="#1a1a2e" />
          <Text style={styles.sectionTitle}>Vehicle Owner</Text>
        </View>
        <View style={styles.personCard}>
          <View style={[styles.personAvatar, { backgroundColor: '#3498db' }]}>
            <Text style={styles.personAvatarText}>{booking.owner?.name?.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.personName}>{booking.owner?.name}</Text>
            <Text style={styles.personEmail}>{booking.owner?.email}</Text>
          </View>
          {booking.owner?.phone && (
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => Linking.openURL(`tel:${booking.owner.phone}`)}
            >
              <Feather name="phone" size={16} color="#10ac84" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Guarantor */}
      {booking.guarantorName && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="users" size={18} color="#1a1a2e" />
            <Text style={styles.sectionTitle}>Guarantor</Text>
          </View>
          <Text style={styles.guarantorName}>{booking.guarantorName}</Text>
        </View>
      )}

      {/* Documents Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Feather name="file" size={18} color="#1a1a2e" />
          <Text style={styles.sectionTitle}>Submitted Documents</Text>
        </View>

        <Text style={styles.docGroupTitle}>Renter Documents</Text>
        {booking.drivingLicensePath && (
          <DocumentCard title="Driving License" path={booking.drivingLicensePath} icon="card-outline" />
        )}
        {booking.idProofPath && (
          <DocumentCard title="ID Proof (NIC/Passport)" path={booking.idProofPath} icon="finger-print-outline" />
        )}
        {booking.billingProofPath && (
          <DocumentCard title="Billing Proof" path={booking.billingProofPath} icon="receipt-outline" />
        )}

        <Text style={styles.docGroupTitle}>Guarantor Documents</Text>
        {booking.guarantorIdPath && (
          <DocumentCard title="Guarantor ID Proof" path={booking.guarantorIdPath} icon="person-outline" />
        )}
        {booking.guarantorBillingPath && (
          <DocumentCard title="Guarantor Billing Proof" path={booking.guarantorBillingPath} icon="receipt-outline" />
        )}
      </View>

      {/* Timestamps */}
      <View style={styles.timestampWrap}>
        <Text style={styles.timestampText}>Submitted: {new Date(booking.createdAt).toLocaleString()}</Text>
        {booking.updatedAt !== booking.createdAt && (
          <Text style={styles.timestampText}>Updated: {new Date(booking.updatedAt).toLocaleString()}</Text>
        )}
      </View>

      {/* Owner Actions */}
      {userId === booking.owner?._id && (
        <View style={styles.actionSection}>
          {booking.status === 'Pending' && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtn]}
                onPress={() => updateStatus('Rejected')}
              >
                <Ionicons name="close-circle" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.acceptBtn]}
                onPress={() => updateStatus('Accepted')}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>Accept</Text>
              </TouchableOpacity>
            </View>
          )}
          {booking.status === 'Accepted' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.completeBtn]}
              onPress={() => updateStatus('Completed')}
            >
              <Ionicons name="flag" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Mark as Completed</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  loaderText: { marginTop: 12, fontSize: 14, color: '#b2bec3' },
  errorText: { marginTop: 12, fontSize: 16, fontWeight: '600', color: '#e74c3c' },

  statusHeader: { alignItems: 'center', padding: 28, borderBottomWidth: 1, borderBottomColor: '#eee' },
  statusTitle: { fontSize: 24, fontWeight: '800', marginTop: 8 },
  statusSub: { fontSize: 13, color: '#636e72', marginTop: 4 },

  section: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 18, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }, android: { elevation: 2 } }) },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a2e' },

  vehicleCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  vehicleIconWrap: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#f0faf7', justifyContent: 'center', alignItems: 'center' },
  vehicleName: { fontSize: 18, fontWeight: '700', color: '#1a1a2e' },
  vehicleMeta: { fontSize: 13, color: '#b2bec3', marginTop: 2 },

  dateRow: { flexDirection: 'row', alignItems: 'center' },
  dateBox: { flex: 1, backgroundColor: '#f8f9fa', borderRadius: 10, padding: 14, alignItems: 'center' },
  dateLabel: { fontSize: 11, color: '#b2bec3', fontWeight: '600', textTransform: 'uppercase' },
  dateValue: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginTop: 4 },
  dateArrow: { paddingHorizontal: 10 },
  durationText: { textAlign: 'center', fontSize: 13, color: '#636e72', marginTop: 10 },

  personCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  personAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#10ac84', justifyContent: 'center', alignItems: 'center' },
  personAvatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  personName: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  personEmail: { fontSize: 12, color: '#b2bec3', marginTop: 2 },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0faf7', justifyContent: 'center', alignItems: 'center' },

  guarantorName: { fontSize: 16, fontWeight: '600', color: '#1a1a2e' },

  docGroupTitle: { fontSize: 14, fontWeight: '700', color: '#636e72', marginTop: 10, marginBottom: 8 },
  docCard: { backgroundColor: '#f8f9fa', borderRadius: 12, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#eee' },
  docHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#fff' },
  docTitle: { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
  docImage: { width: '100%', height: 200 },

  timestampWrap: { paddingHorizontal: 20, marginTop: 16, marginBottom: 20 },
  timestampText: { fontSize: 12, color: '#b2bec3', marginBottom: 4 },

  actionSection: { marginHorizontal: 16, marginTop: 24, marginBottom: 10 },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  rejectBtn: { backgroundColor: '#e74c3c' },
  acceptBtn: { backgroundColor: '#27ae60' },
  completeBtn: { backgroundColor: '#3498db' },
});
