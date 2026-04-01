import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { createListing } from '../api/marketplaceApi';
import { Ionicons } from '@expo/vector-icons';

const FUEL_TYPES = ['Petrol', 'Diesel', 'Hybrid', 'Electric'];
const TRANSMISSIONS = ['Manual', 'Automatic', 'Tiptronic'];
const BODY_TYPES = ['Sedan', 'SUV', 'Hatchback', 'Van', 'Truck', 'Coupe', 'Wagon', 'Other'];
const CONDITIONS = ['New', 'Used', 'Reconditioned'];

const CreateListing = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState({
    make: '', model: '', year: '', price: '', mileage: '',
    fuelType: 'Petrol', transmission: 'Manual', bodyType: 'Sedan',
    condition: 'Used', location: '', description: '',
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
    if (!form.make || !form.model || !form.year || !form.price || !form.location) {
      Alert.alert('Missing Fields', 'Please fill in make, model, year, price, and location.');
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
          name: `vehicle_${index}.jpg`,
          type: 'image/jpeg',
        });
      });

      await createListing(formData);
      Alert.alert('Success', 'Your listing has been posted!', [
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
              style={[styles.optionChip, selectedValue === opt && styles.optionChipActive]}
              onPress={() => onSelect(opt)}
            >
              <Text style={[styles.optionText, selectedValue === opt && styles.optionTextActive]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Post Your Vehicle</Text>
      <Text style={styles.subtitle}>Fill in the details to list your vehicle for sale</Text>

      {/* Images */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Photos (up to 5)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
          {images.map((uri, i) => (
            <View key={i} style={styles.imageWrap}>
              <Image source={{ uri }} style={styles.previewImage} />
              <TouchableOpacity style={styles.removeImgBtn} onPress={() => removeImage(i)}>
                <Ionicons name="close-circle" size={22} color="#e74c3c" />
              </TouchableOpacity>
            </View>
          ))}
          {images.length < 5 && (
            <TouchableOpacity style={styles.addImageBtn} onPress={pickImages}>
              <Ionicons name="camera-outline" size={28} color="#10ac84" />
              <Text style={styles.addImageText}>Add Photo</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Text Inputs */}
      {[
        { key: 'make', label: 'Make *', placeholder: 'e.g. Toyota' },
        { key: 'model', label: 'Model *', placeholder: 'e.g. Corolla' },
        { key: 'year', label: 'Year *', placeholder: 'e.g. 2020', keyboard: 'numeric' },
        { key: 'price', label: 'Price (LKR) *', placeholder: 'e.g. 6500000', keyboard: 'numeric' },
        { key: 'mileage', label: 'Mileage (km)', placeholder: 'e.g. 45000', keyboard: 'numeric' },
        { key: 'location', label: 'Location *', placeholder: 'e.g. Colombo' },
      ].map(({ key, label, placeholder, keyboard }) => (
        <View key={key} style={styles.fieldGroup}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor="#b2bec3"
            value={form[key]}
            onChangeText={(v) => updateField(key, v)}
            keyboardType={keyboard || 'default'}
          />
        </View>
      ))}

      {/* Pickers */}
      {renderPicker('Fuel Type', FUEL_TYPES, form.fuelType, (v) => updateField('fuelType', v))}
      {renderPicker('Transmission', TRANSMISSIONS, form.transmission, (v) => updateField('transmission', v))}
      {renderPicker('Body Type', BODY_TYPES, form.bodyType, (v) => updateField('bodyType', v))}
      {renderPicker('Condition', CONDITIONS, form.condition, (v) => updateField('condition', v))}

      {/* Description */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe your vehicle..."
          placeholderTextColor="#b2bec3"
          value={form.description}
          onChangeText={(v) => updateField('description', v)}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Submit */}
      <TouchableOpacity style={styles.submitBtn} activeOpacity={0.8} onPress={handleSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.submitText}>Post Listing</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  contentContainer: { padding: 20, paddingBottom: 60 },

  title: { fontSize: 24, fontWeight: '800', color: '#1a1a2e', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#636e72', marginBottom: 24 },

  fieldGroup: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '700', color: '#1a1a2e', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e9ecef', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#1a1a2e' },
  textArea: { minHeight: 100 },

  optionRow: { flexDirection: 'row', gap: 8 },
  optionChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#f1f3f5', borderWidth: 1, borderColor: '#e9ecef' },
  optionChipActive: { backgroundColor: '#e8f8f5', borderColor: '#10ac84' },
  optionText: { fontSize: 13, color: '#636e72', fontWeight: '600' },
  optionTextActive: { color: '#10ac84' },

  imageScroll: { marginBottom: 4 },
  imageWrap: { marginRight: 12, position: 'relative' },
  previewImage: { width: 100, height: 100, borderRadius: 12, resizeMode: 'cover' },
  removeImgBtn: { position: 'absolute', top: -6, right: -6, backgroundColor: '#fff', borderRadius: 11 },
  addImageBtn: { width: 100, height: 100, borderRadius: 12, borderWidth: 2, borderColor: '#10ac84', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  addImageText: { fontSize: 11, color: '#10ac84', marginTop: 4, fontWeight: '600' },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10ac84', paddingVertical: 16, borderRadius: 14, marginTop: 8, ...Platform.select({ ios: { shadowColor: '#10ac84', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }, android: { elevation: 4 } }) },
  submitText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

export default CreateListing;
