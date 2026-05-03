import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { fetchTicketById, updateTicketAPI, resolveImageUrl } from '../api/supportApi';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

const CATEGORIES = ['Vehicle Listing Issue', 'Rental Dispute', 'Spare Part Complaint', 'Inspection Problem', 'Payment Issue', 'Account Issue', 'App Bug', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

const EditTicket = () => {
  const { ticketId } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  
  // Existing images from server
  const [existingImages, setExistingImages] = useState([]);
  // New images added by user
  const [newImages, setNewImages] = useState([]);

  useEffect(() => {
    const loadTicket = async () => {
      try {
        const data = await fetchTicketById(ticketId);
        setCategory(data.category);
        setPriority(data.priority);
        setSubject(data.subject);
        setDescription(data.description);
        setExistingImages(data.images || []);
      } catch (error) {
        Alert.alert('Error', 'Failed to load ticket details');
        router.back();
      } finally {
        setLoading(false);
      }
    };
    if (ticketId) loadTicket();
  }, [ticketId]);

  const totalImages = existingImages.length + newImages.length;

  const pickImage = async () => {
    if (totalImages >= 3) {
      Alert.alert('Limit Reached', 'You can only have a maximum of 3 images attached.');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setNewImages([...newImages, result.assets[0].uri]);
    }
  };

  const removeExistingImage = (index) => {
    const updated = [...existingImages];
    updated.splice(index, 1);
    setExistingImages(updated);
  };

  const removeNewImage = (index) => {
    const updated = [...newImages];
    updated.splice(index, 1);
    setNewImages(updated);
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) {
      Alert.alert('Error', 'Please fill in both subject and description.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('category', category);
      formData.append('priority', priority);
      formData.append('subject', subject);
      formData.append('description', description);

      // Only append NEW images. The backend will replace all images if new ones are uploaded.
      // Note: A robust system would handle partial deletions, but for this assignment, 
      // uploading new images replaces all.
      if (newImages.length > 0) {
        newImages.forEach((uri) => {
          const filename = uri.split('/').pop();
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : `image/jpeg`;
          formData.append('images', { uri, name: filename, type });
        });
      }

      await updateTicketAPI(ticketId, formData);
      Alert.alert('Success', 'Ticket updated successfully.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#10ac84" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#1a1a2e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Ticket</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Subject <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="Briefly describe the issue"
            value={subject}
            onChangeText={setSubject}
            maxLength={120}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={category} onValueChange={(val) => setCategory(val)} style={styles.picker}>
                {CATEGORIES.map(c => <Picker.Item key={c} label={c} value={c} />)}
              </Picker>
            </View>
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
            <Text style={styles.label}>Priority</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={priority} onValueChange={(val) => setPriority(val)} style={styles.picker}>
                {PRIORITIES.map(p => <Picker.Item key={p} label={p} value={p} />)}
              </Picker>
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Provide all relevant details here..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.imageHeaderRow}>
            <Text style={styles.label}>Evidence / Screenshots</Text>
            <Text style={styles.imageCounter}>{totalImages}/3</Text>
          </View>
          <Text style={styles.helperText}>Adding new images will replace all existing attachments.</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
            {existingImages.map((uri, index) => (
              <View key={`ext-${index}`} style={styles.imageWrapper}>
                <Image source={{ uri: resolveImageUrl(uri) }} style={styles.imagePreview} />
                <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeExistingImage(index)}>
                  <Ionicons name="close-circle" size={24} color="#e74c3c" />
                </TouchableOpacity>
              </View>
            ))}
            {newImages.map((uri, index) => (
              <View key={`new-${index}`} style={styles.imageWrapper}>
                <Image source={{ uri }} style={styles.imagePreview} />
                <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeNewImage(index)}>
                  <Ionicons name="close-circle" size={24} color="#e74c3c" />
                </TouchableOpacity>
              </View>
            ))}
            {totalImages < 3 && (
              <TouchableOpacity style={styles.addImageBtn} onPress={pickImage}>
                <Ionicons name="camera-outline" size={32} color="#10ac84" />
                <Text style={styles.addImageText}>Add Image</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        <TouchableOpacity 
          style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]} 
          onPress={handleSubmit} 
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e' },
  
  scrollContent: { padding: 20, paddingBottom: 40 },
  
  inputGroup: { marginBottom: 20 },
  row: { flexDirection: 'row' },
  label: { fontSize: 14, fontWeight: '700', color: '#1a1a2e', marginBottom: 8 },
  required: { color: '#e74c3c' },
  helperText: { fontSize: 12, color: '#b2bec3', marginBottom: 12 },
  
  input: { backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#eee', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#1a1a2e' },
  textArea: { minHeight: 120, paddingTop: 14 },
  
  pickerContainer: { backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#eee', borderRadius: 12, overflow: 'hidden' },
  picker: { height: 50 },

  imageHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  imageCounter: { fontSize: 12, color: '#b2bec3', fontWeight: '600' },
  imageScroll: { flexDirection: 'row', marginTop: 8 },
  imageWrapper: { marginRight: 12, position: 'relative' },
  imagePreview: { width: 100, height: 100, borderRadius: 12 },
  removeImageBtn: { position: 'absolute', top: -8, right: -8, backgroundColor: '#fff', borderRadius: 12 },
  addImageBtn: { width: 100, height: 100, borderRadius: 12, borderWidth: 2, borderColor: '#10ac84', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#e8f8f5' },
  addImageText: { color: '#10ac84', fontSize: 12, fontWeight: '600', marginTop: 4 },

  submitBtn: { backgroundColor: '#10ac84', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 20, ...Platform.select({ ios: { shadowColor: '#10ac84', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }, android: { elevation: 4 } }) },
  submitBtnDisabled: { backgroundColor: '#a8e6cf', shadowOpacity: 0, elevation: 0 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default EditTicket;
