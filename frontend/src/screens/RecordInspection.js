import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { completeInspectionAPI, uploadReportImagesAPI } from '../api/inspectionApi';
import * as ImagePicker from 'expo-image-picker';
import { Feather, Ionicons } from '@expo/vector-icons';

const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor', 'N/A'];
const RESULTS = ['Pass', 'Fail', 'Conditional'];

const CONDITION_COLORS = {
  'Excellent': '#10ac84',
  'Good': '#3498db',
  'Fair': '#f39c12',
  'Poor': '#e74c3c',
  'N/A': '#b2bec3',
};

const RecordInspection = () => {
  const router = useRouter();
  const { bookingId, bookingData } = useLocalSearchParams();
  const booking = bookingData ? JSON.parse(bookingData) : null;

  // Get checklist items from the package
  const packageChecklist = booking?.packageId?.checklistItems || ['Engine', 'Transmission', 'Brakes', 'Suspension', 'Electrical', 'Exterior Body', 'Interior', 'Tires'];

  const [checklist, setChecklist] = useState(
    packageChecklist.map(item => ({ item, condition: 'Good', notes: '' }))
  );
  const [inspectionResult, setInspectionResult] = useState('Pass');
  const [overallScore, setOverallScore] = useState('85');
  const [resultRemarks, setResultRemarks] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [loading, setLoading] = useState(false);

  const updateChecklistItem = (idx, field, value) => {
    setChecklist(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const pickImages = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow photo access to upload report images.');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.7,
    });
    if (!result.canceled && result.assets) setSelectedImages(result.assets);
  };

  const handleSubmit = async () => {
    if (!inspectionResult || !overallScore) {
      Alert.alert('Missing Fields', 'Please provide the inspection result and overall score.');
      return;
    }

    const score = Number(overallScore);
    if (isNaN(score) || score < 0 || score > 100) {
      Alert.alert('Invalid Score', 'Overall score must be between 0 and 100.');
      return;
    }

    setLoading(true);
    try {
      // First complete the inspection with results
      await completeInspectionAPI(bookingId, {
        inspectionResult,
        overallScore: score,
        checklist,
        resultRemarks,
      });

      // Then upload images if any
      if (selectedImages.length > 0) {
        const formData = new FormData();
        selectedImages.forEach((img, i) => {
          formData.append('reportImages', { uri: img.uri, type: 'image/jpeg', name: `report-${Date.now()}-${i}.jpg` });
        });
        await uploadReportImagesAPI(bookingId, formData);
      }

      Alert.alert(
        'Inspection Complete! ✅',
        'The inspection results have been recorded and the customer will be notified.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert('Failed', error.message || 'Could not save inspection results');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.header}>Record Results</Text>

      {/* Vehicle Summary */}
      {booking && (
        <View style={styles.vehicleSummary}>
          <Ionicons name="car-sport" size={20} color="#e67e22" />
          <Text style={styles.vehicleText}>
            {booking.vehicleInfo?.year} {booking.vehicleInfo?.make} {booking.vehicleInfo?.model} · {booking.vehicleInfo?.plateNumber}
          </Text>
        </View>
      )}

      {/* Checklist */}
      <Text style={styles.sectionTitle}>Inspection Checklist</Text>
      {checklist.map((item, idx) => (
        <View key={idx} style={styles.checkCard}>
          <Text style={styles.checkItemName}>{item.item}</Text>
          <View style={styles.conditionRow}>
            {CONDITIONS.map(cond => (
              <TouchableOpacity
                key={cond}
                style={[styles.conditionChip, item.condition === cond && { backgroundColor: CONDITION_COLORS[cond], borderColor: CONDITION_COLORS[cond] }]}
                activeOpacity={0.7}
                onPress={() => updateChecklistItem(idx, 'condition', cond)}
              >
                <Text style={[styles.conditionText, item.condition === cond && { color: '#fff' }]}>{cond}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.checkNotes}
            placeholder="Notes (optional)"
            placeholderTextColor="#b2bec3"
            value={item.notes}
            onChangeText={(v) => updateChecklistItem(idx, 'notes', v)}
          />
        </View>
      ))}

      {/* Overall Result */}
      <Text style={styles.sectionTitle}>Overall Result</Text>
      <View style={styles.resultRow}>
        {RESULTS.map(result => (
          <TouchableOpacity
            key={result}
            style={[styles.resultBtn,
              inspectionResult === result && {
                backgroundColor: result === 'Pass' ? '#10ac84' : result === 'Fail' ? '#e74c3c' : '#f39c12',
                borderColor: result === 'Pass' ? '#10ac84' : result === 'Fail' ? '#e74c3c' : '#f39c12',
              }
            ]}
            activeOpacity={0.7}
            onPress={() => setInspectionResult(result)}
          >
            <Ionicons
              name={result === 'Pass' ? 'checkmark-circle' : result === 'Fail' ? 'close-circle' : 'warning'}
              size={18}
              color={inspectionResult === result ? '#fff' : '#636e72'}
            />
            <Text style={[styles.resultBtnText, inspectionResult === result && { color: '#fff' }]}>{result}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Overall Score */}
      <Text style={styles.sectionTitle}>Overall Score (0-100)</Text>
      <View style={styles.scoreInputWrap}>
        <Ionicons name="speedometer-outline" size={20} color="#e67e22" />
        <TextInput
          style={styles.scoreInput}
          placeholder="85"
          placeholderTextColor="#b2bec3"
          keyboardType="numeric"
          value={overallScore}
          onChangeText={setOverallScore}
          maxLength={3}
        />
        <Text style={styles.scoreMax}>/100</Text>
      </View>

      {/* Remarks */}
      <Text style={styles.sectionTitle}>Inspector Remarks</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Summary of the inspection findings and recommendations..."
        placeholderTextColor="#b2bec3"
        multiline numberOfLines={5}
        value={resultRemarks} onChangeText={setResultRemarks}
      />

      {/* Report Images */}
      <TouchableOpacity style={styles.imageBtn} activeOpacity={0.7} onPress={pickImages}>
        <Feather name="camera" size={20} color={selectedImages.length > 0 ? '#e67e22' : '#636e72'} />
        <Text style={[styles.imageBtnText, selectedImages.length > 0 && { color: '#e67e22' }]}>
          {selectedImages.length > 0 ? `${selectedImages.length} image(s) selected` : 'Upload Report Images (up to 10)'}
        </Text>
      </TouchableOpacity>

      {/* Submit */}
      <TouchableOpacity style={styles.submitBtn} activeOpacity={0.85} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : (
          <>
            <Feather name="check-circle" size={18} color="#fff" />
            <Text style={styles.submitBtnText}>Submit Results</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  header: { fontSize: 26, fontWeight: '800', color: '#1a1a2e', marginBottom: 16, letterSpacing: -0.3 },

  vehicleSummary: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fef9f0', padding: 16, borderRadius: 14, marginBottom: 24, borderWidth: 1, borderColor: '#fde8c8' },
  vehicleText: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', flex: 1 },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a2e', marginBottom: 12, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },

  checkCard: { backgroundColor: '#f8f9fa', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e9ecef' },
  checkItemName: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginBottom: 10 },
  conditionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  conditionChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#e9ecef', backgroundColor: '#fff' },
  conditionText: { fontSize: 12, fontWeight: '600', color: '#636e72' },
  checkNotes: { backgroundColor: '#fff', borderRadius: 10, padding: 10, fontSize: 13, color: '#1a1a2e', borderWidth: 1, borderColor: '#e9ecef' },

  resultRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  resultBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, borderWidth: 2, borderColor: '#e9ecef', backgroundColor: '#fff' },
  resultBtnText: { fontSize: 15, fontWeight: '700', color: '#636e72' },

  scoreInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f8f9fa', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#e9ecef' },
  scoreInput: { flex: 1, fontSize: 24, fontWeight: '800', color: '#1a1a2e', textAlign: 'center' },
  scoreMax: { fontSize: 18, color: '#b2bec3', fontWeight: '600' },

  input: { backgroundColor: '#f8f9fa', borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 15, color: '#1a1a2e', borderWidth: 1, borderColor: '#e9ecef' },
  textArea: { height: 110, textAlignVertical: 'top' },

  imageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#f8f9fa', padding: 18, borderRadius: 14, marginBottom: 20, borderWidth: 2, borderColor: '#e9ecef', borderStyle: 'dashed' },
  imageBtnText: { color: '#636e72', fontSize: 15, fontWeight: '600' },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#10ac84', padding: 18, borderRadius: 14, ...Platform.select({ ios: { shadowColor: '#10ac84', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }, android: { elevation: 4 } }) },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});

export default RecordInspection;
