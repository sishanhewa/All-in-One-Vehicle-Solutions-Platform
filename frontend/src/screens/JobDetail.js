import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import {
  fetchRepairBookingById,
  startJob,
  markJobReady,
} from '../api/serviceApi';

const ACCENT = '#8e44ad';

// ─── Status pipeline ───────────────────────────────────────────────────────────

const STATUS_STEPS = [
  { value: 'confirmed',        short: 'Confirmed' },
  { value: 'in_progress',      short: 'In Progress' },
  { value: 'ready_for_pickup', short: 'Ready' },
  { value: 'completed',        short: 'Done' },
];

const STATUS_META = {
  pending_confirmation: { color: '#e67e22', bg: '#fef9f0', label: 'Pending',        icon: 'clock' },
  confirmed:            { color: '#3498db', bg: '#eef6ff', label: 'Confirmed',       icon: 'check-circle' },
  in_progress:          { color: '#f39c12', bg: '#fff5ed', label: 'In Progress',     icon: 'tool' },
  ready_for_pickup:     { color: '#5f27cd', bg: '#f0f0ff', label: 'Ready for Pickup',icon: 'bell' },
  completed:            { color: '#10ac84', bg: '#f0faf7', label: 'Completed',       icon: 'check' },
  cancelled:            { color: '#e74c3c', bg: '#fff0f0', label: 'Cancelled',       icon: 'x-circle' },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (d, opts) => {
  if (!d) return 'N/A';
  try {
    return new Date(d).toLocaleDateString('en-US', opts || {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch { return d; }
};

const safeJoin = (arr, key = 'name') => {
  if (!Array.isArray(arr) || !arr.length) return '—';
  return arr.map((s) => (typeof s === 'object' ? s[key] || '' : s)).filter(Boolean).join(', ');
};

// ─── Sub-components ────────────────────────────────────────────────────────────

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

const Divider = () => <View style={styles.divider} />;

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

  const meta       = STATUS_META[status] ?? STATUS_META.confirmed;
  const currentIdx = STATUS_STEPS.findIndex((s) => s.value === status);

  return (
    <View style={styles.trackerCard}>
      <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
        <Feather name={meta.icon} size={14} color={meta.color} />
        <Text style={[styles.statusPillText, { color: meta.color }]}>{meta.label}</Text>
      </View>
      <View style={styles.stepsRow}>
        {STATUS_STEPS.map((step, idx) => {
          const done   = idx <= currentIdx;
          const active = idx === currentIdx;
          return (
            <React.Fragment key={step.value}>
              <View style={styles.stepCol}>
                <View style={[
                  styles.stepDot,
                  { backgroundColor: done ? meta.color : '#e9ecef', borderColor: active ? meta.color : '#e9ecef' },
                ]}>
                  {done && <Ionicons name="checkmark" size={11} color="#fff" />}
                </View>
                <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>{step.short}</Text>
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

// ─── Action button ─────────────────────────────────────────────────────────────

const ActionBtn = ({ icon, label, onPress, color = ACCENT, outline = false, loading = false }) => (
  <TouchableOpacity
    style={[
      styles.actionBtn,
      outline
        ? { backgroundColor: '#fff', borderWidth: 1.5, borderColor: color }
        : { backgroundColor: color },
      loading && { opacity: 0.6 },
    ]}
    activeOpacity={0.85}
    onPress={onPress}
    disabled={loading}
  >
    {loading
      ? <ActivityIndicator size="small" color={outline ? color : '#fff'} />
      : <Feather name={icon} size={17} color={outline ? color : '#fff'} />}
    <Text style={[styles.actionBtnText, outline && { color }]}>{label}</Text>
  </TouchableOpacity>
);

// ─── Main Screen ───────────────────────────────────────────────────────────────

const JobDetail = () => {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams();

  const [booking,       setBooking]       = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [startingJob,   setStartingJob]   = useState(false);
  const [markingReady,  setMarkingReady]  = useState(false);

  useEffect(() => { load(); }, [bookingId]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchRepairBookingById(bookingId);
      setBooking(data);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not load job details.');
    } finally {
      setLoading(false);
    }
  };

  // ── Start Work ──
  const handleStartJob = () => {
    Alert.alert(
      'Start Work',
      'Mark this job as in progress? The customer will be notified.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: async () => {
            setStartingJob(true);
            try {
              await startJob(bookingId);
              Alert.alert('Job Started! 🔧', 'Status updated to In Progress.', [
                { text: 'OK', onPress: load },
              ]);
            } catch (e) {
              Alert.alert('Failed', e.message || 'Could not start job.');
            } finally {
              setStartingJob(false);
            }
          },
        },
      ]
    );
  };

  // ── Mark Ready ──
  const handleMarkReady = () => {
    Alert.alert(
      'Mark Ready for Pickup',
      'Is the vehicle ready for the customer to collect?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Mark Ready',
          onPress: async () => {
            setMarkingReady(true);
            try {
              await markJobReady(bookingId);
              Alert.alert('Marked Ready! ✅', 'The customer will be notified to collect their vehicle.', [
                { text: 'OK', onPress: load },
              ]);
            } catch (e) {
              Alert.alert('Failed', e.message || 'Could not update status.');
            } finally {
              setMarkingReady(false);
            }
          },
        },
      ]
    );
  };

  // ── Navigate to RecordWork ──
  const goToRecordWork = () =>
    router.push({ pathname: '/RecordWork', params: { bookingId } });

  // ── Loading ──
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Loading job details...</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.center}>
        <Feather name="alert-circle" size={48} color="#dfe6e9" />
        <Text style={styles.errorText}>Job not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Feather name="arrow-left" size={16} color="#fff" />
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Derived values ──
  const status       = booking.status ?? 'confirmed';
  const garageName   = booking.garageId?.garageName ?? 'Garage';
  const services     = safeJoin(booking.serviceOfferingIds);
  const vehicle      = booking.vehicleInfo ?? {};
  const invoice      = booking.finalInvoiceAmount ?? booking.estimatedTotal ?? null;
  const parts        = Array.isArray(booking.partsUsed) ? booking.partsUsed : [];

  const customerName   = booking.customerId?.name ?? booking.userId?.name ?? 'Customer';
  const customerNotes  = booking.customerNotes ?? booking.notes ?? '';
  const mechanicNotes  = booking.mechanicNotes ?? '';
  const ownerNotes     = booking.ownerNotes    ?? '';

  const isConfirmed   = status === 'confirmed';
  const isInProgress  = status === 'in_progress';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Back ── */}
      <TouchableOpacity style={styles.backRow} onPress={() => router.back()} hitSlop={12} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={20} color={ACCENT} />
        <Text style={styles.backRowText}>My Jobs</Text>
      </TouchableOpacity>

      {/* ── Status tracker ── */}
      <StatusTracker status={status} />

      <View style={styles.content}>

        {/* ── Job summary ── */}
        <Text style={styles.sectionTitle}>Job Summary</Text>
        <Card>
          <InfoRow icon="tool" label="Garage"   value={garageName} />
          <Divider />
          <InfoRow icon="layers" label="Services" value={services} />
          {invoice != null && (
            <>
              <Divider />
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
          <InfoRow icon="user" label="Customer" value={customerName} />
          <Divider />
          <InfoRow icon="calendar" iconLib="Ionicons" label="Date" value={fmt(booking.preferredDate)} />
          {booking.preferredTime && (
            <>
              <Divider />
              <InfoRow icon="time-outline" iconLib="Ionicons" label="Time" value={booking.preferredTime} />
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
                  <View style={styles.noteLabelRow}>
                    <Feather name="user" size={13} color="#b2bec3" />
                    <Text style={styles.noteLabel}>Customer Notes</Text>
                    <View style={styles.readOnlyPill}><Text style={styles.readOnlyText}>Read-only</Text></View>
                  </View>
                  <Text style={styles.noteText}>{customerNotes}</Text>
                </View>
              ) : null}

              {mechanicNotes ? (
                <View style={[styles.noteBlock, customerNotes && styles.noteBlockBorder]}>
                  <View style={styles.noteLabelRow}>
                    <Feather name="tool" size={13} color={ACCENT} />
                    <Text style={[styles.noteLabel, { color: ACCENT }]}>My Notes</Text>
                  </View>
                  <Text style={styles.noteText}>{mechanicNotes}</Text>
                </View>
              ) : null}

              {ownerNotes ? (
                <View style={[styles.noteBlock, (customerNotes || mechanicNotes) && styles.noteBlockBorder]}>
                  <View style={styles.noteLabelRow}>
                    <Feather name="briefcase" size={13} color="#b2bec3" />
                    <Text style={styles.noteLabel}>Garage Notes</Text>
                    <View style={styles.readOnlyPill}><Text style={styles.readOnlyText}>Read-only</Text></View>
                  </View>
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
                <View key={idx} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
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

        {/* ── Action buttons ── */}
        <View style={styles.actionsBlock}>

          {/* Start Work — only when confirmed */}
          {isConfirmed && (
            <ActionBtn
              icon="play"
              label="Start Work"
              color="#f39c12"
              onPress={handleStartJob}
              loading={startingJob}
            />
          )}

          {/* In-progress actions */}
          {isInProgress && (
            <>
              <ActionBtn
                icon="edit-3"
                label={mechanicNotes || parts.length > 0 ? 'Edit Notes & Parts' : 'Add Notes & Parts'}
                outline
                color={ACCENT}
                onPress={goToRecordWork}
              />
              <ActionBtn
                icon="bell"
                label="Mark Ready for Pickup"
                color="#5f27cd"
                onPress={handleMarkReady}
                loading={markingReady}
              />
            </>
          )}

          {/* Always show RecordWork link when in_progress or completed (view past notes) */}
          {status === 'completed' && (mechanicNotes || parts.length > 0) && (
            <ActionBtn
              icon="file-text"
              label="View Work Record"
              outline
              color="#10ac84"
              onPress={goToRecordWork}
            />
          )}
        </View>

      </View>
    </ScrollView>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const cardShadow = Platform.select({
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
  stepLabelDone:  { color: '#1a1a2e', fontWeight: '700' },
  stepLine:       { flex: 1, height: 2, backgroundColor: '#e9ecef', marginTop: 12, marginHorizontal: -2 },
  cancelledTitle: { fontSize: 18, fontWeight: '700', color: '#e74c3c' },

  // ── Layout ──
  content:      { padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#636e72', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10, marginTop: 6 },

  card:    { backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 16, gap: 14, ...cardShadow },
  divider: { height: 1, backgroundColor: '#f1f3f5' },

  infoRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoLabel: { fontSize: 11, color: '#b2bec3', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  infoValue: { fontSize: 15, color: '#1a1a2e', fontWeight: '500', lineHeight: 22 },

  vehicleHeader:   { flexDirection: 'row', alignItems: 'center', gap: 14 },
  vehicleIconWrap: { width: 50, height: 50, borderRadius: 14, backgroundColor: '#f4ecf7', justifyContent: 'center', alignItems: 'center' },
  vehicleTitle:    { fontSize: 17, fontWeight: '700', color: '#1a1a2e' },
  vehicleSub:      { fontSize: 13, color: '#b2bec3', fontWeight: '600', marginTop: 3 },

  // ── Notes ──
  noteBlock:        { gap: 6 },
  noteBlockBorder:  { borderTopWidth: 1, borderTopColor: '#f1f3f5', paddingTop: 14 },
  noteLabelRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noteLabel:        { fontSize: 12, color: '#636e72', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
  noteText:         { fontSize: 14, color: '#4a4a4a', lineHeight: 21 },
  readOnlyPill:     { backgroundColor: '#f1f3f5', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 8 },
  readOnlyText:     { fontSize: 10, color: '#b2bec3', fontWeight: '600' },

  // ── Parts table ──
  tableHeader: { flexDirection: 'row', backgroundColor: '#f4ecf7', paddingVertical: 10, paddingHorizontal: 14 },
  tableRow:    { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 14 },
  tableRowAlt: { backgroundColor: '#fdf8ff' },
  tableHead:   { fontWeight: '700', color: ACCENT, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableCell:   { fontSize: 13, color: '#1a1a2e' },

  // ── Actions ──
  actionsBlock: { gap: 12, marginTop: 4 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 17, borderRadius: 14,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default JobDetail;
