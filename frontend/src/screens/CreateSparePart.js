import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { createPartAPI } from '../api/sparePartsApi';
import { Ionicons } from '@expo/vector-icons';

const CATEGORIES = ['Engine', 'Brakes', 'Suspension', 'Electrical', 'Body', 'Interior', 'Exhaust', 'Transmission', 'Wheels & Tires', 'Other'];
const CONDITIONS = ['New', 'Used', 'Refurbished'];

const CreateSparePart = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState({
    partName: '', partNumber: '', price: '', quantity: '1',
    category: 'Other', condition: 'Used', location: '', description: '',
    compatibilityMake: '', compatibilityModel: '', compatibilityYearFrom: '',
    compatibilityYearTo: '', compatibilityEngineType: ''
  });
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

  const updateField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImages(prev => [...prev, ...result.assets.map(a => a.uri)].slice(0, 5));
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

    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value) formData.append(key, value);
      });
      images.forEach((uri, index) => {
        formData.append('images', {
          uri,
          name: `part_${index}.jpg`,
          type: 'image/jpeg',
        });
      });

      await createPartAPI(formData);
      Alert.alert('Success', 'Your spare part has been posted!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 40) }} showsVerticalScrollIndicator={false}>
      
      {/* Image Upload */}
      <View style={styles.imageSection}>
        <Text style={styles.label}>Photos (Max 5)</Text>
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
              <Ionicons name="camera-outline" size={32} color="#10ac84" />
              <Text style={styles.addImageTxt}>Add Photo</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        
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
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnTxt}>Post Spare Part</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  
  imageSection: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  imageScroll: { marginTop: 10 },
  imagePreviewWrap: { marginRight: 15, position: 'relative' },
  imagePreview: { width: 100, height: 100, borderRadius: 12, backgroundColor: '#f1f3f5' },
  removeImageBtn: { position: 'absolute', top: -10, right: -10, backgroundColor: '#fff', borderRadius: 12 },
  addImageBtn: { width: 100, height: 100, borderRadius: 12, borderWidth: 2, borderColor: '#10ac84', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0faf7' },
  addImageTxt: { color: '#10ac84', fontSize: 12, fontWeight: '600', marginTop: 4 },

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
  optionBtnActive: { backgroundColor: '#10ac84', borderColor: '#10ac84' },
  optionTxt: { fontSize: 14, color: '#636e72', fontWeight: '500' },
  optionTxtActive: { color: '#fff', fontWeight: '700' },

  footer: { padding: 20, marginTop: 10 },
  submitBtn: { backgroundColor: '#10ac84', paddingVertical: 16, borderRadius: 12, alignItems: 'center', ...Platform.select({ ios: { shadowColor: '#10ac84', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }, android: { elevation: 4 } }) },
  submitBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default CreateSparePart;
