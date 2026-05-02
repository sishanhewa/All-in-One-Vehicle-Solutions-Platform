import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function AddRentalScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [transmission, setTransmission] = useState<'Auto' | 'Manual'>('Auto');
  const [shortTermDailyRate, setShortTermDailyRate] = useState('');
  const [longTermMonthlyRate, setLongTermMonthlyRate] = useState('');
  const [mileageLimit, setMileageLimit] = useState('');
  const [mileageLimitType, setMileageLimitType] = useState<'Daily' | 'Monthly'>('Daily');
  const [extraMileageRate, setExtraMileageRate] = useState('');
  const [deposit, setDeposit] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<any[]>([]);

  const [reqDocs, setReqDocs] = useState({
    drivingLicense: true,
    idProof: true,
    billingProof: true,
    guarantorId: false,
    guarantorBilling: false
  });

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5,
    });
    if (!result.canceled) {
      setImages(result.assets.slice(0, 5));
    }
  };

  const handleSubmit = async () => {
    if (!make || !model || !year || !shortTermDailyRate || !longTermMonthlyRate || !mileageLimit || !extraMileageRate || !deposit) {
      Alert.alert('Error', 'Please fill all required fields.');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const formData = new FormData();

      formData.append('make', make);
      formData.append('model', model);
      formData.append('year', year);
      formData.append('transmission', transmission);
      formData.append('shortTermDailyRate', shortTermDailyRate);
      formData.append('longTermMonthlyRate', longTermMonthlyRate);
      formData.append('mileageLimit', mileageLimit);
      formData.append('mileageLimitType', mileageLimitType);
      formData.append('extraMileageRate', extraMileageRate);
      formData.append('deposit', deposit);
      formData.append('description', description);
      formData.append('requiredDocuments', JSON.stringify(reqDocs));

      images.forEach((img, idx) => {
        formData.append('images', {
          uri: img.uri,
          name: img.fileName || `image_${idx}.jpg`,
          type: img.mimeType || 'image/jpeg',
        } as any);
      });

      const response = await fetch('http://192.168.8.100:5000/api/rentals', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert('Success', 'Your vehicle has been listed for rent!');
        router.back();
      } else {
        Alert.alert('Error', data.message || 'Failed to create listing');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const ToggleBtn = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
    <TouchableOpacity
      style={[styles.toggleBtn, active && styles.toggleBtnActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.toggleBtnText, active && styles.toggleBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerCard}>
        <Ionicons name="car-sport" size={32} color="#10ac84" />
        <Text style={styles.heading}>List Vehicle for Rent</Text>
        <Text style={styles.subheading}>Fill in the details below to list your vehicle</Text>
      </View>

      {/* Vehicle Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vehicle Information</Text>

        <Text style={styles.label}>Make *</Text>
        <View style={styles.inputWrap}>
          <TextInput style={styles.input} value={make} onChangeText={setMake} placeholder="e.g. Toyota" placeholderTextColor="#b2bec3" />
        </View>

        <Text style={styles.label}>Model *</Text>
        <View style={styles.inputWrap}>
          <TextInput style={styles.input} value={model} onChangeText={setModel} placeholder="e.g. Axio" placeholderTextColor="#b2bec3" />
        </View>

        <Text style={styles.label}>Year *</Text>
        <View style={styles.inputWrap}>
          <TextInput style={styles.input} value={year} onChangeText={setYear} placeholder="e.g. 2020" placeholderTextColor="#b2bec3" keyboardType="numeric" />
        </View>

        <Text style={styles.label}>Transmission *</Text>
        <View style={styles.toggleRow}>
          <ToggleBtn label="Auto" active={transmission === 'Auto'} onPress={() => setTransmission('Auto')} />
          <ToggleBtn label="Manual" active={transmission === 'Manual'} onPress={() => setTransmission('Manual')} />
        </View>

        <Text style={styles.label}>Description</Text>
        <View style={styles.inputWrap}>
          <TextInput
            style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Additional details about the vehicle..."
            placeholderTextColor="#b2bec3"
            multiline
          />
        </View>
      </View>

      {/* Pricing Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pricing & Terms</Text>

        <View style={styles.row}>
          <View style={styles.halfCol}>
            <Text style={styles.label}>Daily Rate (Rs.) *</Text>
            <View style={styles.inputWrap}>
              <TextInput style={styles.input} value={shortTermDailyRate} onChangeText={setShortTermDailyRate} placeholder="5000" placeholderTextColor="#b2bec3" keyboardType="numeric" />
            </View>
          </View>
          <View style={styles.halfCol}>
            <Text style={styles.label}>Monthly Rate (Rs.) *</Text>
            <View style={styles.inputWrap}>
              <TextInput style={styles.input} value={longTermMonthlyRate} onChangeText={setLongTermMonthlyRate} placeholder="80000" placeholderTextColor="#b2bec3" keyboardType="numeric" />
            </View>
          </View>
        </View>

        <Text style={styles.label}>Mileage Limit (Km) *</Text>
        <View style={styles.inputWrap}>
          <TextInput style={styles.input} value={mileageLimit} onChangeText={setMileageLimit} placeholder="100" placeholderTextColor="#b2bec3" keyboardType="numeric" />
        </View>

        <Text style={styles.label}>Mileage Limit Type *</Text>
        <View style={styles.toggleRow}>
          <ToggleBtn label="Daily" active={mileageLimitType === 'Daily'} onPress={() => setMileageLimitType('Daily')} />
          <ToggleBtn label="Monthly" active={mileageLimitType === 'Monthly'} onPress={() => setMileageLimitType('Monthly')} />
        </View>

        <View style={styles.row}>
          <View style={styles.halfCol}>
            <Text style={styles.label}>Extra Mileage (Rs/Km) *</Text>
            <View style={styles.inputWrap}>
              <TextInput style={styles.input} value={extraMileageRate} onChangeText={setExtraMileageRate} placeholder="50" placeholderTextColor="#b2bec3" keyboardType="numeric" />
            </View>
          </View>
          <View style={styles.halfCol}>
            <Text style={styles.label}>Deposit (Rs.) *</Text>
            <View style={styles.inputWrap}>
              <TextInput style={styles.input} value={deposit} onChangeText={setDeposit} placeholder="25000" placeholderTextColor="#b2bec3" keyboardType="numeric" />
            </View>
          </View>
        </View>
      </View>

      {/* Required Documents Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Required Documents</Text>
        <Text style={styles.label}>Select what documents renters must submit:</Text>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Driving License</Text>
          <Switch value={reqDocs.drivingLicense} onValueChange={v => setReqDocs({...reqDocs, drivingLicense: v})} trackColor={{ true: '#10ac84' }} />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>ID Proof (NIC/Passport)</Text>
          <Switch value={reqDocs.idProof} onValueChange={v => setReqDocs({...reqDocs, idProof: v})} trackColor={{ true: '#10ac84' }} />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Billing Proof (Utility Bill)</Text>
          <Switch value={reqDocs.billingProof} onValueChange={v => setReqDocs({...reqDocs, billingProof: v})} trackColor={{ true: '#10ac84' }} />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Guarantor ID</Text>
          <Switch value={reqDocs.guarantorId} onValueChange={v => setReqDocs({...reqDocs, guarantorId: v})} trackColor={{ true: '#10ac84' }} />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Guarantor Billing Proof</Text>
          <Switch value={reqDocs.guarantorBilling} onValueChange={v => setReqDocs({...reqDocs, guarantorBilling: v})} trackColor={{ true: '#10ac84' }} />
        </View>
      </View>

      {/* Images Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vehicle Images</Text>
        <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImages} activeOpacity={0.7}>
          <Ionicons name="images-outline" size={24} color="#10ac84" />
          <Text style={styles.imagePickerText}>
            {images.length > 0 ? `${images.length} image(s) selected` : 'Select up to 5 images'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Submit */}
      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading} activeOpacity={0.8}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={22} color="#fff" />
            <Text style={styles.submitBtnText}>Publish Listing</Text>
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

  section: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16, borderRadius: 14, padding: 18, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }, android: { elevation: 2 } }) },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a2e', marginBottom: 14 },

  label: { fontSize: 13, fontWeight: '600', color: '#636e72', marginBottom: 6, marginTop: 4 },
  inputWrap: { backgroundColor: '#f8f9fa', borderRadius: 10, borderWidth: 1, borderColor: '#eee', marginBottom: 12 },
  input: { padding: 14, fontSize: 15, color: '#1a1a2e' },

  row: { flexDirection: 'row', gap: 12 },
  halfCol: { flex: 1 },

  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f1f3f5' },
  switchLabel: { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },

  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  toggleBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#f8f9fa', alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  toggleBtnActive: { backgroundColor: '#10ac84', borderColor: '#10ac84' },
  toggleBtnText: { fontSize: 14, fontWeight: '600', color: '#636e72' },
  toggleBtnTextActive: { color: '#fff' },

  imagePickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 18, borderRadius: 12, borderWidth: 2, borderColor: '#10ac84', borderStyle: 'dashed' },
  imagePickerText: { fontSize: 15, fontWeight: '600', color: '#10ac84' },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10ac84', marginHorizontal: 16, marginTop: 20, padding: 18, borderRadius: 14 },
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
