import React, { useState, useContext, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { fetchMechanicProfile, updateMechanicProfile } from '../api/serviceApi';
import { AuthContext } from '../context/AuthContext';

const ACCENT = '#8e44ad';

// ─── Input helper ──────────────────────────────────────────────────────────────

const Field = ({ label, icon, ...props }) => (
  <View style={styles.fieldWrap}>
    <View style={styles.fieldLabel}>
      <Feather name={icon} size={13} color="#636e72" />
      <Text style={styles.fieldLabelText}>{label}</Text>
    </View>
    <TextInput
      style={[styles.input, props.editable === false && styles.inputReadOnly]}
      placeholderTextColor="#b2bec3"
      {...props}
    />
  </View>
);

// ─── Main Screen ───────────────────────────────────────────────────────────────

const MechanicProfile = () => {
  const router = useRouter();
  const { userInfo } = useContext(AuthContext);

  const [profile, setProfile]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [editing, setEditing]     = useState(false);
  const [saving,  setSaving]      = useState(false);

  // Editable form fields
  const [name,        setName]        = useState('');
  const [phone,       setPhone]       = useState('');
  const [newPassword, setNewPassword] = useState('');

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchMechanicProfile();
      setProfile(data);
      setName(data.name ?? '');
      setPhone(data.phone ?? '');
    } catch (e) {
      Alert.alert('Error', 'Could not load your profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Field', 'Name is required.');
      return;
    }
    setSaving(true);
    try {
      const payload = { name: name.trim(), phone: phone.trim() };
      if (newPassword.trim()) {
        if (newPassword.trim().length < 6) {
          Alert.alert('Weak Password', 'Password must be at least 6 characters.');
          setSaving(false);
          return;
        }
        payload.password = newPassword.trim();
      }
      const updated = await updateMechanicProfile(payload);
      setProfile(updated);
      setNewPassword('');
      setEditing(false);
      Alert.alert('Saved ✅', 'Your profile has been updated.');
    } catch (e) {
      Alert.alert('Save Failed', e.message || 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Feather name="alert-circle" size={48} color="#dfe6e9" />
        <Text style={styles.errorText}>Profile not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Feather name="arrow-left" size={16} color="#fff" />
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const garageName = profile.garageId?.garageName ?? 'Unassigned';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Back row ── */}
      <TouchableOpacity style={styles.backRow} onPress={() => router.back()} hitSlop={12} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={20} color={ACCENT} />
        <Text style={styles.backRowText}>Dashboard</Text>
      </TouchableOpacity>

      {/* ── Hero ── */}
      <View style={styles.hero}>
        <View style={styles.avatarWrap}>
          <Ionicons name="person" size={36} color="#fff" />
        </View>
        <Text style={styles.heroName}>{profile.name}</Text>
        <View style={styles.rolePill}>
          <Feather name="tool" size={12} color={ACCENT} />
          <Text style={styles.roleText}>Mechanic</Text>
        </View>
        <View style={styles.garagePill}>
          <Ionicons name="business-outline" size={13} color="#636e72" />
          <Text style={styles.garageText}>{garageName}</Text>
        </View>
        {profile.isActive === false && (
          <View style={styles.suspendedBadge}>
            <Feather name="alert-circle" size={13} color="#e74c3c" />
            <Text style={styles.suspendedText}>Account Deactivated</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>

        {/* ── Profile details ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Profile Details</Text>
          {!editing && (
            <TouchableOpacity onPress={() => setEditing(true)} style={styles.editBtn} activeOpacity={0.8}>
              <Feather name="edit-2" size={14} color={ACCENT} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.card}>
          <Field
            label="Full Name"
            icon="user"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            editable={editing}
          />
          <Field
            label="Phone"
            icon="phone"
            value={phone}
            onChangeText={setPhone}
            placeholder="Your phone number"
            keyboardType="phone-pad"
            editable={editing}
          />
          <Field
            label="Email"
            icon="mail"
            value={profile.email ?? ''}
            editable={false}
          />
        </View>

        {/* ── Change password (only while editing) ── */}
        {editing && (
          <>
            <Text style={styles.sectionTitle}>Change Password</Text>
            <View style={styles.card}>
              <Field
                label="New Password"
                icon="lock"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Leave blank to keep current"
                secureTextEntry
                editable
              />
            </View>
          </>
        )}

        {/* ── Actions ── */}
        {editing && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              activeOpacity={0.75}
              onPress={() => { setEditing(false); setNewPassword(''); load(); }}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveBtn}
              activeOpacity={0.85}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Feather name="check" size={16} color="#fff" />}
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        )}

      </View>
    </ScrollView>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const shadow = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10 },
  android: { elevation: 2 },
});

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f8f9fa' },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 14 },
  loadingText: { color: '#b2bec3', fontSize: 14 },
  errorText:   { fontSize: 15, color: '#636e72' },
  backBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ACCENT, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
  backBtnText: { color: '#fff', fontWeight: '600' },
  backRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 16, paddingBottom: 8 },
  backRowText: { fontSize: 15, color: ACCENT, fontWeight: '600' },

  hero: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 8,
    ...shadow,
  },
  avatarWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: ACCENT,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  heroName:   { fontSize: 22, fontWeight: '800', color: '#1a1a2e' },
  rolePill:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f4ecf7', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  roleText:   { fontSize: 13, fontWeight: '700', color: ACCENT },
  garagePill: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  garageText: { fontSize: 13, color: '#636e72' },
  suspendedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff0f0', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  suspendedText:  { fontSize: 12, color: '#e74c3c', fontWeight: '700' },

  content: { padding: 16 },
  sectionHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 6 },
  sectionTitle:   { fontSize: 13, fontWeight: '700', color: '#636e72', textTransform: 'uppercase', letterSpacing: 0.7 },
  editBtn:        { flexDirection: 'row', alignItems: 'center', gap: 5 },
  editBtnText:    { fontSize: 13, color: ACCENT, fontWeight: '700' },

  card: { backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 16, gap: 14, ...shadow },

  fieldWrap:      { gap: 5 },
  fieldLabel:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fieldLabelText: { fontSize: 11, color: '#b2bec3', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#f8f9fa', borderRadius: 10, padding: 12,
    fontSize: 15, color: '#1a1a2e', borderWidth: 1, borderColor: '#e9ecef',
  },
  inputReadOnly: { backgroundColor: '#f1f3f5', color: '#636e72' },

  actionRow:    { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn:    { flex: 1, padding: 16, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e9ecef', alignItems: 'center' },
  cancelBtnText:{ color: '#636e72', fontWeight: '700', fontSize: 15 },
  saveBtn:      { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 14, backgroundColor: ACCENT,
    ...Platform.select({ ios: { shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }, android: { elevation: 4 } }) },
  saveBtnText:  { color: '#fff', fontWeight: '700', fontSize: 15 },
});

export default MechanicProfile;
