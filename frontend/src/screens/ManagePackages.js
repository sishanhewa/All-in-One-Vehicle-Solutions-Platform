import React, { useState, useCallback, useContext } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { fetchMyPackages, createPackageAPI, updatePackageAPI, deletePackageAPI } from '../api/inspectionApi';
import { AuthContext } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { Feather, Ionicons } from '@expo/vector-icons';

const VEHICLE_TYPES = ['Car', 'SUV', 'Van', 'Motorcycle', 'Truck'];
const DEFAULT_CHECKLIST = ['Engine', 'Transmission', 'Brakes', 'Suspension', 'Electrical', 'Exterior Body', 'Interior', 'Tires'];

const ManagePackages = () => {
  const router = useRouter();
  const { userInfo } = useContext(AuthContext);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [vehicleTypes, setVehicleTypes] = useState(['Car']);
  const [checklistItems, setChecklistItems] = useState([...DEFAULT_CHECKLIST]);
  const [newCheckItem, setNewCheckItem] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (userInfo) loadPackages();
    }, [userInfo])
  );

  const loadPackages = async () => {
    setLoading(true);
    try {
      const data = await fetchMyPackages();
      setPackages(data);
    } catch (error) {
      Alert.alert('Error', 'Could not fetch packages.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName(''); setDescription(''); setPrice(''); setDuration('');
    setVehicleTypes(['Car']); setChecklistItems([...DEFAULT_CHECKLIST]);
    setNewCheckItem(''); setSelectedImages([]); setEditingId(null);
  };

  const toggleVehicleType = (type) => {
    setVehicleTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const addCheckItem = () => {
    if (newCheckItem.trim()) {
      setChecklistItems(prev => [...prev, newCheckItem.trim()]);
      setNewCheckItem('');
    }
  };

  const removeCheckItem = (idx) => {
    setChecklistItems(prev => prev.filter((_, i) => i !== idx));
  };

  const pickImages = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow photo access.');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.7,
    });
    if (!result.canceled && result.assets) setSelectedImages(result.assets);
  };

  const openEditForm = (pkg) => {
    setEditingId(pkg._id);
    setName(pkg.name);
    setDescription(pkg.description);
    setPrice(String(pkg.price));
    setDuration(String(pkg.duration));
    setVehicleTypes(pkg.vehicleTypes || ['Car']);
    setChecklistItems(pkg.checklistItems || [...DEFAULT_CHECKLIST]);
    setSelectedImages([]);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!name || !description || !price || !duration) {
      Alert.alert('Missing Fields', 'Please fill name, description, price, and duration.');
      return;
    }
    if (vehicleTypes.length === 0) {
      Alert.alert('Missing Fields', 'Select at least one vehicle type.');
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('price', price);
    formData.append('duration', duration);
    formData.append('vehicleTypes', JSON.stringify(vehicleTypes));
    formData.append('checklistItems', JSON.stringify(checklistItems));

    selectedImages.forEach((img, i) => {
      formData.append('images', { uri: img.uri, type: 'image/jpeg', name: `pkg-${Date.now()}-${i}.jpg` });
    });

    try {
      if (editingId) {
        await updatePackageAPI(editingId, formData);
        Alert.alert('Updated!', 'Package has been updated.');
      } else {
        await createPackageAPI(formData);
        Alert.alert('Created!', 'New package is now live.');
      }
      setShowForm(false);
      resetForm();
      loadPackages();
    } catch (error) {
      Alert.alert('Failed', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id, pkgName) => {
    Alert.alert('Delete Package', `Permanently delete "${pkgName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deletePackageAPI(id);
            setPackages(prev => prev.filter(p => p._id !== id));
          } catch (error) {
            Alert.alert('Failed', error.message);
          }
        }
      }
    ]);
  };

  if (showForm) {
    return (
      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.formHeader}>{editingId ? 'Edit Package' : 'Create Package'}</Text>

        <TextInput style={styles.input} placeholder="Package Name" placeholderTextColor="#b2bec3" value={name} onChangeText={setName} />
        <TextInput style={[styles.input, styles.textArea]} placeholder="Description" placeholderTextColor="#b2bec3" multiline numberOfLines={4} value={description} onChangeText={setDescription} />
        <View style={styles.row}>
          <TextInput style={[styles.input, { flex: 1, marginRight: 8 }]} placeholder="Price (Rs)" placeholderTextColor="#b2bec3" keyboardType="numeric" value={price} onChangeText={setPrice} />
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="Duration (mins)" placeholderTextColor="#b2bec3" keyboardType="numeric" value={duration} onChangeText={setDuration} />
        </View>

        {/* Vehicle Types */}
        <Text style={styles.sectionTitle}>Vehicle Types</Text>
        <View style={styles.chipRow}>
          {VEHICLE_TYPES.map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.typeChip, vehicleTypes.includes(type) && styles.typeChipActive]}
              activeOpacity={0.7}
              onPress={() => toggleVehicleType(type)}
            >
              <Text style={[styles.typeChipText, vehicleTypes.includes(type) && styles.typeChipTextActive]}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Checklist Items */}
        <Text style={styles.sectionTitle}>Checklist Items</Text>
        {checklistItems.map((item, idx) => (
          <View key={idx} style={styles.checklistRow}>
            <Ionicons name="checkmark-circle" size={16} color="#10ac84" />
            <Text style={styles.checklistText}>{item}</Text>
            <TouchableOpacity onPress={() => removeCheckItem(idx)}>
              <Feather name="x" size={16} color="#e74c3c" />
            </TouchableOpacity>
          </View>
        ))}
        <View style={styles.addCheckRow}>
          <TextInput style={[styles.input, { flex: 1, marginBottom: 0, marginRight: 8 }]} placeholder="Add checklist item" placeholderTextColor="#b2bec3" value={newCheckItem} onChangeText={setNewCheckItem} onSubmitEditing={addCheckItem} />
          <TouchableOpacity style={styles.addBtn} onPress={addCheckItem}>
            <Feather name="plus" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Images */}
        <TouchableOpacity style={styles.imageBtn} activeOpacity={0.7} onPress={pickImages}>
          <Feather name="camera" size={20} color={selectedImages.length > 0 ? '#e67e22' : '#636e72'} />
          <Text style={[styles.imageBtnText, selectedImages.length > 0 && { color: '#e67e22' }]}>
            {selectedImages.length > 0 ? `${selectedImages.length} image(s) selected` : 'Select Package Images (optional)'}
          </Text>
        </TouchableOpacity>

        {/* Submit */}
        <TouchableOpacity style={styles.submitBtn} activeOpacity={0.85} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : (
            <>
              <Feather name={editingId ? 'save' : 'plus-circle'} size={18} color="#fff" />
              <Text style={styles.submitBtnText}>{editingId ? 'Update Package' : 'Create Package'}</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelFormBtn} onPress={() => { setShowForm(false); resetForm(); }}>
          <Text style={styles.cancelFormBtnText}>Cancel</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Your Packages ({packages.length})</Text>
        <TouchableOpacity style={styles.addPkgBtn} activeOpacity={0.8} onPress={() => { resetForm(); setShowForm(true); }}>
          <Feather name="plus" size={16} color="#fff" />
          <Text style={styles.addPkgBtnText}>Add Package</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#e67e22" />
        </View>
      ) : packages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="package" size={56} color="#dfe6e9" />
          <Text style={styles.emptyText}>No packages yet</Text>
          <Text style={styles.emptySubText}>Create your first inspection package</Text>
        </View>
      ) : (
        <FlatList
          data={packages}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.pkgCard}>
              <View style={styles.pkgCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pkgName}>{item.name}</Text>
                  <Text style={styles.pkgDesc} numberOfLines={2}>{item.description}</Text>
                </View>
                <View style={styles.pkgPriceBox}>
                  <Text style={styles.pkgPrice}>Rs. {Number(item.price).toLocaleString()}</Text>
                  <Text style={styles.pkgDuration}>{item.duration} mins</Text>
                </View>
              </View>
              <View style={styles.pkgCardMeta}>
                <View style={[styles.activeBadge, { backgroundColor: item.isActive ? '#f0faf7' : '#fff0f0' }]}>
                  <Text style={[styles.activeText, { color: item.isActive ? '#10ac84' : '#e74c3c' }]}>
                    {item.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
                <Text style={styles.pkgVehicles}>{(item.vehicleTypes || []).join(', ')}</Text>
              </View>
              <View style={styles.pkgActions}>
                <TouchableOpacity style={styles.editBtn} activeOpacity={0.7} onPress={() => openEditForm(item)}>
                  <Feather name="edit-2" size={14} color="#fff" />
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} activeOpacity={0.7} onPress={() => handleDelete(item._id, item.name)}>
                  <Feather name="trash-2" size={14} color="#fff" />
                  <Text style={styles.actionText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  formContainer: { flex: 1, padding: 20, backgroundColor: '#fff' },

  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  listTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e' },
  addPkgBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#e67e22', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  addPkgBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#636e72', marginTop: 16 },
  emptySubText: { fontSize: 13, color: '#b2bec3', marginTop: 6 },

  pkgCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12 }, android: { elevation: 3 } }) },
  pkgCardTop: { flexDirection: 'row', marginBottom: 12 },
  pkgName: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  pkgDesc: { fontSize: 13, color: '#636e72', lineHeight: 18 },
  pkgPriceBox: { alignItems: 'flex-end', marginLeft: 12 },
  pkgPrice: { fontSize: 17, fontWeight: '800', color: '#e67e22' },
  pkgDuration: { fontSize: 12, color: '#b2bec3', marginTop: 2 },
  pkgCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  activeBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20 },
  activeText: { fontSize: 11, fontWeight: '700' },
  pkgVehicles: { fontSize: 12, color: '#636e72' },
  pkgActions: { flexDirection: 'row', gap: 10 },
  editBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: '#3498db' },
  deleteBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: '#e74c3c' },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Form styles
  formHeader: { fontSize: 26, fontWeight: '800', color: '#1a1a2e', marginBottom: 20, letterSpacing: -0.3 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a2e', marginBottom: 10, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row' },
  input: { backgroundColor: '#f8f9fa', borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 15, color: '#1a1a2e', borderWidth: 1, borderColor: '#e9ecef' },
  textArea: { height: 100, textAlignVertical: 'top' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#f1f3f5', borderWidth: 1, borderColor: '#e9ecef' },
  typeChipActive: { backgroundColor: '#fef0e3', borderColor: '#e67e22' },
  typeChipText: { fontSize: 13, color: '#636e72', fontWeight: '600' },
  typeChipTextActive: { color: '#e67e22' },

  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#f8f9fa', borderRadius: 10, marginBottom: 6 },
  checklistText: { flex: 1, fontSize: 14, color: '#1a1a2e' },
  addCheckRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  addBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#10ac84', justifyContent: 'center', alignItems: 'center' },

  imageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#f8f9fa', padding: 18, borderRadius: 14, marginBottom: 20, borderWidth: 2, borderColor: '#e9ecef', borderStyle: 'dashed' },
  imageBtnText: { color: '#636e72', fontSize: 15, fontWeight: '600' },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#e67e22', padding: 18, borderRadius: 14, ...Platform.select({ ios: { shadowColor: '#e67e22', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }, android: { elevation: 4 } }) },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  cancelFormBtn: { alignItems: 'center', padding: 16, marginTop: 10 },
  cancelFormBtnText: { color: '#e74c3c', fontSize: 16, fontWeight: '600' },
});

export default ManagePackages;
