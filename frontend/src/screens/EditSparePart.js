import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { fetchPartById, updatePartAPI, resolveImageUrl } from '../api/sparePartsApi';
import { Ionicons } from '@expo/vector-icons';

const CATEGORIES = ['Engine', 'Brakes', 'Suspension', 'Electrical', 'Body', 'Interior', 'Exhaust', 'Transmission', 'Wheels & Tires', 'Other'];
const CONDITIONS = ['New', 'Used', 'Refurbished'];
const STATUSES = ['Available', 'Sold', 'Removed'];

const EditSparePart = () => {
  const { partId } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState({
    partName: '', partNumber: '', price: '', quantity: '1',
    category: 'Other', condition: 'Used', location: '', description: '', status: 'Available',
    compatibilityMake: '', compatibilityModel: '', compatibilityYearFrom: '',
    compatibilityYearTo: '', compatibilityEngineType: ''
  });
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const loadPart = async () => {
      try {
        const data = await fetchPartById(partId);
        setForm({
          partName: data.partName || '',
          partNumber: data.partNumber || '',
          price: data.price?.toString() || '',
          quantity: data.quantity?.toString() || '1',
          category: data.category || 'Other',
          condition: data.condition || 'Used',
          location: data.location || '',
          description: data.description || '',
          status: data.status || 'Available',
          compatibilityMake: data.compatibility?.make || '',
          compatibilityModel: data.compatibility?.model || '',
          compatibilityYearFrom: data.compatibility?.yearFrom?.toString() || '',
          compatibilityYearTo: data.compatibility?.yearTo?.toString() || '',
          compatibilityEngineType: data.compatibility?.engineType || ''
        });
        
        // Load existing images
        if (data.images && data.images.length > 0) {
          // For editing, we might need a mix of new URIs and existing server URLs.
          // Since the API replaces ALL images if files are sent, we handle this carefully.
          // For simplicity in this UI pattern, if user picks images, it replaces all.
          // Otherwise, we show existing images but don't send them as files.
          setImages(data.images.map(img => resolveImageUrl(img)));
        }
      } catch (error) {
        Alert.alert('Error', error.message || 'Failed to load part details');
        router.back();
      } finally {
        setLoading(false);
      }
    };
    if (partId) loadPart();
  }, [partId]);

  const updateField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      // NOTE: For this API pattern, selecting new images replaces all old images
      Alert.alert('Note', 'Selecting new images will replace all existing images.');
      setImages(result.assets.map(a => a.uri).slice(0, 5));
    }
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!form.partName || !form.price || !form.location) {
      Alert.alert('Missing Fields', 'Please fill in part name, price, and location.');
      return;
    }

    setUpdating(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value !== undefined && value !== null) formData.append(key, value);
      });
      
      // Only append files if they are local file URIs (meaning user selected new images)
      const hasNewImages = images.some(uri => uri.startsWith('file://'));
      if (hasNewImages) {
        images.forEach((uri, index) => {
          if (uri.startsWith('file://')) {
            formData.append('images', {
              uri,
              name: `part_${index}.jpg`,
              type: 'image/jpeg',
            });
          }
        });
      }

      await updatePartAPI(partId, formData);
      Alert.alert('Success', 'Spare part updated!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setUpdating(false);
    }
  };

  const renderPicker = (label, options, selectedValue, onSelect) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.optionRow}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt}
              style={[styles.optionBtn, selectedValue === opt && styles.optionBtnActive]}
              onPress={() => onSelect(opt)}
            >
              <Text style={[styles.optionTxt, selectedValue === opt && styles.optionTxtActive]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loaderText}>Loading details...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 40) }} showsVerticalScrollIndicator={false}>
      
      {/* Image Upload */}
      <View style={styles.imageSection}>
        <Text style={styles.label}>Photos (Replace All)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
          {images.map((uri, index) => (
            <View key={index} style={styles.imagePreviewWrap}>
              <Image source={{ uri }} style={styles.imagePreview} />
              <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(index)}>
                <Ionicons name="close-circle" size={24} color="#e74c3c" />
              </TouchableOpacity>
            </View>
          ))}
          {images.length < 5 && (
            <TouchableOpacity style={styles.addImageBtn} onPress={pickImages}>
              <Ionicons name="camera-outline" size={32} color="#3498db" />
              <Text style={styles.addImageTxt}>New Photos</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        
        {renderPicker('Status', STATUSES, form.status, (v) => updateField('status', v))}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Part Name *</Text>
          <TextInput style={styles.input} placeholder="e.g. Brake Pads Set" value={form.partName} onChangeText={(v) => updateField('partName', v)} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Part Number</Text>
          <TextInput style={styles.input} placeholder="e.g. OEM-123456" value={form.partNumber} onChangeText={(v) => updateField('partNumber', v)} />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Price (LKR) *</Text>
            <TextInput style={styles.input} placeholder="Rs." keyboardType="numeric" value={form.price} onChangeText={(v) => updateField('price', v)} />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>Quantity</Text>
            <TextInput style={styles.input} placeholder="1" keyboardType="numeric" value={form.quantity} onChangeText={(v) => updateField('quantity', v)} />
          </View>
        </View>

        {renderPicker('Category', CATEGORIES, form.category, (v) => updateField('category', v))}
        {renderPicker('Condition', CONDITIONS, form.condition, (v) => updateField('condition', v))}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Location *</Text>
          <TextInput style={styles.input} placeholder="e.g. Colombo 03" value={form.location} onChangeText={(v) => updateField('location', v)} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            placeholder="Detailed description..." 
            multiline 
            numberOfLines={4}
            value={form.description} 
            onChangeText={(v) => updateField('description', v)} 
          />
        </View>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Compatibility Details</Text>
        
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Make</Text>
            <TextInput style={styles.input} placeholder="e.g. Toyota" value={form.compatibilityMake} onChangeText={(v) => updateField('compatibilityMake', v)} />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>Model</Text>
            <TextInput style={styles.input} placeholder="e.g. Corolla" value={form.compatibilityModel} onChangeText={(v) => updateField('compatibilityModel', v)} />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Year From</Text>
            <TextInput style={styles.input} placeholder="e.g. 2015" keyboardType="numeric" value={form.compatibilityYearFrom} onChangeText={(v) => updateField('compatibilityYearFrom', v)} />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>Year To</Text>
            <TextInput style={styles.input} placeholder="e.g. 2023" keyboardType="numeric" value={form.compatibilityYearTo} onChangeText={(v) => updateField('compatibilityYearTo', v)} />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Engine Type</Text>
          <TextInput style={styles.input} placeholder="e.g. 1.8L Hybrid" value={form.compatibilityEngineType} onChangeText={(v) => updateField('compatibilityEngineType', v)} />
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={updating}>
          {updating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnTxt}>Update Spare Part</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 12, color: '#b2bec3', fontSize: 14 },
  
  imageSection: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  imageScroll: { marginTop: 10 },
  imagePreviewWrap: { marginRight: 15, position: 'relative' },
  imagePreview: { width: 100, height: 100, borderRadius: 12, backgroundColor: '#f1f3f5' },
  removeImageBtn: { position: 'absolute', top: -10, right: -10, backgroundColor: '#fff', borderRadius: 12 },
  addImageBtn: { width: 100, height: 100, borderRadius: 12, borderWidth: 2, borderColor: '#3498db', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#eaf4fc' },
  addImageTxt: { color: '#3498db', fontSize: 12, fontWeight: '600', marginTop: 4 },

  formSection: { padding: 20, backgroundColor: '#fff', marginTop: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a2e', marginBottom: 20 },
  
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '600', color: '#636e72', marginBottom: 8 },
  input: { backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#eee', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1a1a2e' },
  textArea: { height: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },

  fieldGroup: { marginBottom: 20 },
  optionRow: { flexDirection: 'row', paddingBottom: 5 },
  optionBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#eee', marginRight: 10 },
  optionBtnActive: { backgroundColor: '#3498db', borderColor: '#3498db' },
  optionTxt: { fontSize: 14, color: '#636e72', fontWeight: '500' },
  optionTxtActive: { color: '#fff', fontWeight: '700' },

  footer: { padding: 20, marginTop: 10 },
  submitBtn: { backgroundColor: '#3498db', paddingVertical: 16, borderRadius: 12, alignItems: 'center', ...Platform.select({ ios: { shadowColor: '#3498db', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }, android: { elevation: 4 } }) },
  submitBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default EditSparePart;
