import React, { useState, useCallback, useContext } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Platform, Image,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { fetchOwnerGarage, updateOwnerGarage, resolveServiceImageUrl } from '../api/serviceApi';

import { AuthContext } from '../context/AuthContext';

const ACCENT = '#8e44ad';

const GarageProfile = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userInfo } = useContext(AuthContext);

  const [garage,     setGarage]     = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [editMode,   setEditMode]   = useState(false);
  const [form,       setForm]       = useState({});

  useFocusEffect(
    useCallback(() => {
      if (userInfo) load();
    }, [userInfo])
  );

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchOwnerGarage();
      const g = data.garage ?? data;
      setGarage(g);
      setForm({
        garageName:     g.garageName     ?? '',
        description:    g.description    ?? '',
        address:        g.address        ?? '',
        city:           g.city           ?? '',
        phone:          g.phone          ?? '',
        operatingHours: g.operatingHours ?? '',
        website:        g.website        ?? '',
      });
    } catch {
      Alert.alert('Error', 'Could not load garage profile.');
    } finally {
      setLoading(false);
    }
  };

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.garageName?.trim() || !form.city?.trim()) {
      Alert.alert('Validation', 'Garage name and city are required.');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      const updated = await updateOwnerGarage(fd);
      const g = updated.garage ?? updated;
      setGarage(g);
      setEditMode(false);
      Alert.alert('Saved ✅', 'Your garage profile has been updated.');
    } catch (e) {
      Alert.alert('Failed', e.message || 'Could not update garage profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  if (!garage) {
    return (
      <View style={styles.center}>
        <Ionicons name="construct-outline" size={48} color="#dfe6e9" />
        <Text style={styles.emptyTitle}>No garage profile found</Text>
        <Text style={styles.emptySubtitle}>Register your garage first</Text>
        <TouchableOpacity style={styles.registerBtn} onPress={() => router.replace('/GarageRegister')}>
          <Text style={styles.registerBtnText}>Register Garage</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const fields = [
    { key: 'garageName',     label: 'Garage Name',      icon: 'home',   required: true,  multiline: false },
    { key: 'description',    label: 'Description',      icon: 'file-text', required: false, multiline: true },
    { key: 'address',        label: 'Address',          icon: 'map-pin', required: false, multiline: false },
    { key: 'city',           label: 'City',             icon: 'map',    required: true,  multiline: false },
    { key: 'phone',          label: 'Contact Phone',    icon: 'phone',  required: false, multiline: false },
    { key: 'operatingHours', label: 'Operating Hours',  icon: 'clock',  required: false, multiline: false },
    { key: 'website',        label: 'Website',          icon: 'globe',  required: false, multiline: false },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero banner ── */}
      <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
        <View style={styles.heroLogoWrap}>
          {garage.logo ? (
            <Image source={{ uri: resolveServiceImageUrl(garage.logo) }} style={styles.heroLogo} />
          ) : (

            <View style={styles.heroLogoPlaceholder}>
              <Ionicons name="construct" size={32} color="#fff" />
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroName} numberOfLines={2}>{garage.garageName}</Text>
          <View style={styles.heroBadgeRow}>
            <View style={[styles.heroBadge, garage.isVerified ? styles.heroBadgeVerified : styles.heroBadgePending]}>
              <Feather name={garage.isVerified ? 'check-circle' : 'clock'} size={12} color={garage.isVerified ? '#27ae60' : '#e67e22'} />
              <Text style={[styles.heroBadgeText, { color: garage.isVerified ? '#27ae60' : '#e67e22' }]}>
                {garage.isVerified ? 'Verified' : 'Pending Verification'}
              </Text>
            </View>
          </View>
          <Text style={styles.heroCity}>{garage.city ?? '—'}</Text>
        </View>
        <TouchableOpacity
          style={[styles.editToggleBtn, editMode && styles.editToggleBtnActive]}
          onPress={() => editMode ? setEditMode(false) : setEditMode(true)}
          activeOpacity={0.8}
        >
          <Feather name={editMode ? 'x' : 'edit-2'} size={16} color={editMode ? '#e74c3c' : ACCENT} />
        </TouchableOpacity>
      </View>

      {!garage.isVerified && (
        <View style={styles.verifyBanner}>
          <Feather name="alert-circle" size={14} color="#e67e22" />
          <Text style={styles.verifyBannerText}>
            Your garage is awaiting admin verification. It won't appear in public listings until verified.
          </Text>
        </View>
      )}

      <View style={styles.content}>
        {/* ── Fields ── */}
        {fields.map(({ key, label, icon, required, multiline }) => (
          <View style={styles.fieldWrap} key={key}>
            <View style={styles.fieldLabelRow}>
              <Feather name={icon} size={14} color={ACCENT} />
              <Text style={styles.fieldLabel}>
                {label}{required && <Text style={styles.required}> *</Text>}
              </Text>
            </View>
            {editMode ? (
              <TextInput
                style={[styles.input, multiline && styles.inputMultiline]}
                value={form[key]}
                onChangeText={(v) => setField(key, v)}
                multiline={multiline}
                numberOfLines={multiline ? 3 : 1}
                placeholder={`Enter ${label.toLowerCase()}...`}
                placeholderTextColor="#b2bec3"
              />
            ) : (
              <Text style={[styles.fieldValue, !garage[key] && styles.fieldValueEmpty]}>
                {garage[key] || '—'}
              </Text>
            )}
          </View>
        ))}

        {/* ── Stats row ── */}
        {!editMode && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{garage.rating ?? 0}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{garage.totalReviews ?? 0}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNum, { color: garage.isActive !== false ? '#10ac84' : '#e74c3c' }]}>
                {garage.isActive !== false ? 'Active' : 'Suspended'}
              </Text>
              <Text style={styles.statLabel}>Status</Text>
            </View>
          </View>
        )}

        {/* ── Save button ── */}
        {editMode && (
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <><Feather name="save" size={18} color="#fff" /><Text style={styles.saveBtnText}>Save Changes</Text></>
            }
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const cardShadow = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10 },
  android: { elevation: 2 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 40 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: '#636e72' },
  emptySubtitle: { fontSize: 13, color: '#b2bec3' },
  registerBtn:   { marginTop: 8, backgroundColor: ACCENT, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  registerBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  hero: {
    backgroundColor: ACCENT,
    paddingHorizontal: 20, paddingBottom: 24,
    flexDirection: 'row', alignItems: 'center', gap: 16,
    ...Platform.select({
      ios:     { shadowColor: ACCENT, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14 },
      android: { elevation: 8 },
    }),
  },
  heroLogoWrap:        { flexShrink: 0 },
  heroLogo:            { width: 60, height: 60, borderRadius: 18, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  heroLogoPlaceholder: { width: 60, height: 60, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  heroName:  { fontSize: 18, fontWeight: '800', color: '#fff', lineHeight: 24 },
  heroBadgeRow: { flexDirection: 'row', marginTop: 4, marginBottom: 2 },
  heroBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)' },
  heroBadgeVerified: { backgroundColor: 'rgba(39,174,96,0.2)' },
  heroBadgePending:  { backgroundColor: 'rgba(230,126,34,0.2)' },
  heroBadgeText: { fontSize: 11, fontWeight: '700' },
  heroCity:  { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  editToggleBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  editToggleBtnActive: { backgroundColor: 'rgba(231,76,60,0.2)' },

  verifyBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#fef9f0', borderBottomWidth: 1, borderBottomColor: '#fde8c8',
    paddingVertical: 12, paddingHorizontal: 20,
  },
  verifyBannerText: { fontSize: 13, color: '#e67e22', flex: 1, lineHeight: 18 },

  content: { padding: 16 },

  fieldWrap:      { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, ...cardShadow },
  fieldLabelRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  fieldLabel:     { fontSize: 12, fontWeight: '700', color: '#636e72', textTransform: 'uppercase', letterSpacing: 0.5 },
  required:       { color: '#e74c3c' },
  fieldValue:     { fontSize: 15, color: '#1a1a2e', fontWeight: '500', lineHeight: 22 },
  fieldValueEmpty:{ color: '#b2bec3', fontStyle: 'italic' },
  input:         { fontSize: 15, color: '#1a1a2e', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e9ecef' },
  inputMultiline:{ minHeight: 72, textAlignVertical: 'top' },

  statsRow:  { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard:  { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 16, alignItems: 'center', gap: 4, ...cardShadow },
  statNum:   { fontSize: 20, fontWeight: '800', color: '#1a1a2e' },
  statLabel: { fontSize: 11, color: '#636e72', fontWeight: '600' },

  saveBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: ACCENT, padding: 18, borderRadius: 14, marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});

export default GarageProfile;
