import React, { useState, useCallback, useContext, useMemo } from 'react';

import {
  View, Text, FlatList, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput, Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import {
  fetchBookingQueue,
  confirmRepairBooking,
  declineRepairBooking,
  completeJob,
  fetchMyMechanics,
  reassignMechanic,
} from '../api/serviceApi';
import { AuthContext } from '../context/AuthContext';

const ACCENT = '#8e44ad';

// ─── Config ────────────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { value: 'All',                  label: 'All' },
  { value: 'pending_confirmation', label: 'Pending' },
  { value: 'confirmed',            label: 'Confirmed' },
  { value: 'in_progress',          label: 'In Progress' },
  { value: 'ready_for_pickup',     label: 'Ready' },
  { value: 'completed',            label: 'Completed' },
  { value: 'cancelled',            label: 'Cancelled' },
];

const STATUS_META = {
  pending_confirmation: { color: '#e67e22', bg: '#fef9f0', icon: 'clock',        label: 'Pending' },
  confirmed:            { color: '#3498db', bg: '#eef6ff', icon: 'check-circle', label: 'Confirmed' },
  in_progress:          { color: '#f39c12', bg: '#fff5ed', icon: 'tool',         label: 'In Progress' },
  ready_for_pickup:     { color: '#5f27cd', bg: '#f0f0ff', icon: 'bell',         label: 'Ready' },
  completed:            { color: '#10ac84', bg: '#f0faf7', icon: 'check',        label: 'Completed' },
  cancelled:            { color: '#e74c3c', bg: '#fff0f0', icon: 'x-circle',     label: 'Cancelled' },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (d) => {
  if (!d) return 'N/A';
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return d; }
};

const safeJoin = (arr) => {
  if (!Array.isArray(arr) || !arr.length) return 'Service';
  return arr.map((s) => (typeof s === 'object' ? s.name || '' : s)).filter(Boolean).join(', ');
};

// ─── Mechanic Picker Modal ─────────────────────────────────────────────────────

const MechanicPickerModal = ({ visible, mechanics, loadingMechanics, onSelect, onClose }) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />

        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Assign Mechanic</Text>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Feather name="x" size={22} color="#636e72" />
          </TouchableOpacity>
        </View>

        <Text style={styles.modalSubtitle}>Select a mechanic to assign to this booking</Text>

        {loadingMechanics ? (
          <View style={styles.modalLoader}>
            <ActivityIndicator size="large" color={ACCENT} />
          </View>
        ) : mechanics.length === 0 ? (
          <View style={styles.modalEmpty}>
            <Ionicons name="people-outline" size={48} color="#dfe6e9" />
            <Text style={styles.modalEmptyText}>No mechanics found</Text>
            <Text style={styles.modalEmptySubText}>Add mechanics from Manage Team first</Text>
          </View>
        ) : (
          <FlatList
            data={mechanics}
            keyExtractor={(m) => m._id}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.mechanicRow}>
                <View style={styles.mechanicAvatar}>
                  <Feather name="user" size={18} color={ACCENT} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mechanicName}>{item.name}</Text>
                  {item.specialization
                    ? <Text style={styles.mechanicSpec}>{item.specialization}</Text>
                    : null}
                </View>
                <TouchableOpacity
                  style={styles.selectBtn}
                  activeOpacity={0.8}
                  onPress={() => onSelect(item)}
                >
                  <Text style={styles.selectBtnText}>Select</Text>
                </TouchableOpacity>
              </View>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}

        {/* Accept without mechanic */}
        <TouchableOpacity style={styles.skipBtn} activeOpacity={0.7} onPress={() => onSelect(null)}>
          <Text style={styles.skipBtnText}>Confirm without assigning mechanic</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// ─── Invoice Prompt ────────────────────────────────────────────────────────────

