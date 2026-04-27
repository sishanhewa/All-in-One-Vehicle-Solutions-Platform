import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Platform, TextInput,
} from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { fetchRepairBookingById, cancelRepairBooking, updateRepairBooking } from '../api/serviceApi';

const ACCENT = '#8e44ad';

// ─── Status pipeline ───────────────────────────────────────────────────────────

const STATUS_STEPS = [
  { value: 'pending_confirmation', short: 'Pending' },
  { value: 'confirmed',            short: 'Confirmed' },
  { value: 'in_progress',          short: 'In Progress' },
  { value: 'ready_for_pickup',     short: 'Ready' },
  { value: 'completed',            short: 'Done' },
];

const STATUS_META = {
  pending_confirmation: { color: '#e67e22', bg: '#fef9f0', label: 'Pending Confirmation', icon: 'clock' },
  confirmed:            { color: '#3498db', bg: '#eef6ff', label: 'Confirmed',             icon: 'check-circle' },
  in_progress:          { color: '#f39c12', bg: '#fff5ed', label: 'In Progress',           icon: 'tool' },
  ready_for_pickup:     { color: '#5f27cd', bg: '#f0f0ff', label: 'Ready for Pickup',      icon: 'bell' },
  completed:            { color: '#10ac84', bg: '#f0faf7', label: 'Completed',             icon: 'check' },
  cancelled:            { color: '#e74c3c', bg: '#fff0f0', label: 'Cancelled',             icon: 'x-circle' },
};

const CANCELLABLE = ['pending_confirmation', 'confirmed'];

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (dateStr, opts) => {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', opts || {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch { return dateStr; }
};

const fmtTime = (ts) => {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
};

const safeJoin = (arr) => {
  if (!Array.isArray(arr) || !arr.length) return '—';
  return arr.map((s) => (typeof s === 'object' ? s.name || '' : s)).filter(Boolean).join(', ');
};

const Card = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

const InfoRow = ({ icon, iconLib = 'Feather', label, value, valueStyle }) => {
  const Icon = iconLib === 'Ionicons' ? Ionicons : Feather;
  return (
    <View style={styles.infoRow}>
      <Icon name={icon} size={15} color={ACCENT} />
      <View style={{ flex: 1 }}>
        {label ? <Text style={styles.infoLabel}>{label}</Text> : null}
        <Text style={[styles.infoValue, valueStyle]} numberOfLines={0}>{value ?? '—'}</Text>
      </View>
    </View>
  );
};

// ─── Status Tracker ────────────────────────────────────────────────────────────

