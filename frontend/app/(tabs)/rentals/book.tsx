import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      Alert.alert('Error', 'Please fill all fields and upload all required documents.');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const formData = new FormData();

      formData.append('startDate', startDate);
      formData.append('endDate', endDate);
      formData.append('totalDays', '5'); // Simplified for now
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
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert('Success', 'Booking request submitted successfully!');
        router.back();
      } else {
        Alert.alert('Error', data.message || 'Booking failed');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const renderUploadBtn = (title: string, state: any, setter: any) => (
    <View style={styles.uploadRow}>
      <Text style={styles.uploadTitle}>{title}</Text>
      <TouchableOpacity style={styles.uploadBtn} onPress={() => pickImage(setter)}>
        <Text style={styles.uploadBtnText}>{state ? 'Change Image' : 'Upload Image'}</Text>
      </TouchableOpacity>
      {state && <Text style={styles.successText}>Uploaded ✅</Text>}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Submit Booking Request</Text>

      <Text style={styles.label}>Start Date (YYYY-MM-DD)</Text>
      <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder="2026-05-01" />

      <Text style={styles.label}>End Date (YYYY-MM-DD)</Text>
      <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} placeholder="2026-05-06" />

      <Text style={styles.label}>Guarantor Name</Text>
      <TextInput style={styles.input} value={guarantorName} onChangeText={setGuarantorName} placeholder="John Doe" />

      <Text style={styles.sectionHeading}>Your Proofs</Text>
      {renderUploadBtn('Valid Driving License', drivingLicense, setDrivingLicense)}
      {renderUploadBtn('ID Proof (NIC/Passport)', idProof, setIdProof)}
      {renderUploadBtn('Billing Proof (Utility Bill)', billingProof, setBillingProof)}

      <Text style={styles.sectionHeading}>Guarantor Proofs</Text>
      {renderUploadBtn('Guarantor ID Proof', guarantorId, setGuarantorId)}
      {renderUploadBtn('Guarantor Billing Proof', guarantorBilling, setGuarantorBilling)}

      <TouchableOpacity style={styles.submitBtn} onPress={handleBooking} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Request</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  heading: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#2c3e50' },
  label: { fontSize: 14, color: '#34495e', marginBottom: 6, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#bdc3c7', borderRadius: 8, padding: 12, marginBottom: 16 },
  sectionHeading: { fontSize: 18, fontWeight: 'bold', marginVertical: 10, color: '#2980b9' },
  uploadRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, justifyContent: 'space-between' },
  uploadTitle: { flex: 1, fontSize: 14, color: '#34495e' },
  uploadBtn: { backgroundColor: '#ecf0f1', padding: 10, borderRadius: 6 },
  uploadBtnText: { color: '#2980b9', fontWeight: '600' },
  successText: { color: '#27ae60', fontSize: 12, marginLeft: 8 },
  submitBtn: { backgroundColor: '#27ae60', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 20, marginBottom: 40 },
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