const InvoiceModal = ({ visible, onConfirm, onClose }) => {
  const [amount, setAmount] = useState('');

  const handleConfirm = () => {
    const parsed = parseFloat(amount);
    if (!amount.trim() || isNaN(parsed) || parsed <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid invoice amount.');
      return;
    }
    onConfirm(parsed);
    setAmount('');
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.invoiceModal}>
          <View style={styles.invoiceIconWrap}>
            <Feather name="file-text" size={26} color={ACCENT} />
          </View>
          <Text style={styles.invoiceTitle}>Final Invoice</Text>
          <Text style={styles.invoiceSubtitle}>Enter the total amount to charge the customer</Text>

          <View style={styles.invoiceInputWrap}>
            <Text style={styles.invoiceCurrency}>Rs.</Text>
            <TextInput
              style={styles.invoiceInput}
              placeholder="0.00"
              placeholderTextColor="#b2bec3"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              autoFocus
            />
          </View>

          <View style={styles.invoiceActions}>
            <TouchableOpacity style={styles.invoiceCancelBtn} onPress={() => { setAmount(''); onClose(); }} activeOpacity={0.7}>
              <Text style={styles.invoiceCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.invoiceConfirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
              <Feather name="check" size={16} color="#fff" />
              <Text style={styles.invoiceConfirmText}>Complete Job</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Screen ───────────────────────────────────────────────────────────────

const BookingQueue = () => {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { userInfo } = useContext(AuthContext);

  const [queue,            setQueue]            = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [activeTab,        setActiveTab]        = useState('All');
  const [searchText,       setSearchText]       = useState('');
  const [actionLoading,    setActionLoading]    = useState(null); // bookingId of in-flight action

  // Mechanic modal
  const [mechanicModal,    setMechanicModal]    = useState(false);
  const [mechanics,        setMechanics]        = useState([]);
  const [loadingMechanics, setLoadingMechanics] = useState(false);
  const [pendingBookingId, setPendingBookingId] = useState(null);

  // Invoice modal
  const [invoiceModal,     setInvoiceModal]     = useState(false);
  const [invoiceBookingId, setInvoiceBookingId] = useState(null);

  // Reassign mode flag — when true the mechanic picker calls reassign, not confirm
  const [isReassignMode,   setIsReassignMode]   = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (userInfo) loadQueue();
    }, [userInfo, activeTab])
  );

  const loadQueue = async () => {
    setLoading(true);
    try {
      const filterValue = activeTab === 'All' ? {} : { status: activeTab };
      const data = await fetchBookingQueue(filterValue);
      const list = Array.isArray(data) ? data : (data.bookings ?? []);
      setQueue(list);
    } catch {
      Alert.alert('Error', 'Could not load booking queue.');
    } finally {
      setLoading(false);
    }
  };

  // ── Accept: open mechanic picker ──
  const handleAccept = async (bookingId) => {
    setIsReassignMode(false);
    setPendingBookingId(bookingId);
    setMechanicModal(true);
    setLoadingMechanics(true);
    try {
      const data = await fetchMyMechanics();
      const list = Array.isArray(data) ? data : (data.mechanics ?? []);
      setMechanics(list.filter((m) => m.isActive !== false));
    } catch {
      setMechanics([]);
    } finally {
      setLoadingMechanics(false);
    }
  };

  // ── Reassign: open mechanic picker in reassign mode ──
  const handleReassign = async (bookingId) => {
    setIsReassignMode(true);
    setPendingBookingId(bookingId);
    setMechanicModal(true);
    setLoadingMechanics(true);
    try {
      const data = await fetchMyMechanics();
      const list = Array.isArray(data) ? data : (data.mechanics ?? []);
      setMechanics(list.filter((m) => m.isActive !== false));
    } catch {
      setMechanics([]);
    } finally {
      setLoadingMechanics(false);
    }
  };

  // ── Mechanic selected (or null = skip) ──
  const handleMechanicSelect = async (mechanic) => {
    setMechanicModal(false);
    const id = pendingBookingId;
    setPendingBookingId(null);

    setActionLoading(id);
    try {
      if (isReassignMode) {
        if (!mechanic) { setActionLoading(null); return; } // reassign requires a mechanic
        await reassignMechanic(id, mechanic._id, `Reassigned to ${mechanic.name}`);
        Alert.alert('Mechanic Reassigned ✅', `${mechanic.name} has been reassigned to this job.`);
      } else {
        const payload = mechanic ? { assignedMechanicId: mechanic._id } : {};
        await confirmRepairBooking(id, payload);
        Alert.alert(
          'Booking Confirmed ✅',
          mechanic ? `${mechanic.name} has been assigned.` : 'Booking confirmed. Mechanic can be assigned later.',
        );
      }
      loadQueue();
    } catch (e) {
      Alert.alert('Failed', e.message || 'Could not complete action.');
    } finally {
      setActionLoading(null);
      setIsReassignMode(false);
    }
  };

  // ── Decline ──
  const handleDecline = (bookingId) => {
    Alert.alert(
      'Decline Booking',
      'Please provide a reason for declining this booking.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () => promptDeclineReason(bookingId),
        },
      ]
    );
  };

  const promptDeclineReason = (bookingId) => {
    Alert.prompt(
      'Reason for Declining',
      'Enter a brief reason (optional):',
      async (reason) => {
        setActionLoading(bookingId);
        try {
          await declineRepairBooking(bookingId, reason || 'Declined by garage');
          Alert.alert('Booking Declined', 'The customer has been notified.');
          loadQueue();
        } catch (e) {
          Alert.alert('Failed', e.message || 'Could not decline booking.');
        } finally {
          setActionLoading(null);
        }
      },
      'plain-text',
      '',
    );
  };

  // ── Complete job ──
  const handleCompleteJob = (bookingId) => {
    setInvoiceBookingId(bookingId);
    setInvoiceModal(true);
  };

  const handleInvoiceConfirm = async (amount) => {
    setInvoiceModal(false);
    const id = invoiceBookingId;
    setInvoiceBookingId(null);

    setActionLoading(id);
    try {
      await completeJob(id, { finalInvoiceAmount: amount });
      Alert.alert('Job Completed! 🎉', `Invoice of Rs. ${Number(amount).toLocaleString()} has been recorded.`);
      loadQueue();
    } catch (e) {
      Alert.alert('Failed', e.message || 'Could not complete job.');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Render card ──
  const renderCard = ({ item }) => {
    const meta    = STATUS_META[item.status] ?? STATUS_META.pending_confirmation;
    const isActing = actionLoading === item._id;
    const customer = item.customerId?.name ?? item.userId?.name ?? 'Customer';
    const services = safeJoin(item.serviceOfferingIds);
    const vehicle  = item.vehicleInfo
      ? `${item.vehicleInfo.make ?? ''} ${item.vehicleInfo.model ?? ''} · ${item.vehicleInfo.plateNumber ?? ''}`.trim()
      : '—';
    const mechanic = item.assignedMechanicId?.name ?? null;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.75}
        onPress={() => router.push({ pathname: '/RepairDetail', params: { bookingId: item._id } })}
      >
        {/* ── Card top ── */}
        <View style={styles.cardTop}>
          <View style={styles.customerAvatar}>
            <Feather name="user" size={18} color={ACCENT} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.customerName} numberOfLines={1}>{customer}</Text>
            <Text style={styles.vehicleText}  numberOfLines={1}>{vehicle}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
            <Feather name={meta.icon} size={12} color={meta.color} />
            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        {/* ── Meta rows ── */}
        <View style={styles.metaBlock}>
          <View style={styles.metaRow}>
            <Feather name="tool" size={13} color="#636e72" />
            <Text style={styles.metaText} numberOfLines={2}>{services}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={13} color="#636e72" />
            <Text style={styles.metaText}>{fmtDate(item.preferredDate)}{item.preferredTime ? ` · ${item.preferredTime}` : ''}</Text>
          </View>
          {mechanic && (
            <View style={styles.metaRow}>
              <Feather name="user-check" size={13} color="#636e72" />
              <Text style={styles.metaText}>{mechanic}</Text>
            </View>
          )}
        </View>

        {/* ── Actions ── */}
        {isActing ? (
          <View style={styles.actingWrap}>
            <ActivityIndicator size="small" color={ACCENT} />
            <Text style={styles.actingText}>Processing...</Text>
          </View>
        ) : (
          <View style={styles.actionsRow}>
            {item.status === 'pending_confirmation' && (
              <>
                <TouchableOpacity style={styles.acceptBtn} activeOpacity={0.85} onPress={() => handleAccept(item._id)}>
                  <Feather name="check" size={15} color="#fff" />
                  <Text style={styles.actionBtnText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.declineBtn} activeOpacity={0.85} onPress={() => handleDecline(item._id)}>
                  <Feather name="x" size={15} color="#e74c3c" />
                  <Text style={[styles.actionBtnText, { color: '#e74c3c' }]}>Decline</Text>
                </TouchableOpacity>
              </>
            )}

            {(item.status === 'confirmed' || item.status === 'in_progress') && (
              <TouchableOpacity style={styles.reassignBtn} activeOpacity={0.85} onPress={() => handleReassign(item._id)}>
                <Feather name="refresh-cw" size={14} color={ACCENT} />
                <Text style={[styles.actionBtnText, { color: ACCENT }]}>Reassign</Text>
              </TouchableOpacity>
            )}

            {item.status === 'ready_for_pickup' && (
              <TouchableOpacity style={styles.completeBtn} activeOpacity={0.85} onPress={() => handleCompleteJob(item._id)}>
                <Feather name="check-circle" size={15} color="#fff" />
                <Text style={styles.actionBtnText}>Complete Job</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.viewBtn} activeOpacity={0.7} onPress={() => router.push({ pathname: '/RepairDetail', params: { bookingId: item._id } })}>
              <Feather name="eye" size={14} color="#636e72" />
              <Text style={styles.viewBtnText}>View</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // ── Client-side search filter (derived, not state) ─────────────────────────
  const filteredQueue = useMemo(() => {
    const lc = searchText.toLowerCase().trim();
    if (!lc) return queue;
    return queue.filter((b) => {
      const name  = (b.customerId?.name ?? '').toLowerCase();
      const plate = (b.vehicleInfo?.plateNumber ?? '').toLowerCase();
      return name.includes(lc) || plate.includes(lc);
    });
  }, [queue, searchText]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* ── Filter tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        {STATUS_TABS.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <TouchableOpacity
              key={tab.value}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              activeOpacity={0.7}
              onPress={() => setActiveTab(tab.value)}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Search bar ── */}
      <View style={styles.searchWrap}>
        <Feather name="search" size={15} color="#b2bec3" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by customer name or plate..."
          placeholderTextColor="#b2bec3"
          value={searchText}
          onChangeText={setSearchText}
          returnKeyType="search"
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')} hitSlop={8}>
            <Feather name="x" size={15} color="#b2bec3" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loaderText}>Loading queue...</Text>
        </View>
      ) : filteredQueue.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="clipboard-outline" size={56} color="#dfe6e9" />
          <Text style={styles.emptyTitle}>{searchText.trim() ? 'No results found' : 'No bookings found'}</Text>
          <Text style={styles.emptySubtitle}>
            {searchText.trim()
              ? `No booking matching "${searchText}"`
              : activeTab === 'All' ? 'New bookings will appear here' : `No ${activeTab.replace(/_/g, ' ')} bookings`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredQueue}
          keyExtractor={(item) => item._id}
          renderItem={renderCard}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
          showsVerticalScrollIndicator={false}
          onRefresh={loadQueue}
          refreshing={loading}
        />
      )}

      {/* ── Mechanic Picker Modal ── */}
      <MechanicPickerModal
        visible={mechanicModal}
        mechanics={mechanics}
        loadingMechanics={loadingMechanics}
        onSelect={handleMechanicSelect}
        onClose={() => { setMechanicModal(false); setPendingBookingId(null); setIsReassignMode(false); }}
      />

      {/* ── Invoice Modal ── */}
      <InvoiceModal
        visible={invoiceModal}
        onConfirm={handleInvoiceConfirm}
        onClose={() => { setInvoiceModal(false); setInvoiceBookingId(null); }}
      />
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const cardShadow = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12 },
  android: { elevation: 3 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },

  // ── Filters ──
  filterScroll:         { maxHeight: 52, marginTop: 8 },
  filterContainer:      { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  filterChip:           { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e9ecef' },
  filterChipActive:     { backgroundColor: '#f4ecf7', borderColor: ACCENT },
  filterChipText:       { fontSize: 13, color: '#636e72', fontWeight: '600' },
  filterChipTextActive: { color: ACCENT },

  // ── Search ──
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginTop: 10, marginBottom: 4,
    backgroundColor: '#fff', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#e9ecef',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1a1a2e' },

  // ── Loading / empty ──
  loaderWrap:   { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderText:   { color: '#b2bec3', fontSize: 14 },
  emptyWrap:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 10 },
  emptyTitle:   { fontSize: 16, fontWeight: '700', color: '#636e72' },
  emptySubtitle:{ fontSize: 13, color: '#b2bec3', textAlign: 'center' },

  // ── Card ──
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14, ...cardShadow },

  cardTop:        { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  customerAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f4ecf7', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  customerName:   { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  vehicleText:    { fontSize: 12, color: '#b2bec3', marginTop: 2 },
  statusBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20 },
  statusText:     { fontSize: 11, fontWeight: '700' },

  metaBlock: { gap: 8, paddingBottom: 14, marginBottom: 14, borderBottomWidth: 1, borderBottomColor: '#f1f3f5' },
  metaRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  metaText:  { fontSize: 13, color: '#636e72', flex: 1, lineHeight: 19 },

  // ── Actions ──
  actionsRow: { flexDirection: 'row', gap: 10 },
  actingWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 8 },
  actingText: { fontSize: 14, color: '#636e72' },

  acceptBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 10, backgroundColor: '#10ac84' },
  declineBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#fce4e4' },
  reassignBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 10, backgroundColor: '#f4ecf7', borderWidth: 1, borderColor: '#d7b8ec' },
  completeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 10, backgroundColor: ACCENT },
  viewBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 11, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#f1f3f5' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  viewBtnText:   { color: '#636e72', fontWeight: '600', fontSize: 13 },

  // ── Mechanic modal ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '75%',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 16 },
      android: { elevation: 12 },
    }),
  },
  modalHandle:   { width: 40, height: 4, backgroundColor: '#dfe6e9', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  modalTitle:    { fontSize: 19, fontWeight: '800', color: '#1a1a2e' },
  modalSubtitle: { fontSize: 13, color: '#b2bec3', marginBottom: 20 },
  modalLoader:   { paddingVertical: 40, alignItems: 'center' },
  modalEmpty:    { alignItems: 'center', paddingVertical: 32, gap: 10 },
  modalEmptyText:    { fontSize: 15, fontWeight: '700', color: '#636e72' },
  modalEmptySubText: { fontSize: 13, color: '#b2bec3', textAlign: 'center' },

  mechanicRow:   { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  mechanicAvatar:{ width: 42, height: 42, borderRadius: 12, backgroundColor: '#f4ecf7', justifyContent: 'center', alignItems: 'center' },
  mechanicName:  { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  mechanicSpec:  { fontSize: 12, color: '#636e72', marginTop: 2 },
  selectBtn:     { paddingVertical: 8, paddingHorizontal: 18, backgroundColor: ACCENT, borderRadius: 10 },
  selectBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  separator:     { height: 1, backgroundColor: '#f1f3f5', marginLeft: 56 },

  skipBtn:     { marginTop: 14, alignItems: 'center', paddingVertical: 14 },
  skipBtnText: { fontSize: 13, color: '#b2bec3', fontWeight: '600' },

  // ── Invoice modal ──
  invoiceModal: {
    backgroundColor: '#fff', borderRadius: 24, margin: 24, padding: 28,
    alignItems: 'center', gap: 10,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20 },
      android: { elevation: 10 },
    }),
  },
  invoiceIconWrap: { width: 60, height: 60, borderRadius: 18, backgroundColor: '#f4ecf7', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  invoiceTitle:    { fontSize: 20, fontWeight: '800', color: '#1a1a2e' },
  invoiceSubtitle: { fontSize: 13, color: '#b2bec3', textAlign: 'center', marginBottom: 8 },
  invoiceInputWrap:{ flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: ACCENT, borderRadius: 14, paddingHorizontal: 16, width: '100%' },
  invoiceCurrency: { fontSize: 18, fontWeight: '700', color: ACCENT, marginRight: 8 },
  invoiceInput:    { flex: 1, fontSize: 24, fontWeight: '800', color: '#1a1a2e', paddingVertical: 14 },
  invoiceActions:  { flexDirection: 'row', gap: 12, width: '100%', marginTop: 8 },
  invoiceCancelBtn:  { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e9ecef', alignItems: 'center' },
  invoiceCancelText: { fontSize: 15, color: '#636e72', fontWeight: '600' },
  invoiceConfirmBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: ACCENT },
  invoiceConfirmText:{ fontSize: 15, color: '#fff', fontWeight: '700' },
});

export default BookingQueue;
