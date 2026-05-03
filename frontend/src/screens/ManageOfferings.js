import React, { useState, useCallback, useContext } from 'react';
import {
  View, Text, FlatList, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, Switch, Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { Feather, Ionicons } from '@expo/vector-icons';
import { fetchMyOfferings, createOffering, updateOffering, deleteOffering } from '../api/serviceApi';
import { AuthContext } from '../context/AuthContext';

const ACCENT = '#8e44ad';

const VEHICLE_TYPES = ['Car', 'SUV', 'Van', 'Motorcycle', 'Truck'];

const CATEGORIES = [
  'Oil Change',
  'Brakes',
  'Tires',
  'Engine',
  'Transmission',
  'Electrical',
  'AC',
  'Suspension',
  'Bodywork',
  'Diagnostics',
  'Wheels',
  'Other',
];

// ─── Empty form state ──────────────────────────────────────────────────────────

const emptyForm = () => ({
  name:              '',
  description:       '',
  category:          CATEGORIES[0],
  estimatedPrice:    '',
  estimatedDuration: '',
  vehicleTypes:      ['Car'],
  isActive:          true,
});

// ─── Main Screen ───────────────────────────────────────────────────────────────

const ManageOfferings = () => {
  const { userInfo } = useContext(AuthContext);

  const [offerings,  setOfferings]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [editingId,  setEditingId]  = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form,       setForm]       = useState(emptyForm());

  // ── Load ──
  useFocusEffect(
    useCallback(() => {
      if (userInfo) load();
    }, [userInfo])
  );

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchMyOfferings();
      setOfferings(Array.isArray(data) ? data : (data.offerings ?? []));
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not load your service offerings.');
    } finally {
      setLoading(false);
    }
  };

  // ── Form helpers ──
  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const toggleVehicleType = (type) => {
    setForm((prev) => ({
      ...prev,
      vehicleTypes: prev.vehicleTypes.includes(type)
        ? prev.vehicleTypes.filter((t) => t !== type)
        : [...prev.vehicleTypes, type],
    }));
  };

  const resetForm = () => { setForm(emptyForm()); setEditingId(null); };

  const openCreate = () => { resetForm(); setShowForm(true); };

  const openEdit = (item) => {
    setEditingId(item._id);
    setForm({
      name:              item.name              ?? '',
      description:       item.description       ?? '',
      category:          item.category          ?? CATEGORIES[0],
      estimatedPrice:    String(item.estimatedPrice    ?? ''),
      estimatedDuration: String(item.estimatedDuration ?? ''),
      vehicleTypes:      Array.isArray(item.vehicleTypes) && item.vehicleTypes.length
                           ? item.vehicleTypes : ['Car'],
      isActive:          item.isActive !== false,
    });
    setShowForm(true);
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (!form.name.trim()) {
      Alert.alert('Missing Field', 'Service name is required.'); return;
    }
    if (!form.estimatedPrice || isNaN(Number(form.estimatedPrice))) {
      Alert.alert('Invalid Price', 'Enter a valid estimated price.'); return;
    }
    if (!form.estimatedDuration || isNaN(Number(form.estimatedDuration))) {
      Alert.alert('Invalid Duration', 'Enter a valid estimated duration in minutes.'); return;
    }
    if (form.vehicleTypes.length === 0) {
      Alert.alert('Missing Field', 'Select at least one vehicle type.'); return;
    }

    const payload = {
      name:              form.name.trim(),
      description:       form.description.trim(),
      category:          form.category,
      estimatedPrice:    Number(form.estimatedPrice),
      estimatedDuration: Number(form.estimatedDuration),
      vehicleTypes:      form.vehicleTypes,
      isActive:          form.isActive,
    };

    setSubmitting(true);
    try {
      if (editingId) {
        await updateOffering(editingId, payload);
        Alert.alert('Updated! ✅', 'Service offering has been updated.');
      } else {
        await createOffering(payload);
        Alert.alert('Created! 🎉', 'New service offering is now live.');
      }
      setShowForm(false);
      resetForm();
      load();
    } catch (e) {
      console.error('Error submitting offering:', e);
      Alert.alert('Failed', e.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ──
  const handleDelete = (id, name) => {
    Alert.alert('Delete Offering', `Permanently delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteOffering(id);
            setOfferings((prev) => prev.filter((o) => o._id !== id));
          } catch (e) {
            console.error('Error deleting offering:', e);
            Alert.alert('Error', e.message || 'Could not delete offering.');
          }
        },
      },
    ]);
  };

  // ── Quick toggle active ──
  const handleToggleActive = async (item) => {
    try {
      await updateOffering(item._id, { isActive: !item.isActive });
      setOfferings((prev) =>
        prev.map((o) => o._id === item._id ? { ...o, isActive: !o.isActive } : o)
      );
    } catch (e) {
      Alert.alert('Failed', e.message || 'Could not update status.');
    }
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // Form view
  // ══════════════════════════════════════════════════════════════════════════════
  if (showForm) {
    return (
      <ScrollView
        style={styles.formContainer}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.formTitle}>{editingId ? 'Edit Service' : 'Add Service'}</Text>
        <Text style={styles.formSubtitle}>
          {editingId ? 'Update your service offering details' : 'Create a new service offering for customers'}
        </Text>

        {/* Name */}
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>Service Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Full Engine Oil Change"
            placeholderTextColor="#b2bec3"
            value={form.name}
            onChangeText={(v) => setField('name', v)}
          />
        </View>

        {/* Category */}
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>Category <Text style={styles.required}>*</Text></Text>
          <View style={styles.pickerBox}>
            <Picker
              selectedValue={form.category}
              onValueChange={(v) => setField('category', v)}
              style={styles.picker}
              dropdownIconColor="#636e72"
            >
              {CATEGORIES.map((c) => (
                <Picker.Item key={c} label={c} value={c} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Price + Duration */}
        <View style={styles.rowGap}>
          <View style={[styles.fieldWrap, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Price (Rs.) <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 3500"
              placeholderTextColor="#b2bec3"
              keyboardType="numeric"
              value={form.estimatedPrice}
              onChangeText={(v) => setField('estimatedPrice', v)}
            />
          </View>
          <View style={[styles.fieldWrap, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Duration (mins) <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 45"
              placeholderTextColor="#b2bec3"
              keyboardType="numeric"
              value={form.estimatedDuration}
              onChangeText={(v) => setField('estimatedDuration', v)}
            />
          </View>
        </View>

        {/* Description */}
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Brief description of what's included..."
            placeholderTextColor="#b2bec3"
            multiline
            numberOfLines={4}
            value={form.description}
            onChangeText={(v) => setField('description', v)}
            textAlignVertical="top"
          />
        </View>

        {/* Vehicle types */}
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>Vehicle Types <Text style={styles.required}>*</Text></Text>
          <View style={styles.chipRow}>
            {VEHICLE_TYPES.map((type) => {
              const active = form.vehicleTypes.includes(type);
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.chip, active && styles.chipActive]}
                  activeOpacity={0.7}
                  onPress={() => toggleVehicleType(type)}
                >
                  {active && <Feather name="check" size={13} color={ACCENT} />}
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{type}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* isActive toggle */}
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleLabel}>Active</Text>
            <Text style={styles.toggleHint}>Inactive offerings won't be visible to customers</Text>
          </View>
          <Switch
            value={form.isActive}
            onValueChange={(v) => setField('isActive', v)}
            trackColor={{ false: '#e9ecef', true: `${ACCENT}55` }}
            thumbColor={form.isActive ? ACCENT : '#b2bec3'}
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : (
              <>
                <Feather name={editingId ? 'save' : 'plus-circle'} size={18} color="#fff" />
                <Text style={styles.submitBtnText}>{editingId ? 'Update Service' : 'Create Service'}</Text>
              </>
            )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelBtn}
          activeOpacity={0.7}
          onPress={() => { setShowForm(false); resetForm(); }}
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // List view
  // ══════════════════════════════════════════════════════════════════════════════
  const renderCard = ({ item }) => {
    const activeColor = item.isActive ? '#10ac84' : '#e74c3c';
    const activeBg    = item.isActive ? '#f0faf7'  : '#fff0f0';

    return (
      <View style={styles.card}>
        {/* ── Top row ── */}
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName}>{item.name}</Text>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{item.category}</Text>
            </View>
          </View>
          <View style={styles.priceBlock}>
            <Text style={styles.cardPrice}>Rs. {Number(item.estimatedPrice).toLocaleString()}</Text>
            <View style={styles.durationRow}>
              <Ionicons name="time-outline" size={12} color="#b2bec3" />
              <Text style={styles.cardDuration}>{item.estimatedDuration} mins</Text>
            </View>
          </View>
        </View>

        {/* Description */}
        {item.description ? (
          <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}

        {/* Vehicle type chips */}
        {Array.isArray(item.vehicleTypes) && item.vehicleTypes.length > 0 && (
          <View style={styles.vtRow}>
            {item.vehicleTypes.map((vt) => (
              <View key={vt} style={styles.vtChip}>
                <Text style={styles.vtChipText}>{vt}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Status + toggle */}
        <View style={styles.statusRow}>
          <View style={[styles.activeBadge, { backgroundColor: activeBg }]}>
            <Feather name={item.isActive ? 'check-circle' : 'x-circle'} size={12} color={activeColor} />
            <Text style={[styles.activeText, { color: activeColor }]}>
              {item.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
          <Switch
            value={item.isActive}
            onValueChange={() => handleToggleActive(item)}
            trackColor={{ false: '#e9ecef', true: `${ACCENT}55` }}
            thumbColor={item.isActive ? ACCENT : '#b2bec3'}
          />
        </View>

        {/* Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.editBtn}
            activeOpacity={0.75}
            onPress={() => openEdit(item)}
          >
            <Feather name="edit-2" size={14} color="#fff" />
            <Text style={styles.actionBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            activeOpacity={0.75}
            onPress={() => handleDelete(item._id, item.name)}
          >
            <Feather name="trash-2" size={14} color="#fff" />
            <Text style={styles.actionBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* ── List header ── */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Services ({offerings.length})</Text>
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.85} onPress={openCreate}>
          <Feather name="plus" size={16} color="#fff" />
          <Text style={styles.addBtnText}>Add Service</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loaderText}>Loading services...</Text>
        </View>
      ) : offerings.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Feather name="tool" size={56} color="#dfe6e9" />
          <Text style={styles.emptyTitle}>No services yet</Text>
          <Text style={styles.emptySubtitle}>Add your first service offering for customers to book</Text>
          <TouchableOpacity style={styles.emptyAddBtn} onPress={openCreate} activeOpacity={0.85}>
            <Feather name="plus" size={16} color="#fff" />
            <Text style={styles.addBtnText}>Add First Service</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={offerings}
          keyExtractor={(item) => item._id}
          renderItem={renderCard}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
          onRefresh={load}
          refreshing={loading}
        />
      )}
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const cardShadow = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12 },
  android: { elevation: 3 },
});

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#f8f9fa' },
  formContainer: { flex: 1, padding: 20, backgroundColor: '#fff' },

  // ── Form ──
  formTitle:    { fontSize: 24, fontWeight: '800', color: '#1a1a2e', marginBottom: 4, letterSpacing: -0.3 },
  formSubtitle: { fontSize: 13, color: '#b2bec3', marginBottom: 24 },

  fieldWrap:  { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#4a4a4a', marginBottom: 7 },
  required:   { color: '#e74c3c' },

  input: {
    backgroundColor: '#f8f9fa', borderRadius: 12, padding: 14,
    fontSize: 15, color: '#1a1a2e', borderWidth: 1, borderColor: '#e9ecef',
  },
  textArea: { height: 100, textAlignVertical: 'top' },

  rowGap: { flexDirection: 'row', gap: 12 },

  pickerBox: {
    backgroundColor: '#f8f9fa', borderRadius: 12,
    borderWidth: 1, borderColor: '#e9ecef',
    height: 52, justifyContent: 'center', overflow: 'hidden',
  },
  picker: { height: 52, color: '#1a1a2e' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
    backgroundColor: '#f1f3f5', borderWidth: 1, borderColor: '#e9ecef',
  },
  chipActive:     { backgroundColor: '#f4ecf7', borderColor: ACCENT },
  chipText:       { fontSize: 13, color: '#636e72', fontWeight: '600' },
  chipTextActive: { color: ACCENT },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f8f9fa', borderRadius: 12, padding: 16,
    marginBottom: 24, borderWidth: 1, borderColor: '#e9ecef',
  },
  toggleLabel: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  toggleHint:  { fontSize: 12, color: '#b2bec3', marginTop: 3 },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: ACCENT, padding: 18, borderRadius: 14,
    ...Platform.select({
      ios:     { shadowColor: ACCENT, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.35, shadowRadius: 10 },
      android: { elevation: 5 },
    }),
  },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  cancelBtn:     { alignItems: 'center', padding: 16, marginTop: 6 },
  cancelBtnText: { color: '#e74c3c', fontSize: 15, fontWeight: '600' },

  // ── List ──
  listHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  listTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: ACCENT, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderText: { color: '#b2bec3', fontSize: 14 },

  emptyWrap:     { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 10 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: '#636e72' },
  emptySubtitle: { fontSize: 13, color: '#b2bec3', textAlign: 'center' },
  emptyAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8,
    backgroundColor: ACCENT, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12,
  },

  // ── Card ──
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14, ...cardShadow },

  cardTop:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  cardName:    { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 6 },
  categoryPill:{ alignSelf: 'flex-start', backgroundColor: '#f4ecf7', paddingVertical: 3, paddingHorizontal: 10, borderRadius: 8 },
  categoryPillText: { fontSize: 11, fontWeight: '700', color: ACCENT },

  priceBlock:  { alignItems: 'flex-end', marginLeft: 12 },
  cardPrice:   { fontSize: 18, fontWeight: '800', color: ACCENT },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  cardDuration:{ fontSize: 12, color: '#b2bec3' },
  cardDesc:    { fontSize: 13, color: '#636e72', lineHeight: 19, marginBottom: 10 },

  vtRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  vtChip:      { backgroundColor: '#f1f3f5', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
  vtChipText:  { fontSize: 11, color: '#636e72', fontWeight: '600' },

  statusRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20 },
  activeText:  { fontSize: 12, fontWeight: '700' },

  cardActions: { flexDirection: 'row', gap: 10 },
  editBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: 10, backgroundColor: '#3498db',
  },
  deleteBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: 10, backgroundColor: '#e74c3c',
  },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export default ManageOfferings;
