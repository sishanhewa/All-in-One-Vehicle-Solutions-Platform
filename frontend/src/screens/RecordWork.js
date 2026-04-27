import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { fetchRepairBookingById, updateJobNotes } from '../api/serviceApi';

const ACCENT = '#8e44ad';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const emptyPart = () => ({ id: Date.now().toString(), name: '', quantity: '1', unitPrice: '' });

const partTotal = (p) => {
  const qty   = parseFloat(p.quantity)  || 0;
  const price = parseFloat(p.unitPrice) || 0;
  return qty * price;
};

// ─── Part Row ──────────────────────────────────────────────────────────────────

const PartRow = ({ part, index, onChange, onRemove }) => (
  <View style={styles.partRow}>
    <View style={styles.partRowHeader}>
      <View style={styles.partIndexBadge}>
        <Text style={styles.partIndexText}>{index + 1}</Text>
      </View>
      <Text style={styles.partRowTitle}>Part / Item</Text>
      <TouchableOpacity onPress={onRemove} hitSlop={8} style={styles.removePartBtn}>
        <Feather name="trash-2" size={16} color="#e74c3c" />
      </TouchableOpacity>
    </View>

    <TextInput
      style={styles.partNameInput}
      placeholder="Part name (e.g. Oil Filter)"
      placeholderTextColor="#b2bec3"
      value={part.name}
      onChangeText={(v) => onChange({ ...part, name: v })}
    />

    <View style={styles.partNumRow}>
      <View style={styles.partNumField}>
        <Text style={styles.partNumLabel}>Quantity</Text>
        <TextInput
          style={styles.partNumInput}
          placeholder="1"
          placeholderTextColor="#b2bec3"
          keyboardType="numeric"
          value={part.quantity}
          onChangeText={(v) => onChange({ ...part, quantity: v })}
        />
      </View>
      <View style={styles.partNumField}>
        <Text style={styles.partNumLabel}>Unit Price (Rs.)</Text>
        <TextInput
          style={styles.partNumInput}
          placeholder="0.00"
          placeholderTextColor="#b2bec3"
          keyboardType="numeric"
          value={part.unitPrice}
          onChangeText={(v) => onChange({ ...part, unitPrice: v })}
        />
      </View>
      <View style={styles.partNumField}>
        <Text style={styles.partNumLabel}>Subtotal</Text>
        <View style={styles.subtotalBox}>
          <Text style={styles.subtotalText}>
            Rs. {partTotal(part).toLocaleString()}
          </Text>
        </View>
      </View>
    </View>
  </View>
);

// ─── Main Screen ───────────────────────────────────────────────────────────────

