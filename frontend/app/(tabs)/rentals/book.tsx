import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, Feather } from '@expo/vector-icons';

export default function BookVehicleScreen() {
  const { vehicleId } = useLocalSearchParams();
  const router = useRouter();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [guarantorName, setGuarantorName] = useState('');
  
  const [drivingLicense, setDrivingLicense] = useState<any>(null);
  const [idProof, setIdProof] = useState<any>(null);
  const [billingProof, setBillingProof] = useState<any>(null);
  const [guarantorId, setGuarantorId] = useState<any>(null);
  const [guarantorBilling, setGuarantorBilling] = useState<any>(null);

  const [loading, setLoading] = useState(false);

  const pickImage = async (setter: any) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setter(result.assets[0]);
    }
  };

  const handleBooking = async () => {
    if (!startDate || !endDate || !guarantorName || !drivingLicense || !idProof || !billingProof || !guarantorId || !guarantorBilling) {
      Alert.alert('Missing Information', 'Please fill all fields and upload all required documents.');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const formData = new FormData();

      formData.append('startDate', startDate);
      formData.append('endDate', endDate);
      formData.append('totalDays', '5');
      formData.append('totalMonths', '0');
      formData.append('guarantorName', guarantorName);

      const appendFile = (key: string, file: any) => {
        formData.append(key, {
          uri: file.uri,
          name: file.fileName || `${key}.jpg`,
          type: file.mimeType || 'image/jpeg',
        } as any);
      };

      appendFile('drivingLicense', drivingLicense);
      appendFile('idProof', idProof);
      appendFile('billingProof', billingProof);
      appendFile('guarantorId', guarantorId);
      appendFile('guarantorBilling', guarantorBilling);

      const response = await fetch(`http://10.0.2.2:5000/api/rentals/${vehicleId}/book`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert('Booking Submitted!', 'Your booking request has been sent to the vehicle owner. You will be notified once they respond.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Error', data.message || 'Booking failed');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderUploadBtn = (title: string, icon: string, state: any, setter: any) => (
    <TouchableOpacity 
      style={[styles.uploadCard, state && styles.uploadCardDone]} 
      onPress={() => pickImage(setter)}
      activeOpacity={0.7}
    >
      <View style={[styles.uploadIconWrap, state && styles.uploadIconWrapDone]}>
        <Ionicons name={state ? 'checkmark-circle' : (icon as any)} size={22} color={state ? '#27ae60' : '#b2bec3'} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.uploadTitle, state && styles.uploadTitleDone]}>{title}</Text>
        <Text style={styles.uploadSub}>{state ? 'Uploaded successfully' : 'Tap to upload'}</Text>
      </View>
      <Feather name={state ? 'check' : 'upload'} size={16} color={state ? '#27ae60' : '#b2bec3'} />
    </TouchableOpacity>
  );

  const completedCount = [drivingLicense, idProof, billingProof, guarantorId, guarantorBilling].filter(Boolean).length;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerCard}>
        <Ionicons name="document-text" size={32} color="#10ac84" />
        <Text style={styles.heading}>Submit Booking Request</Text>
        <Text style={styles.subheading}>Complete all fields to request this vehicle</Text>
      </View>

      {/* Progress */}
      <View style={styles.progressWrap}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(completedCount / 5) * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>{completedCount}/5 documents uploaded</Text>
      </View>

      {/* Dates Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Feather name="calendar" size={18} color="#1a1a2e" />
          <Text style={styles.sectionTitle}>Rental Period</Text>
        </View>

        <Text style={styles.label}>Start Date</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="calendar-outline" size={18} color="#b2bec3" style={{ marginLeft: 14 }} />
          <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" placeholderTextColor="#b2bec3" />
        </View>

        <Text style={styles.label}>End Date</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="calendar-outline" size={18} color="#b2bec3" style={{ marginLeft: 14 }} />
          <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" placeholderTextColor="#b2bec3" />
        </View>
      </View>

      {/* Your Documents */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Feather name="file" size={18} color="#1a1a2e" />
          <Text style={styles.sectionTitle}>Your Documents</Text>
        </View>
        {renderUploadBtn('Driving License', 'card-outline', drivingLicense, setDrivingLicense)}
        {renderUploadBtn('ID Proof (NIC/Passport)', 'finger-print-outline', idProof, setIdProof)}
        {renderUploadBtn('Billing Proof (Utility Bill)', 'receipt-outline', billingProof, setBillingProof)}
      </View>

      {/* Guarantor Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Feather name="users" size={18} color="#1a1a2e" />
          <Text style={styles.sectionTitle}>Guarantor Information</Text>
        </View>

        <Text style={styles.label}>Guarantor Name</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="person-outline" size={18} color="#b2bec3" style={{ marginLeft: 14 }} />
          <TextInput style={styles.input} value={guarantorName} onChangeText={setGuarantorName} placeholder="Full name of your guarantor" placeholderTextColor="#b2bec3" />
        </View>

        {renderUploadBtn('Guarantor ID Proof', 'person-outline', guarantorId, setGuarantorId)}
        {renderUploadBtn('Guarantor Billing Proof', 'receipt-outline', guarantorBilling, setGuarantorBilling)}
      </View>

      {/* Submit */}
      <TouchableOpacity style={styles.submitBtn} onPress={handleBooking} disabled={loading} activeOpacity={0.8}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="send" size={20} color="#fff" />
            <Text style={styles.submitBtnText}>Submit Booking Request</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },

  headerCard: { alignItems: 'center', padding: 24, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  heading: { fontSize: 22, fontWeight: '800', color: '#1a1a2e', marginTop: 10 },
  subheading: { fontSize: 13, color: '#b2bec3', marginTop: 4 },

  progressWrap: { marginHorizontal: 16, marginTop: 16 },
  progressBar: { height: 6, backgroundColor: '#eee', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#10ac84', borderRadius: 3 },
  progressText: { fontSize: 12, color: '#b2bec3', marginTop: 6, textAlign: 'right' },

  section: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 14, borderRadius: 14, padding: 18, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }, android: { elevation: 2 } }) },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a2e' },

  label: { fontSize: 13, fontWeight: '600', color: '#636e72', marginBottom: 6, marginTop: 4 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 10, borderWidth: 1, borderColor: '#eee', marginBottom: 12 },
  input: { flex: 1, padding: 14, fontSize: 15, color: '#1a1a2e' },

  uploadCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#eee', marginBottom: 10 },
  uploadCardDone: { borderColor: '#27ae60', backgroundColor: '#f0fff4' },
  uploadIconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: '#eee' },
  uploadIconWrapDone: { backgroundColor: '#e8f5e9', borderColor: '#27ae60' },
  uploadTitle: { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
  uploadTitleDone: { color: '#27ae60' },
  uploadSub: { fontSize: 11, color: '#b2bec3', marginTop: 2 },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10ac84', marginHorizontal: 16, marginTop: 20, padding: 18, borderRadius: 14 },
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