const StatusTracker = ({ status }) => {
  if (status === 'cancelled') {
    return (
      <View style={[styles.trackerCard, { alignItems: 'center', gap: 8 }]}>
        <Ionicons name="close-circle" size={32} color="#e74c3c" />
        <Text style={styles.cancelledTitle}>Booking Cancelled</Text>
      </View>
    );
  }

  const currentIdx = STATUS_STEPS.findIndex((s) => s.value === status);
  const meta = STATUS_META[status] || STATUS_META.pending_confirmation;

  return (
    <View style={styles.trackerCard}>
      <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
        <Feather name={meta.icon} size={14} color={meta.color} />
        <Text style={[styles.statusPillText, { color: meta.color }]}>{meta.label}</Text>
      </View>
      <View style={styles.stepsRow}>
        {STATUS_STEPS.map((step, idx) => {
          const done    = idx <= currentIdx;
          const active  = idx === currentIdx;
          const dotColor = done ? meta.color : '#e9ecef';
          return (
            <React.Fragment key={step.value}>
              <View style={styles.stepCol}>
                <View style={[styles.stepDot, { backgroundColor: dotColor, borderColor: active ? meta.color : '#e9ecef' }]}>
                  {done && <Ionicons name="checkmark" size={11} color="#fff" />}
                </View>
                <Text style={[styles.stepLabel, done && { color: '#1a1a2e', fontWeight: '700' }]}>
                  {step.short}
                </Text>
              </View>
              {idx < STATUS_STEPS.length - 1 && (
                <View style={[styles.stepLine, idx < currentIdx && { backgroundColor: meta.color }]} />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

// ─── Collapsible ───────────────────────────────────────────────────────────────

const Collapsible = ({ title, icon, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.collapsibleHeader}
        activeOpacity={0.7}
        onPress={() => setOpen((v) => !v)}
      >
        <View style={styles.collapsibleTitle}>
          <Feather name={icon} size={15} color={ACCENT} />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#b2bec3" />
      </TouchableOpacity>
      {open && <View style={styles.collapsibleBody}>{children}</View>}
    </View>
  );
};

// ─── Main Screen ───────────────────────────────────────────────────────────────

const RepairDetail = () => {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams();

  const [booking,    setBooking]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [editing,    setEditing]    = useState(false);
  const [editDate,   setEditDate]   = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => { load(); }, [bookingId]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchRepairBookingById(bookingId);
      setBooking(data);
    } catch (e) {
      Alert.alert('Error', 'Could not load repair details.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this repair booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel', style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await cancelRepairBooking(bookingId, 'Cancelled by customer');
              Alert.alert('Cancelled', 'Your booking has been cancelled.', [
                { text: 'OK', onPress: load },
              ]);
            } catch (e) {
              Alert.alert('Failed', e.message || 'Could not cancel booking.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  // ── Loading ──
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Loading repair details...</Text>
      </View>
    );
  }

  // ── Not found ──
  if (!booking) {
    return (
      <View style={styles.center}>
        <Feather name="alert-circle" size={48} color="#dfe6e9" />
        <Text style={styles.errorText}>Booking not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Feather name="arrow-left" size={16} color="#fff" />
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Derived values ──
  const status      = booking.status ?? 'pending_confirmation';
  const garageName  = booking.garageId?.garageName ?? 'Garage';
  const services    = safeJoin(booking.serviceOfferingIds);
  const mechanic    = booking.assignedMechanicId?.name ?? null;
  const vehicle     = booking.vehicleInfo ?? {};
  const history     = Array.isArray(booking.statusHistory) ? booking.statusHistory : [];
  const parts       = Array.isArray(booking.partsUsed)    ? booking.partsUsed    : [];
  const invoice     = booking.finalInvoiceAmount ?? booking.estimatedTotal ?? null;
  const canCancel   = CANCELLABLE.includes(status);
  const canEdit     = status === 'pending_confirmation';
  const isCompleted = status === 'completed';
  const hasReview   = !!booking.review || booking.hasReview === true;

  const handleEdit = () => {
    setEditDate(booking.preferredDate ? booking.preferredDate.slice(0, 10) : '');
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!editDate.trim() || !dateRegex.test(editDate.trim())) {
      Alert.alert('Invalid Date', 'Please enter a date in YYYY-MM-DD format (e.g. 2025-12-31).');
      return;
    }
    const parsed = new Date(editDate.trim());
    if (isNaN(parsed.getTime())) {
      Alert.alert('Invalid Date', 'That date does not exist. Please check and try again.');
      return;
    }
    if (parsed < new Date(new Date().toDateString())) {
      Alert.alert('Invalid Date', 'Preferred date cannot be in the past.');
      return;
    }
    setSavingEdit(true);
    try {
      const updated = await updateRepairBooking(bookingId, { preferredDate: parsed.toISOString() });
      setBooking(updated);
      setEditing(false);
      Alert.alert('Updated ✅', 'Your preferred date has been updated.');
    } catch (e) {
      Alert.alert('Failed', e.message || 'Could not update booking.');
    } finally {
      setSavingEdit(false);
    }
  };

  const customerNotes = booking.customerNotes ?? booking.notes ?? '';
  const mechanicNotes = booking.mechanicNotes ?? '';
  const ownerNotes    = booking.ownerNotes    ?? '';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Back row ── */}
      <TouchableOpacity style={styles.backRow} onPress={() => router.back()} hitSlop={12} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={20} color={ACCENT} />
        <Text style={styles.backRowText}>My Repairs</Text>
      </TouchableOpacity>

      {/* ── Status tracker ── */}
      <StatusTracker status={status} />

      <View style={styles.content}>

        {/* ── Booking summary ── */}
        <Text style={styles.sectionTitle}>Service Booking</Text>
        <Card>
          <InfoRow icon="tool"           label="Garage"   value={garageName} />
          <View style={styles.divider} />
          <InfoRow icon="layers"         label="Services" value={services} />
          {invoice != null && (
            <>
              <View style={styles.divider} />
              <InfoRow
                icon="dollar-sign"
                label="Estimated Total"
                value={`Rs. ${Number(invoice).toLocaleString()}`}
                valueStyle={{ color: ACCENT, fontWeight: '800', fontSize: 17 }}
              />
            </>
          )}
        </Card>

        {/* ── Vehicle ── */}
        <Text style={styles.sectionTitle}>Vehicle</Text>
        <Card>
          <View style={styles.vehicleHeader}>
            <View style={styles.vehicleIconWrap}>
              <Ionicons name="construct-outline" size={24} color={ACCENT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.vehicleTitle}>
                {vehicle.year ? `${vehicle.year} ` : ''}{vehicle.make} {vehicle.model}
              </Text>
              <Text style={styles.vehicleSub}>
                {vehicle.plateNumber}{vehicle.vehicleType ? ` · ${vehicle.vehicleType}` : ''}
              </Text>
            </View>
          </View>
        </Card>

        {/* ── Appointment ── */}
        <Text style={styles.sectionTitle}>Appointment</Text>
        <Card>
          <InfoRow icon="calendar" iconLib="Ionicons" label="Date"  value={fmt(booking.preferredDate)} />
          {booking.preferredTime && (
            <>
              <View style={styles.divider} />
              <InfoRow icon="time-outline" iconLib="Ionicons" label="Time" value={booking.preferredTime} />
            </>
          )}
          {mechanic && (
            <>
              <View style={styles.divider} />
              <InfoRow icon="user" label="Assigned Mechanic" value={mechanic} />
            </>
          )}
        </Card>

        {/* ── Notes ── */}
        {(customerNotes || mechanicNotes || ownerNotes) ? (
          <>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Card>
              {customerNotes ? (
                <View style={styles.noteBlock}>
                  <Text style={styles.noteAuthor}>Your Notes</Text>
                  <Text style={styles.noteText}>{customerNotes}</Text>
                </View>
              ) : null}
              {mechanicNotes ? (
                <View style={[styles.noteBlock, customerNotes && styles.noteBlockBorder]}>
                  <Text style={styles.noteAuthor}>Mechanic Notes</Text>
                  <Text style={styles.noteText}>{mechanicNotes}</Text>
                </View>
              ) : null}
              {ownerNotes ? (
                <View style={[styles.noteBlock, (customerNotes || mechanicNotes) && styles.noteBlockBorder]}>
                  <Text style={styles.noteAuthor}>Garage Notes</Text>
                  <Text style={styles.noteText}>{ownerNotes}</Text>
                </View>
              ) : null}
            </Card>
          </>
        ) : null}

        {/* ── Parts used ── */}
        {parts.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Parts Used</Text>
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, styles.tableHead, { flex: 2 }]}>Part</Text>
                <Text style={[styles.tableCell, styles.tableHead, { flex: 1, textAlign: 'center' }]}>Qty</Text>
                <Text style={[styles.tableCell, styles.tableHead, { flex: 1.5, textAlign: 'right' }]}>Price</Text>
              </View>
              {parts.map((p, idx) => (
                <View
                  key={idx}
                  style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}
                >
                  <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={2}>{p.name ?? '—'}</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>{p.quantity ?? 1}</Text>
                  <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right', fontWeight: '700' }]}>
                    {p.price != null ? `Rs. ${Number(p.price).toLocaleString()}` : '—'}
                  </Text>
                </View>
              ))}
            </Card>
          </>
        )}

        {/* ── Final invoice ── */}
        {isCompleted && invoice != null && (
          <View style={styles.invoiceCard}>
            <Feather name="file-text" size={18} color={ACCENT} />
            <View style={{ flex: 1 }}>
              <Text style={styles.invoiceLabel}>Final Invoice</Text>
              <Text style={styles.invoiceAmount}>Rs. {Number(invoice).toLocaleString()}</Text>
            </View>
            <View style={styles.invoiceBadge}>
              <Feather name="check" size={14} color="#10ac84" />
              <Text style={styles.invoiceBadgeText}>Paid</Text>
            </View>
          </View>
        )}

        {/* ── Status history (collapsible) ── */}
        {history.length > 0 && (
          <Collapsible title="Status History" icon="activity">
            {history.map((h, idx) => {
              const m = STATUS_META[h.status] ?? { color: '#636e72', label: h.status };
              return (
                <View key={idx} style={[styles.historyItem, idx > 0 && styles.historyItemBorder]}>
                  <View style={[styles.historyDot, { backgroundColor: m.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.historyStatus, { color: m.color }]}>{m.label}</Text>
                    {h.changedAt && (
                      <Text style={styles.historyTime}>
                        {fmt(h.changedAt, { month: 'short', day: 'numeric', year: 'numeric' })}
                        {fmtTime(h.changedAt) ? ` · ${fmtTime(h.changedAt)}` : ''}
                      </Text>
                    )}
                    {h.note ? <Text style={styles.historyNote}>{h.note}</Text> : null}
                  </View>
                </View>
              );
            })}
          </Collapsible>
        )}

        {/* ── Edit Booking (pending only) ── */}
        {canEdit && (
          editing ? (
            <View style={styles.editCard}>
              <Text style={styles.editCardTitle}>Change Preferred Date</Text>
              <TextInput
                style={styles.editInput}
                value={editDate}
                onChangeText={setEditDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#b2bec3"
                keyboardType="numbers-and-punctuation"
                autoFocus
              />
              <View style={styles.editRow}>
                <TouchableOpacity
                  style={styles.editCancelBtn}
                  onPress={() => setEditing(false)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.editCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editSaveBtn, savingEdit && { opacity: 0.6 }]}
                  onPress={handleSaveEdit}
                  disabled={savingEdit}
                  activeOpacity={0.85}
                >
                  {savingEdit
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Feather name="check" size={16} color="#fff" />}
                  <Text style={styles.editSaveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.editBtn}
              activeOpacity={0.75}
              onPress={handleEdit}
            >
              <Feather name="edit-2" size={18} color={ACCENT} />
              <Text style={styles.editBtnText}>Edit Booking</Text>
            </TouchableOpacity>
          )
        )}

        {/* ── Cancel button ── */}
        {canCancel && (
          <TouchableOpacity
            style={styles.cancelBtn}
            activeOpacity={0.75}
            onPress={handleCancel}
            disabled={cancelling}
          >
            {cancelling
              ? <ActivityIndicator color="#e74c3c" size="small" />
              : <Feather name="x-circle" size={18} color="#e74c3c" />}
            <Text style={styles.cancelBtnText}>Cancel Booking</Text>
          </TouchableOpacity>
        )}

        {/* ── Leave Review button ── */}
        {isCompleted && !hasReview && (
          <TouchableOpacity
            style={styles.reviewBtn}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/LeaveReview', params: { bookingId } })}
          >
            <Feather name="star" size={18} color="#fff" />
            <Text style={styles.reviewBtnText}>Leave a Review</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 20 }} />
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

  // ── Tracker ──
  trackerCard: {
    backgroundColor: '#fff', padding: 20,
    borderBottomWidth: 1, borderBottomColor: '#eee', gap: 16,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 }, android: { elevation: 2 } }),
  },
  statusPill:     { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20 },
  statusPillText: { fontSize: 13, fontWeight: '700' },
  stepsRow:       { flexDirection: 'row', alignItems: 'flex-start' },
  stepCol:        { alignItems: 'center', flex: 1 },
  stepDot:        { width: 26, height: 26, borderRadius: 13, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  stepLabel:      { fontSize: 9, color: '#b2bec3', textAlign: 'center', fontWeight: '600' },
  stepLine:       { flex: 1, height: 2, backgroundColor: '#e9ecef', marginTop: 12, marginHorizontal: -2 },
  cancelledTitle: { fontSize: 18, fontWeight: '700', color: '#e74c3c' },

  // ── Layout ──
  content:      { padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#636e72', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10, marginTop: 6 },

  // ── Card ──
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 16, gap: 14, ...shadow },

  // ── Info rows ──
  infoRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoLabel: { fontSize: 11, color: '#b2bec3', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  infoValue: { fontSize: 15, color: '#1a1a2e', fontWeight: '500', lineHeight: 22 },
  divider:   { height: 1, backgroundColor: '#f1f3f5' },

  // ── Vehicle ──
  vehicleHeader:  { flexDirection: 'row', alignItems: 'center', gap: 14 },
  vehicleIconWrap: { width: 50, height: 50, borderRadius: 14, backgroundColor: '#f4ecf7', justifyContent: 'center', alignItems: 'center' },
  vehicleTitle:   { fontSize: 17, fontWeight: '700', color: '#1a1a2e' },
  vehicleSub:     { fontSize: 13, color: '#b2bec3', fontWeight: '600', marginTop: 3 },

  // ── Notes ──
  noteBlock:       { gap: 4 },
  noteBlockBorder: { borderTopWidth: 1, borderTopColor: '#f1f3f5', paddingTop: 14, marginTop: 0 },
  noteAuthor:      { fontSize: 11, color: '#b2bec3', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  noteText:        { fontSize: 14, color: '#4a4a4a', lineHeight: 21 },

  // ── Parts table ──
  tableHeader: { flexDirection: 'row', backgroundColor: '#f4ecf7', paddingVertical: 10, paddingHorizontal: 14 },
  tableRow:    { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 14 },
  tableRowAlt: { backgroundColor: '#fdf8ff' },
  tableHead:   { fontWeight: '700', color: ACCENT, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableCell:   { fontSize: 13, color: '#1a1a2e' },

  // ── Invoice ──
  invoiceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fdf8ff', borderRadius: 14,
    padding: 18, marginBottom: 16,
    borderWidth: 1, borderColor: '#e8d5f5',
    ...shadow,
  },
  invoiceLabel:     { fontSize: 11, color: '#b2bec3', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  invoiceAmount:    { fontSize: 22, fontWeight: '800', color: ACCENT, marginTop: 2 },
  invoiceBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#f0faf7', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  invoiceBadgeText: { fontSize: 13, fontWeight: '700', color: '#10ac84' },

  // ── Collapsible ──
  collapsibleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  collapsibleTitle:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  collapsibleBody:   { marginTop: 14, gap: 0 },

  // ── History ──
  historyItem:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10 },
  historyItemBorder: { borderTopWidth: 1, borderTopColor: '#f1f3f5' },
  historyDot:        { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  historyStatus:     { fontSize: 14, fontWeight: '700' },
  historyTime:       { fontSize: 12, color: '#b2bec3', marginTop: 2 },
  historyNote:       { fontSize: 13, color: '#636e72', marginTop: 3, fontStyle: 'italic' },

  // ── Inline edit ──
  editCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 12,
    borderWidth: 1.5, borderColor: `${ACCENT}55`, ...shadow,
  },
  editCardTitle:   { fontSize: 13, fontWeight: '700', color: '#636e72', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  editInput: {
    backgroundColor: '#f8f9fa', borderRadius: 10, padding: 13,
    fontSize: 16, color: '#1a1a2e', borderWidth: 1, borderColor: '#e9ecef', marginBottom: 12,
  },
  editRow:           { flexDirection: 'row', gap: 10 },
  editCancelBtn:     { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e9ecef', alignItems: 'center' },
  editCancelBtnText: { color: '#636e72', fontWeight: '700' },
  editSaveBtn:       { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 14, borderRadius: 12, backgroundColor: ACCENT },
  editSaveBtnText:   { color: '#fff', fontWeight: '700' },

  editBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 16, backgroundColor: '#fdf8ff', borderRadius: 14,
    borderWidth: 1, borderColor: '#e8d5f5', marginBottom: 12,
  },
  editBtnText: { color: ACCENT, fontWeight: '700', fontSize: 16 },

  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 16, backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#fce4e4', marginBottom: 12,
  },
  cancelBtnText: { color: '#e74c3c', fontWeight: '700', fontSize: 16 },

  reviewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: ACCENT, padding: 18, borderRadius: 16, marginBottom: 12,
    ...Platform.select({
      ios:     { shadowColor: ACCENT, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.35, shadowRadius: 10 },
      android: { elevation: 5 },
    }),
  },
  reviewBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});

export default RepairDetail;