const RecordWork = () => {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams();

  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [mechanicNotes,  setMechanicNotes]  = useState('');
  const [parts,          setParts]          = useState([]);

  // Summary
  const totalPartsValue = parts.reduce((sum, p) => sum + partTotal(p), 0);

  // ── Fetch & pre-populate ──
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await fetchRepairBookingById(bookingId);
        setMechanicNotes(data.mechanicNotes ?? '');
        const existingParts = Array.isArray(data.partsUsed) ? data.partsUsed : [];
        setParts(
          existingParts.map((p, i) => ({
            id:        p._id ?? `existing-${i}`,
            name:      p.name      ?? '',
            quantity:  String(p.quantity  ?? 1),
            unitPrice: String(p.price     ?? p.unitPrice ?? ''),
          }))
        );
      } catch {
        Alert.alert('Error', 'Could not load job data.');
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId]);

  // ── Part helpers ──
  const addPart    = () => setParts((prev) => [...prev, emptyPart()]);
  const removePart = (id) => setParts((prev) => prev.filter((p) => p.id !== id));
  const updatePart = (id, updated) =>
    setParts((prev) => prev.map((p) => p.id === id ? updated : p));

  // ── Save ──
  const handleSave = async () => {
    // Validate parts
    for (const [i, p] of parts.entries()) {
      if (!p.name.trim()) {
        Alert.alert('Missing Part Name', `Part #${i + 1} is missing a name.`);
        return;
      }
      if (isNaN(parseFloat(p.quantity)) || parseFloat(p.quantity) <= 0) {
        Alert.alert('Invalid Quantity', `Part #${i + 1} has an invalid quantity.`);
        return;
      }
    }

    const payload = {
      mechanicNotes: mechanicNotes.trim(),
      partsUsed: parts.map((p) => ({
        name:      p.name.trim(),
        quantity:  parseFloat(p.quantity) || 1,
        price:     parseFloat(p.unitPrice) || 0,
      })),
    };

    setSaving(true);
    try {
      await updateJobNotes(bookingId, payload);
      Alert.alert(
        'Saved! ✅',
        'Work notes and parts have been recorded.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (e) {
      Alert.alert('Save Failed', e.message || 'Could not save work record.');
    } finally {
      setSaving(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Loading job data...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Back row ── */}
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()} hitSlop={12} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={ACCENT} />
          <Text style={styles.backRowText}>Job Detail</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          {/* ── Header ── */}
          <View style={styles.headerBlock}>
            <View style={styles.headerIcon}>
              <Feather name="edit-3" size={22} color="#fff" />
            </View>
            <View>
              <Text style={styles.screenTitle}>Record Work</Text>
              <Text style={styles.screenSubtitle}>Log notes and parts used</Text>
            </View>
          </View>

          {/* ── Work Notes ── */}
          <Text style={styles.sectionTitle}>Work Notes</Text>
          <View style={styles.notesCard}>
            <View style={styles.notesCardHeader}>
              <Feather name="file-text" size={15} color={ACCENT} />
              <Text style={styles.notesCardLabel}>Mechanic Notes</Text>
              <Text style={styles.notesCharCount}>{mechanicNotes.length} chars</Text>
            </View>
            <TextInput
              style={styles.notesInput}
              placeholder="Describe the work performed, observations, recommendations..."
              placeholderTextColor="#b2bec3"
              multiline
              numberOfLines={6}
              value={mechanicNotes}
              onChangeText={setMechanicNotes}
              textAlignVertical="top"
            />
          </View>

          {/* ── Parts ── */}
          <View style={styles.partsSectionHeader}>
            <Text style={styles.sectionTitle}>Parts Used</Text>
            {parts.length > 0 && (
              <View style={styles.partsTotalBadge}>
                <Text style={styles.partsTotalText}>
                  Total: Rs. {totalPartsValue.toLocaleString()}
                </Text>
              </View>
            )}
          </View>

          {parts.length === 0 ? (
            <View style={styles.noPartsBlock}>
              <Feather name="package" size={32} color="#dfe6e9" />
              <Text style={styles.noPartsText}>No parts added yet</Text>
              <Text style={styles.noPartsSubText}>Tap below to log parts or materials used</Text>
            </View>
          ) : (
            parts.map((part, index) => (
              <PartRow
                key={part.id}
                part={part}
                index={index}
                onChange={(updated) => updatePart(part.id, updated)}
                onRemove={() => removePart(part.id)}
              />
            ))
          )}

          {/* ── Add part button ── */}
          <TouchableOpacity style={styles.addPartBtn} activeOpacity={0.75} onPress={addPart}>
            <Feather name="plus-circle" size={18} color={ACCENT} />
            <Text style={styles.addPartBtnText}>Add Part / Item</Text>
          </TouchableOpacity>

          {/* ── Parts summary ── */}
          {parts.length > 0 && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Items</Text>
                <Text style={styles.summaryValue}>{parts.length}</Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryRowBorder]}>
                <Text style={[styles.summaryLabel, { fontWeight: '700', color: '#1a1a2e' }]}>Total Parts Cost</Text>
                <Text style={[styles.summaryValue, { color: ACCENT, fontWeight: '800', fontSize: 17 }]}>
                  Rs. {totalPartsValue.toLocaleString()}
                </Text>
              </View>
            </View>
          )}

          {/* ── Save ── */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            activeOpacity={0.85}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : (
                <>
                  <Feather name="save" size={18} color="#fff" />
                  <Text style={styles.saveBtnText}>Save Work Record</Text>
                </>
              )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelLink} onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.cancelLinkText}>Discard changes</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const cardShadow = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10 },
  android: { elevation: 2 },
});

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f8f9fa' },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#b2bec3', fontSize: 14 },

  backRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 16, paddingBottom: 8 },
  backRowText: { fontSize: 15, color: ACCENT, fontWeight: '600' },

  content: { paddingHorizontal: 16, paddingBottom: 20 },

  // ── Header ──
  headerBlock: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 },
  headerIcon: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: ACCENT,
    justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      ios:     { shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  screenTitle:    { fontSize: 22, fontWeight: '800', color: '#1a1a2e' },
  screenSubtitle: { fontSize: 13, color: '#b2bec3', marginTop: 2 },

  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: '#636e72',
    textTransform: 'uppercase', letterSpacing: 0.7,
    marginBottom: 10, marginTop: 4,
  },

  // ── Notes ──
  notesCard: {
    backgroundColor: '#fff', borderRadius: 14,
    padding: 16, marginBottom: 20, ...cardShadow,
  },
  notesCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  notesCardLabel:  { flex: 1, fontSize: 14, fontWeight: '700', color: '#1a1a2e' },
  notesCharCount:  { fontSize: 12, color: '#b2bec3' },
  notesInput: {
    backgroundColor: '#f8f9fa', borderRadius: 10,
    borderWidth: 1, borderColor: '#e9ecef',
    padding: 14, fontSize: 15, color: '#1a1a2e',
    minHeight: 130, lineHeight: 22,
  },

  // ── Parts ──
  partsSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 4 },
  partsTotalBadge:    { backgroundColor: '#f4ecf7', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 20 },
  partsTotalText:     { fontSize: 12, fontWeight: '700', color: ACCENT },

  noPartsBlock: {
    backgroundColor: '#fff', borderRadius: 14,
    alignItems: 'center', paddingVertical: 28, gap: 8,
    marginBottom: 12, ...cardShadow,
  },
  noPartsText:    { fontSize: 14, fontWeight: '700', color: '#636e72' },
  noPartsSubText: { fontSize: 13, color: '#b2bec3', textAlign: 'center' },

  // ── Part row ──
  partRow: {
    backgroundColor: '#fff', borderRadius: 14,
    padding: 16, marginBottom: 10, ...cardShadow,
  },
  partRowHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  partIndexBadge:{ width: 26, height: 26, borderRadius: 8, backgroundColor: '#f4ecf7', justifyContent: 'center', alignItems: 'center' },
  partIndexText: { fontSize: 13, fontWeight: '800', color: ACCENT },
  partRowTitle:  { flex: 1, fontSize: 14, fontWeight: '700', color: '#1a1a2e' },
  removePartBtn: { padding: 4 },

  partNameInput: {
    backgroundColor: '#f8f9fa', borderRadius: 10,
    borderWidth: 1, borderColor: '#e9ecef',
    padding: 12, fontSize: 15, color: '#1a1a2e', marginBottom: 10,
  },
  partNumRow:   { flexDirection: 'row', gap: 8 },
  partNumField: { flex: 1 },
  partNumLabel: { fontSize: 11, color: '#b2bec3', fontWeight: '600', marginBottom: 5, textTransform: 'uppercase' },
  partNumInput: {
    backgroundColor: '#f8f9fa', borderRadius: 10,
    borderWidth: 1, borderColor: '#e9ecef',
    padding: 10, fontSize: 14, color: '#1a1a2e', textAlign: 'center',
  },
  subtotalBox: {
    backgroundColor: '#f4ecf7', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  subtotalText: { fontSize: 12, fontWeight: '700', color: ACCENT },

  // ── Add part ──
  addPartBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 14,
    paddingVertical: 16, marginBottom: 16,
    borderWidth: 1.5, borderColor: ACCENT, borderStyle: 'dashed',
    ...cardShadow,
  },
  addPartBtnText: { fontSize: 15, color: ACCENT, fontWeight: '700' },

  // ── Summary ──
  summaryCard: {
    backgroundColor: '#fdf8ff', borderRadius: 14,
    padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: '#e8d5f5', ...cardShadow,
  },
  summaryRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  summaryRowBorder: { borderTopWidth: 1, borderTopColor: '#e8d5f5', marginTop: 4, paddingTop: 12 },
  summaryLabel:     { fontSize: 13, color: '#636e72' },
  summaryValue:     { fontSize: 14, fontWeight: '700', color: '#1a1a2e' },

  // ── Save ──
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: ACCENT, padding: 18, borderRadius: 16,
    ...Platform.select({
      ios:     { shadowColor: ACCENT, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.35, shadowRadius: 10 },
      android: { elevation: 5 },
    }),
  },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  cancelLink:  { alignItems: 'center', paddingVertical: 16 },
  cancelLinkText: { fontSize: 14, color: '#b2bec3', fontWeight: '600' },
});

export default RecordWork;
