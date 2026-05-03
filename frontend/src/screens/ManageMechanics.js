import React, { useState, useCallback, useContext } from 'react';
import {
  View, Text, FlatList, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, Platform, Modal,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import {
  fetchMyMechanics, addMechanic, updateMechanic,
  deactivateMechanic, removeMechanic,
} from '../api/serviceApi';
import { AuthContext } from '../context/AuthContext';

const ACCENT = '#8e44ad';

const emptyAddForm  = () => ({ name: '', email: '', phone: '', password: '' });
const emptyEditForm = (m) => ({ name: m?.name ?? '', phone: m?.phone ?? '', newPassword: '' });

// ─── Add Mechanic Modal ────────────────────────────────────────────────────────
const AddMechanicModal = ({ visible, onClose, onAdded }) => {
  const [form, setForm]           = useState(emptyAddForm());
  const [showPass, setShowPass]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors]       = useState({});

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())                     e.name     = 'Name is required.';
    if (!form.email.trim())                    e.email    = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email   = 'Enter a valid email.';
    if (!form.phone.trim())                    e.phone    = 'Phone number is required.';
    else if (!/^\+?[0-9\s-]{10,15}$/.test(form.phone.replace(/\s/g, ''))) {
      e.phone = 'Enter a valid phone number (e.g., +94 77 123 4567 or 077-123-4567).';
    }
    if (!form.password)                        e.password = 'Password is required.';
    else if (form.password.length < 6)         e.password = 'Min. 6 characters.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await addMechanic({ name: form.name.trim(), email: form.email.trim().toLowerCase(), phone: form.phone.trim(), password: form.password });
      Alert.alert('Mechanic Added ✅', `${form.name.trim()} has been added to your team.`);
      setForm(emptyAddForm());
      setErrors({});
      onAdded();
    } catch (e) {
      Alert.alert('Failed', e.message || 'Could not add mechanic.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => { setForm(emptyAddForm()); setErrors({}); setShowPass(false); onClose(); };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Mechanic</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={10}><Feather name="x" size={22} color="#636e72" /></TouchableOpacity>
          </View>
          <Text style={styles.modalSubtitle}>Create a mechanic account under your garage</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {[
              { key: 'name',     label: 'Full Name',     icon: 'user',  placeholder: 'e.g. Kamal Perera', kbType: 'default',       caps: 'words' },
              { key: 'email',    label: 'Email Address', icon: 'mail',  placeholder: 'mechanic@garage.com', kbType: 'email-address', caps: 'none' },
              { key: 'phone',    label: 'Phone Number',  icon: 'phone', placeholder: '+94 77 123 4567',    kbType: 'phone-pad',     caps: 'none' },
            ].map(({ key, label, icon, placeholder, kbType, caps }) => (
              <View style={styles.fieldWrap} key={key}>
                <Text style={styles.fieldLabel}>{label} <Text style={styles.required}>*</Text></Text>
                <View style={[styles.inputWrap, errors[key] && styles.inputWrapError]}>
                  <Feather name={icon} size={16} color="#b2bec3" />
                  <TextInput
                    style={styles.inputInner} placeholder={placeholder} placeholderTextColor="#b2bec3"
                    value={form[key]} onChangeText={(v) => setField(key, v)}
                    keyboardType={kbType} autoCapitalize={caps}
                  />
                </View>
                {errors[key] ? <Text style={styles.errorMsg}>{errors[key]}</Text> : null}
              </View>
            ))}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Password <Text style={styles.required}>*</Text></Text>
              <View style={[styles.inputWrap, errors.password && styles.inputWrapError]}>
                <Feather name="lock" size={16} color="#b2bec3" />
                <TextInput
                  style={styles.inputInner} placeholder="Min. 6 characters" placeholderTextColor="#b2bec3"
                  value={form.password} onChangeText={(v) => setField('password', v)} secureTextEntry={!showPass}
                />
                <TouchableOpacity onPress={() => setShowPass((v) => !v)} hitSlop={8}>
                  <Feather name={showPass ? 'eye-off' : 'eye'} size={18} color="#b2bec3" />
                </TouchableOpacity>
              </View>
              {errors.password ? <Text style={styles.errorMsg}>{errors.password}</Text> : null}
            </View>
            <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.6 }]} activeOpacity={0.85} onPress={handleSubmit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <><Feather name="user-plus" size={18} color="#fff" /><Text style={styles.submitBtnText}>Add Mechanic</Text></>}
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Edit Mechanic Modal ───────────────────────────────────────────────────────
const EditMechanicModal = ({ visible, mechanic, onClose, onUpdated }) => {
  const [form, setForm]             = useState(emptyEditForm(mechanic));
  const [showPass, setShowPass]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors]         = useState({});

  // Sync form when mechanic prop changes
  React.useEffect(() => { setForm(emptyEditForm(mechanic)); setErrors({}); setShowPass(false); }, [mechanic]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name  = 'Name is required.';
    if (!form.phone.trim()) e.phone = 'Phone is required.';
    else if (!/^\+?[0-9\s-]{10,15}$/.test(form.phone.replace(/\s/g, ''))) {
      e.phone = 'Enter a valid phone number (e.g., +94 77 123 4567 or 077-123-4567).';
    }
    if (form.newPassword && form.newPassword.length < 6) e.newPassword = 'Min. 6 characters.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !mechanic) return;
    setSubmitting(true);
    try {
      const payload = { name: form.name.trim(), phone: form.phone.trim() };
      if (form.newPassword.trim()) payload.newPassword = form.newPassword.trim();
      const updated = await updateMechanic(mechanic._id, payload);
      Alert.alert('Updated ✅', `${updated.name}'s profile has been updated.`);
      onUpdated(updated);
    } catch (e) {
      Alert.alert('Failed', e.message || 'Could not update mechanic.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { maxHeight: '70%' }]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Mechanic</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}><Feather name="x" size={22} color="#636e72" /></TouchableOpacity>
          </View>
          <Text style={styles.modalSubtitle}>Update name, phone, or reset password</Text>
          <ScrollView keyboardShouldPersistTaps="handled">
            {[
              { key: 'name',  label: 'Full Name',    icon: 'user',  placeholder: 'Full name', caps: 'words', kbType: 'default' },
              { key: 'phone', label: 'Phone Number', icon: 'phone', placeholder: '+94 77 …',  caps: 'none',  kbType: 'phone-pad' },
            ].map(({ key, label, icon, placeholder, caps, kbType }) => (
              <View style={styles.fieldWrap} key={key}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <View style={[styles.inputWrap, errors[key] && styles.inputWrapError]}>
                  <Feather name={icon} size={16} color="#b2bec3" />
                  <TextInput
                    style={styles.inputInner} placeholder={placeholder} placeholderTextColor="#b2bec3"
                    value={form[key]} onChangeText={(v) => setField(key, v)}
                    autoCapitalize={caps} keyboardType={kbType}
                  />
                </View>
                {errors[key] ? <Text style={styles.errorMsg}>{errors[key]}</Text> : null}
              </View>
            ))}

            {/* ── Optional password reset ── */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Reset Password <Text style={{ color: '#b2bec3', fontWeight: '400' }}>(optional)</Text></Text>
              <View style={[styles.inputWrap, errors.newPassword && styles.inputWrapError]}>
                <Feather name="lock" size={16} color="#b2bec3" />
                <TextInput
                  style={styles.inputInner} placeholder="New password (min. 6 chars)" placeholderTextColor="#b2bec3"
                  value={form.newPassword} onChangeText={(v) => setField('newPassword', v)}
                  secureTextEntry={!showPass}
                />
                <TouchableOpacity onPress={() => setShowPass((v) => !v)} hitSlop={8}>
                  <Feather name={showPass ? 'eye-off' : 'eye'} size={18} color="#b2bec3" />
                </TouchableOpacity>
              </View>
              {errors.newPassword ? <Text style={styles.errorMsg}>{errors.newPassword}</Text> : null}
            </View>

            <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.6 }]} activeOpacity={0.85} onPress={handleSubmit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <><Feather name="save" size={18} color="#fff" /><Text style={styles.submitBtnText}>Save Changes</Text></>}
            </TouchableOpacity>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Screen ───────────────────────────────────────────────────────────────
const ManageMechanics = () => {
  const { userInfo } = useContext(AuthContext);
  const [mechanics,   setMechanics]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showAdd,     setShowAdd]     = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);
  const [actioningId, setActioningId] = useState(null);

  useFocusEffect(useCallback(() => { if (userInfo) load(); }, [userInfo]));

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchMyMechanics();
      setMechanics(Array.isArray(data) ? data : (data.mechanics ?? []));
    } catch {
      Alert.alert('Error', 'Could not load your mechanics.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdded = () => { setShowAdd(false); load(); };

  const handleUpdated = (updated) => {
    setMechanics((prev) => prev.map((m) => m._id === updated._id ? { ...m, ...updated } : m));
    setEditTarget(null);
  };

  const handleToggleActive = (mechanic) => {
    const action = mechanic.isActive !== false ? 'deactivate' : 'reactivate';
    Alert.alert(
      `${action === 'deactivate' ? 'Deactivate' : 'Reactivate'} Mechanic`,
      action === 'deactivate'
        ? `Deactivating ${mechanic.name} will prevent them from logging in. They will stay in your team list.\n\nNote: mechanics with active jobs cannot be deactivated.`
        : `Reactivate ${mechanic.name}? They will be able to log in again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'deactivate' ? 'Deactivate' : 'Reactivate',
          style: action === 'deactivate' ? 'destructive' : 'default',
          onPress: async () => {
            setActioningId(mechanic._id);
            try {
              await deactivateMechanic(mechanic._id, action !== 'deactivate');
              setMechanics((prev) => prev.map((m) => m._id === mechanic._id ? { ...m, isActive: action !== 'deactivate' } : m));
            } catch (e) {
              Alert.alert('Cannot ' + action, e.message || 'This mechanic may have active jobs.');
            } finally {
              setActioningId(null);
            }
          },
        },
      ]
    );
  };

  const handleRemove = (mechanic) => {
    Alert.alert(
      'Remove Mechanic',
      `Permanently remove ${mechanic.name}? This deletes their account.\n\nNote: mechanics with active jobs cannot be removed. Consider deactivating instead.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setActioningId(mechanic._id);
            try {
              await removeMechanic(mechanic._id);
              setMechanics((prev) => prev.filter((m) => m._id !== mechanic._id));
              Alert.alert('Removed', `${mechanic.name} has been permanently removed.`);
            } catch (e) {
              Alert.alert('Cannot Remove', e.message || 'This mechanic may have active jobs.');
            } finally {
              setActioningId(null);
            }
          },
        },
      ]
    );
  };

  const renderCard = ({ item }) => {
    const isActioning = actioningId === item._id;
    const inactive    = item.isActive === false;
    const initials    = item.name ? item.name.trim().split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() : '?';

    return (
      <View style={[styles.card, inactive && styles.cardInactive]}>
        <View style={styles.cardMain}>
          <View style={[styles.avatar, inactive && { backgroundColor: '#b2bec3' }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={[styles.mechanicName, inactive && { color: '#b2bec3' }]}>{item.name}</Text>
              {inactive && (
                <View style={styles.inactivePill}>
                  <Text style={styles.inactivePillText}>Inactive</Text>
                </View>
              )}
            </View>
            <View style={styles.infoRow}><Feather name="mail"  size={13} color="#b2bec3" /><Text style={styles.infoText} numberOfLines={1}>{item.email ?? '—'}</Text></View>
            <View style={styles.infoRow}><Feather name="phone" size={13} color="#b2bec3" /><Text style={styles.infoText}>{item.phone ?? '—'}</Text></View>
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setEditTarget(item)} disabled={isActioning}>
            <Feather name="edit-2" size={14} color={ACCENT} />
            <Text style={[styles.actionBtnText, { color: ACCENT }]}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, inactive ? styles.actionBtnSuccess : styles.actionBtnWarn]}
            onPress={() => handleToggleActive(item)}
            disabled={isActioning}
          >
            {isActioning
              ? <ActivityIndicator size="small" color={inactive ? '#27ae60' : '#e67e22'} />
              : <Feather name={inactive ? 'user-check' : 'user-x'} size={14} color={inactive ? '#27ae60' : '#e67e22'} />
            }
            <Text style={[styles.actionBtnText, { color: inactive ? '#27ae60' : '#e67e22' }]}>
              {inactive ? 'Reactivate' : 'Deactivate'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => handleRemove(item)} disabled={isActioning}>
            <Feather name="trash-2" size={14} color="#e74c3c" />
            <Text style={[styles.actionBtnText, { color: '#e74c3c' }]}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.listHeader}>
        <View>
          <Text style={styles.listTitle}>Team Members</Text>
          <Text style={styles.listSubtitle}>{mechanics.length} mechanic{mechanics.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.85} onPress={() => setShowAdd(true)}>
          <Feather name="user-plus" size={16} color="#fff" />
          <Text style={styles.addBtnText}>Add Mechanic</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loaderText}>Loading your team...</Text>
        </View>
      ) : mechanics.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconWrap}><Ionicons name="people-outline" size={48} color="#dfe6e9" /></View>
          <Text style={styles.emptyTitle}>No mechanics yet</Text>
          <Text style={styles.emptySubtitle}>Add mechanics to your team so they can be assigned to repair jobs</Text>
          <TouchableOpacity style={styles.emptyAddBtn} activeOpacity={0.85} onPress={() => setShowAdd(true)}>
            <Feather name="user-plus" size={16} color="#fff" />
            <Text style={styles.addBtnText}>Add First Mechanic</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={mechanics}
          keyExtractor={(item) => item._id}
          renderItem={renderCard}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
          onRefresh={load}
          refreshing={loading}
          ItemSeparatorComponent={() => <View style={{ height: 2 }} />}
        />
      )}

      <AddMechanicModal visible={showAdd} onClose={() => setShowAdd(false)} onAdded={handleAdded} />
      <EditMechanicModal visible={!!editTarget} mechanic={editTarget} onClose={() => setEditTarget(null)} onUpdated={handleUpdated} />
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────
const cardShadow = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10 },
  android: { elevation: 2 },
});

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f8f9fa' },
  listHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  listTitle:    { fontSize: 18, fontWeight: '700', color: '#1a1a2e' },
  listSubtitle: { fontSize: 13, color: '#b2bec3', marginTop: 2 },
  addBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ACCENT, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  addBtnText:   { color: '#fff', fontWeight: '700', fontSize: 14 },

  loaderWrap:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderText:    { color: '#b2bec3', fontSize: 14 },
  emptyWrap:     { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  emptyIconWrap: { width: 90, height: 90, borderRadius: 28, backgroundColor: '#f1f3f5', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: '#636e72' },
  emptySubtitle: { fontSize: 13, color: '#b2bec3', textAlign: 'center', lineHeight: 20 },
  emptyAddBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, backgroundColor: ACCENT, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },

  card:         { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 12, ...cardShadow },
  cardInactive: { opacity: 0.75, borderColor: '#dee2e6', borderWidth: 1 },
  cardMain:     { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 14 },

  avatar:       { width: 52, height: 52, borderRadius: 16, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarText:   { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },

  mechanicName: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  inactivePill: { backgroundColor: '#f1f3f5', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6 },
  inactivePillText: { fontSize: 10, fontWeight: '700', color: '#b2bec3', textTransform: 'uppercase' },

  infoRow:  { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4 },
  infoText: { fontSize: 13, color: '#636e72', flex: 1 },

  cardActions:    { flexDirection: 'row', gap: 8 },
  actionBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: '#e9ecef', backgroundColor: '#f8f9fa' },
  actionBtnWarn:  { borderColor: '#fde8d0', backgroundColor: '#fffaf5' },
  actionBtnDanger:{ borderColor: '#fce4e4', backgroundColor: '#fff8f8' },
  actionBtnSuccess:{ borderColor: '#d5f5e3', backgroundColor: '#f0fdf4' },
  actionBtnText:  { fontSize: 12, fontWeight: '700' },

  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet:    { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '88%' },
  modalHandle:   { width: 40, height: 4, backgroundColor: '#dfe6e9', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  modalTitle:    { fontSize: 20, fontWeight: '800', color: '#1a1a2e' },
  modalSubtitle: { fontSize: 13, color: '#b2bec3', marginBottom: 20 },

  fieldWrap:      { marginBottom: 16 },
  fieldLabel:     { fontSize: 13, fontWeight: '600', color: '#4a4a4a', marginBottom: 7 },
  required:       { color: '#e74c3c' },
  errorMsg:       { fontSize: 11, color: '#e74c3c', marginTop: 5, fontWeight: '600' },
  inputWrap:      { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f8f9fa', borderRadius: 12, borderWidth: 1, borderColor: '#e9ecef', paddingHorizontal: 14 },
  inputWrapError: { borderColor: '#e74c3c', backgroundColor: '#fff8f8' },
  inputInner:     { flex: 1, paddingVertical: 14, fontSize: 15, color: '#1a1a2e' },

  submitBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: ACCENT, padding: 18, borderRadius: 14, marginTop: 4 },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});

export default ManageMechanics;
