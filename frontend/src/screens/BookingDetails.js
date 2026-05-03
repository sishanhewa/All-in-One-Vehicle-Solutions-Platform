import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { fetchBookingById, cancelBookingAPI, resolveInspectionImageUrl, INSPECTION_API_URL } from '../api/inspectionApi';
import { AuthContext } from '../context/AuthContext';
import { Feather, Ionicons } from '@expo/vector-icons';

const STATUS_STEPS = ['Pending', 'Confirmed', 'In Progress', 'Completed'];
const STATUS_COLORS = {
  'Pending': '#e67e22',
  'Confirmed': '#3498db',
  'In Progress': '#f39c12',
  'Completed': '#10ac84',
  'Cancelled': '#e74c3c',
};

const CONDITION_COLORS = {
  'Excellent': '#10ac84',
  'Good': '#3498db',
  'Fair': '#f39c12',
  'Poor': '#e74c3c',
  'N/A': '#b2bec3',
};

const BookingDetails = () => {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams();
  const { userInfo } = useContext(AuthContext);
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBooking();
  }, [bookingId]);

  const loadBooking = async () => {
    try {
      const data = await fetchBookingById(bookingId);
      setBooking(data);
    } catch (error) {
      Alert.alert('Error', 'Could not load booking details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this inspection booking?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive',
        onPress: async () => {
          try {
            await cancelBookingAPI(bookingId, 'Cancelled by user');
            Alert.alert('Cancelled', 'Your booking has been cancelled.');
            loadBooking();
          } catch (error) {
            Alert.alert('Failed', error.message);
          }
        }
      }
    ]);
  };

  const handleDownloadPDF = async () => {
    try {
      setLoading(true);
      const url = `${INSPECTION_API_URL}/bookings/${bookingId}/report-pdf`;
      const fileUri = FileSystem.documentDirectory + `report_${bookingId}.pdf`;
      
      const { uri } = await FileSystem.downloadAsync(url, fileUri, {
        headers: { Authorization: `Bearer ${userInfo?.token || ''}` },
      });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('Success', 'PDF downloaded to ' + uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to download PDF report');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e67e22" />
        <Text style={styles.loadingTxt}>Loading booking details...</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.center}>
        <Feather name="alert-circle" size={48} color="#dfe6e9" />
        <Text style={styles.errorText}>Booking not found</Text>
      </View>
    );
  }

  const isUser = booking.userId?._id === userInfo?._id;
  const canCancel = isUser && ['Pending', 'Confirmed'].includes(booking.status);
  const companyProfile = booking.companyId?.companyProfile || {};
  const currentStepIdx = booking.status === 'Cancelled' ? -1 : STATUS_STEPS.indexOf(booking.status);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Status Progress */}
      <View style={styles.progressCard}>
        {booking.status === 'Cancelled' ? (
          <View style={styles.cancelledBanner}>
            <Ionicons name="close-circle" size={24} color="#e74c3c" />
            <Text style={styles.cancelledText}>Booking Cancelled</Text>
            {booking.cancelReason && <Text style={styles.cancelReason}>{booking.cancelReason}</Text>}
          </View>
        ) : (
          <View style={styles.progressRow}>
            {STATUS_STEPS.map((step, idx) => (
              <View key={step} style={styles.progressStep}>
                <View style={[styles.progressDot, idx <= currentStepIdx && { backgroundColor: STATUS_COLORS[booking.status] }]} >
                  {idx <= currentStepIdx && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
                <Text style={[styles.progressLabel, idx <= currentStepIdx && { color: '#1a1a2e', fontWeight: '700' }]}>{step}</Text>
                {idx < STATUS_STEPS.length - 1 && (
                  <View style={[styles.progressLine, idx < currentStepIdx && { backgroundColor: STATUS_COLORS[booking.status] }]} />
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.content}>
        {/* Vehicle Info */}
        <Text style={styles.sectionTitle}>Vehicle</Text>
        <View style={styles.infoCard}>
          <View style={styles.vehicleHeader}>
            <View style={styles.vehicleIconWrap}>
              <Ionicons name="car-sport" size={24} color="#e67e22" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.vehicleTitle}>{booking.vehicleInfo?.year} {booking.vehicleInfo?.make} {booking.vehicleInfo?.model}</Text>
              <Text style={styles.plateText}>{booking.vehicleInfo?.plateNumber} · {booking.vehicleInfo?.vehicleType}</Text>
            </View>
          </View>
        </View>

        {/* Appointment Info */}
        <Text style={styles.sectionTitle}>Appointment</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Feather name="briefcase" size={15} color="#e67e22" />
            <Text style={styles.infoText}>{companyProfile.companyName || booking.companyId?.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Feather name="package" size={15} color="#e67e22" />
            <Text style={styles.infoText}>{booking.packageId?.name} — Rs. {Number(booking.packageId?.price || 0).toLocaleString()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={15} color="#e67e22" />
            <Text style={styles.infoText}>{formatDate(booking.appointmentDate)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={15} color="#e67e22" />
            <Text style={styles.infoText}>{booking.appointmentTime}</Text>
          </View>
          {booking.notes ? (
            <View style={styles.infoRow}>
              <Feather name="message-square" size={15} color="#e67e22" />
              <Text style={styles.infoText}>{booking.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* Inspection Results (if completed) */}
        {booking.status === 'Completed' && (
          <>
            <Text style={styles.sectionTitle}>Inspection Results</Text>

            {/* Overall Result */}
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <View style={[styles.resultBadge, {
                  backgroundColor: booking.inspectionResult === 'Pass' ? '#f0faf7' : booking.inspectionResult === 'Fail' ? '#fff0f0' : '#fef9f0'
                }]}>
                  <Ionicons
                    name={booking.inspectionResult === 'Pass' ? 'checkmark-circle' : booking.inspectionResult === 'Fail' ? 'close-circle' : 'warning'}
                    size={28}
                    color={booking.inspectionResult === 'Pass' ? '#10ac84' : booking.inspectionResult === 'Fail' ? '#e74c3c' : '#f39c12'}
                  />
                  <Text style={[styles.resultTitle, {
                    color: booking.inspectionResult === 'Pass' ? '#10ac84' : booking.inspectionResult === 'Fail' ? '#e74c3c' : '#f39c12'
                  }]}>
                    {booking.inspectionResult}
                  </Text>
                </View>
                {booking.overallScore != null && (
                  <View style={styles.scoreCircle}>
                    <Text style={styles.scoreNum}>{booking.overallScore}</Text>
                    <Text style={styles.scoreLabel}>/100</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Inspection Report Form Data */}
            {booking.inspectionReport ? (
              <View style={styles.checklistCard}>
                <Text style={styles.checklistTitle}>Detailed Vehicle Report</Text>
                
                <View style={styles.reportSummaryRow}>
                  <Text style={styles.reportLabel}>Power System:</Text>
                  <Text style={styles.reportValue}>{booking.inspectionReport.vehiclePowerSystem || 'N/A'}</Text>
                </View>
                <View style={styles.reportSummaryRow}>
                  <Text style={styles.reportLabel}>Meter Reading:</Text>
                  <Text style={styles.reportValue}>{booking.inspectionReport.meterReading || 'N/A'}</Text>
                </View>
                
                <View style={{ height: 1, backgroundColor: '#eee', marginVertical: 10 }} />
                
                <Text style={[styles.checklistTitle, { fontSize: 13, color: '#636e72', marginBottom: 10 }]}>
                  Legend: ✓ Checked, X Problem, A Adjusted, C Clean, R Replace
                </Text>
                
                <TouchableOpacity style={styles.downloadPdfBtn} onPress={handleDownloadPDF}>
                  <Feather name="download-cloud" size={20} color="#fff" />
                  <Text style={styles.downloadPdfBtnText}>Download Full PDF Report</Text>
                </TouchableOpacity>
              </View>
            ) : (
              booking.checklist && booking.checklist.length > 0 && (
                <View style={styles.checklistCard}>
                  <Text style={styles.checklistTitle}>Detailed Checklist</Text>
                  {booking.checklist.map((item, idx) => (
                    <View key={idx} style={styles.checklistItem}>
                      <View style={[styles.conditionDot, { backgroundColor: CONDITION_COLORS[item.condition] || '#b2bec3' }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.checklistItemName}>{item.item}</Text>
                        <Text style={[styles.checklistCondition, { color: CONDITION_COLORS[item.condition] || '#b2bec3' }]}>{item.condition}</Text>
                        {item.notes ? <Text style={styles.checklistNotes}>{item.notes}</Text> : null}
                      </View>
                    </View>
                  ))}
                </View>
              )
            )}

            {/* Remarks */}
            {booking.inspectionReport?.remarks || booking.resultRemarks ? (
              <View style={styles.remarksCard}>
                <Text style={styles.remarksTitle}>Inspector Remarks</Text>
                <Text style={styles.remarksText}>{booking.inspectionReport?.remarks || booking.resultRemarks}</Text>
              </View>
            ) : null}

            {/* Report Images */}
            {booking.reportImages && booking.reportImages.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Report Images</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
                  {booking.reportImages.map((img, idx) => (
                    <Image key={idx} source={{ uri: resolveInspectionImageUrl(img) }} style={styles.reportImage} />
                  ))}
                </ScrollView>
              </>
            )}
          </>
        )}

        {/* Cancel Button */}
        {canCancel && (
          <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.7} onPress={handleCancel}>
            <Feather name="x-circle" size={18} color="#e74c3c" />
            <Text style={styles.cancelBtnText}>Cancel Booking</Text>
          </TouchableOpacity>
        )}

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

  progressCard: { backgroundColor: '#fff', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  progressStep: { alignItems: 'center', flex: 1 },
  progressDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#e9ecef', justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  progressLabel: { fontSize: 10, color: '#b2bec3', textAlign: 'center' },
  progressLine: { position: 'absolute', top: 13, left: '55%', right: '-45%', height: 3, backgroundColor: '#e9ecef', zIndex: -1 },

  cancelledBanner: { alignItems: 'center', gap: 8 },
  cancelledText: { fontSize: 18, fontWeight: '700', color: '#e74c3c' },
  cancelReason: { fontSize: 13, color: '#636e72', fontStyle: 'italic' },

  content: { padding: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a2e', marginBottom: 12, marginTop: 8 },

  infoCard: { backgroundColor: '#fff', padding: 18, borderRadius: 14, marginBottom: 20, gap: 14, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 }, android: { elevation: 2 } }) },
  vehicleHeader: { flexDirection: 'row', alignItems: 'center' },
  vehicleIconWrap: { width: 50, height: 50, borderRadius: 14, backgroundColor: '#fef9f0', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  vehicleTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e' },
  plateText: { fontSize: 13, color: '#b2bec3', fontWeight: '600', marginTop: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoText: { fontSize: 14, color: '#4a4a4a', flex: 1 },

  resultCard: { backgroundColor: '#fff', padding: 20, borderRadius: 14, marginBottom: 16, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 }, android: { elevation: 2 } }) },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultBadge: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14 },
  resultTitle: { fontSize: 22, fontWeight: '800' },
  scoreCircle: { alignItems: 'center', width: 70, height: 70, borderRadius: 35, backgroundColor: '#f8f9fa', justifyContent: 'center', borderWidth: 3, borderColor: '#e67e22' },
  scoreNum: { fontSize: 22, fontWeight: '800', color: '#1a1a2e' },
  scoreLabel: { fontSize: 11, color: '#b2bec3', fontWeight: '600' },

  checklistCard: { backgroundColor: '#fff', padding: 18, borderRadius: 14, marginBottom: 16, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 }, android: { elevation: 2 } }) },
  checklistTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginBottom: 14 },
  checklistItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#f1f3f5' },
  conditionDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  checklistItemName: { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
  checklistCondition: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
  checklistNotes: { fontSize: 12, color: '#636e72', marginTop: 4, fontStyle: 'italic' },

  remarksCard: { backgroundColor: '#fff', padding: 18, borderRadius: 14, marginBottom: 16, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 }, android: { elevation: 2 } }) },
  remarksTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginBottom: 8 },
  remarksText: { fontSize: 14, color: '#4a4a4a', lineHeight: 22 },

  imagesScroll: { marginBottom: 20 },
  reportImage: { width: 200, height: 150, borderRadius: 12, marginRight: 12, resizeMode: 'cover' },

  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#fce4e4', marginTop: 10 },
  cancelBtnText: { color: '#e74c3c', fontWeight: '700', fontSize: 16 },

  reportSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  reportLabel: { fontSize: 14, color: '#636e72', fontWeight: '500' },
  reportValue: { fontSize: 14, color: '#1a1a2e', fontWeight: '700' },

  downloadPdfBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#e67e22', padding: 14, borderRadius: 12, marginTop: 16 },
  downloadPdfBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default BookingDetails;
