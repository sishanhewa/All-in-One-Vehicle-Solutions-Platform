import React, { useState, useContext, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather, Ionicons } from '@expo/vector-icons';
import { createRepairBooking, fetchGarageById } from '../api/serviceApi';
import { AuthContext } from '../context/AuthContext';

const ACCENT = '#8e44ad';

const VEHICLE_TYPES = ['Car', 'SUV', 'Van', 'Motorcycle', 'Truck'];
const TIME_SLOTS = [
  '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
];

const normalizeId = (param) => {
  if (param == null) return '';
  return Array.isArray(param) ? param[0] : param;
};

// ─── Sub-components ────────────────────────────────────────────────────────────

const PickerField = ({ label, icon, selectedValue, onValueChange, items }) => (
  <View style={styles.pickerContainer}>
    <View style={styles.pickerLabelRow}>
      <Ionicons name={icon} size={14} color="#636e72" />
      <Text style={styles.pickerLabel}>{label}</Text>
    </View>
    <View style={styles.pickerBox}>
      <Picker
        selectedValue={selectedValue}
        onValueChange={onValueChange}
        style={styles.picker}
        dropdownIconColor="#636e72"
      >
        {items.map((item) => (
          <Picker.Item key={item} label={item} value={item} />
        ))}
      </Picker>
    </View>
  </View>
);

const InputField = ({ label, icon, style, ...props }) => (
  <View style={[styles.inputWrapper, style]}>
    {label ? (
      <View style={styles.inputLabelRow}>
        {icon ? <Ionicons name={icon} size={13} color="#636e72" /> : null}
        <Text style={styles.inputLabel}>{label}</Text>
      </View>
    ) : null}
    <TextInput
      style={styles.input}
      placeholderTextColor="#b2bec3"
      {...props}
    />
  </View>
);

// ─── Main Screen ───────────────────────────────────────────────────────────────

const BookService = () => {
  const router = useRouter();
  const { userInfo } = useContext(AuthContext);
  const params = useLocalSearchParams();

  const garageId = normalizeId(params.garageId);
  const offeringId = normalizeId(params.offeringId);

  // ── Data state ──
  const [garage, setGarage] = useState(null);
  const [offering, setOffering] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // ── Form state ──
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('Car');
  const [dateObj, setDateObj] = useState(new Date());
  const [timeObj, setTimeObj] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Auth guard ──
  useEffect(() => {
    if (!userInfo) {
      Alert.alert('Authentication Required', 'You must log in to book a service.');
      router.replace('/login');
    }
  }, [userInfo]);

  // ── Fetch garage + offering on mount ──
  const load = useCallback(async () => {
    if (!garageId) {
      setFetchError('Missing garage information.');
      setFetching(false);
      return;
    }
    setFetching(true);
    setFetchError(null);
    try {
      const data = await fetchGarageById(garageId);
      const garageData = data.garage ?? null;
      const offerings = Array.isArray(data.offerings) ? data.offerings : [];
      const found = offerings.find((o) => String(o._id) === String(offeringId)) ?? null;
      setGarage(garageData);
      setOffering(found);
      if (!found) setFetchError('Service offering not found.');
    } catch (e) {
      console.error(e);
      setFetchError(e.message || 'Could not load garage details.');
    } finally {
      setFetching(false);
    }
  }, [garageId, offeringId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Validation & submit ──
  const handleSubmit = async () => {
    if (!make.trim() || !model.trim() || !year.trim() || !plateNumber.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all required vehicle fields.');
      return;
    }

    // Validate year is reasonable (1900 to next year)
    const currentYear = new Date().getFullYear();
    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > currentYear + 1) {
      Alert.alert('Invalid Year', `Please enter a valid year between 1900 and ${currentYear + 1}.`);
      return;
    }

    // Validate vehicle type is compatible with the service offering
    if (offering && offering.vehicleTypes && offering.vehicleTypes.length > 0) {
      const compatibleTypes = offering.vehicleTypes;
      if (!compatibleTypes.includes('Any') && !compatibleTypes.includes(vehicleType)) {
        Alert.alert(
          'Vehicle Type Not Supported',
          `This service is only available for: ${compatibleTypes.join(', ')}. Please select a compatible vehicle type or choose a different service.`
        );
        return;
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(dateObj);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      Alert.alert('Invalid Date', 'Please select a future date for your appointment.');
      return;
    }

    // Validate time is in the future for same-day bookings
    if (selectedDate.getTime() === today.getTime()) {
      const now = new Date();
      now.setSeconds(0, 0);
      const selectedTime = new Date(timeObj);
      selectedTime.setSeconds(0, 0);
      // Compare hours and minutes (seconds stripped for accurate comparison)
      if (selectedTime.getHours() < now.getHours() ||
          (selectedTime.getHours() === now.getHours() && selectedTime.getMinutes() <= now.getMinutes())) {
        Alert.alert('Invalid Time', 'Please select a future time for today\'s appointment.');
        return;
      }
    }

    setSubmitting(true);
    try {
      // Format date as YYYY-MM-DD
      const formattedDate = dateObj.toISOString().split('T')[0];
      // Format time as HH:MM AM/PM
      const formattedTime = timeObj.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      await createRepairBooking({
        garageId,
        serviceOfferingIds: [offeringId],
        preferredDate: formattedDate,
        preferredTime: formattedTime,
        vehicleInfo: {
          make: make.trim(),
          model: model.trim(),
          year: Number(year),
          plateNumber: plateNumber.trim().toUpperCase(),
          vehicleType,
        },
        customerNotes: notes.trim(),
      });

      Alert.alert(
        'Booking Confirmed! 🎉',
        'The garage will review your request and confirm your appointment shortly.',
        [{ text: 'OK', onPress: () => router.push('/MyRepairs') }]
      );
    } catch (error) {
      Alert.alert('Booking Failed', error.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading state ──
  if (fetching) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Loading service details...</Text>
      </View>
    );
  }

  // ── Error state ──
  if (fetchError || !garage) {
    return (
      <View style={styles.center}>
        <Feather name="alert-circle" size={48} color="#dfe6e9" />
        <Text style={styles.errorText}>{fetchError || 'Could not load details.'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Feather name="arrow-left" size={16} color="#fff" />
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Main render ──
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Header ── */}
      <TouchableOpacity style={styles.backRow} onPress={() => router.back()} hitSlop={12} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={20} color={ACCENT} />
        <Text style={styles.backRowText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.screenTitle}>Book a Service</Text>
      <Text style={styles.screenSubtitle}>Fill in your vehicle details and select an appointment slot</Text>

      {/* ── Booking Summary Card ── */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryTopRow}>
          <View style={styles.summaryIconWrap}>
            <Feather name="tool" size={20} color={ACCENT} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryGarageName}>{garage.garageName}</Text>
            {garage.city ? (
              <View style={styles.summaryLocationRow}>
                <Ionicons name="location-outline" size={13} color="#636e72" />
                <Text style={styles.summaryLocationText}>{garage.city}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.summaryDivider} />

        {offering ? (
          <View style={styles.summaryServiceRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryServiceLabel}>SERVICE</Text>
              <Text style={styles.summaryServiceName}>{offering.name}</Text>
              {offering.category ? (
                <View style={styles.categoryPill}>
                  <Text style={styles.categoryPillText}>{offering.category}</Text>
                </View>
              ) : null}
              {offering.estimatedDuration ? (
                <View style={styles.durationRow}>
                  <Ionicons name="time-outline" size={13} color="#636e72" />
                  <Text style={styles.durationText}>Est. {offering.estimatedDuration} mins</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.summaryPrice}>
              Rs. {Number(offering.estimatedPrice).toLocaleString()}
            </Text>
          </View>
        ) : (
          <Text style={styles.offeringMissing}>Service details unavailable</Text>
        )}
      </View>

      {/* ── Vehicle Information ── */}
      <Text style={styles.sectionTitle}>Your Vehicle</Text>

      <View style={styles.row}>
        <InputField
          label="Make"
          icon="car-outline"
          style={{ flex: 1, marginRight: 8 }}
          placeholder="e.g. Toyota"
          value={make}
          onChangeText={setMake}
        />
        <InputField
          label="Model"
          icon="cube-outline"
          style={{ flex: 1 }}
          placeholder="e.g. Corolla"
          value={model}
          onChangeText={setModel}
        />
      </View>

      <View style={styles.row}>
        <InputField
          label="Year"
          icon="calendar-outline"
          style={{ flex: 1, marginRight: 8 }}
          placeholder="e.g. 2021"
          keyboardType="numeric"
          value={year}
          onChangeText={setYear}
          maxLength={4}
        />
        <InputField
          label="Plate Number"
          icon="card-outline"
          style={{ flex: 1 }}
          placeholder="e.g. CAB-1234"
          autoCapitalize="characters"
          value={plateNumber}
          onChangeText={(t) => setPlateNumber(t.toUpperCase())}
        />
      </View>

      <PickerField
        label="Vehicle Type"
        icon="car-outline"
        selectedValue={vehicleType}
        onValueChange={setVehicleType}
        items={VEHICLE_TYPES}
      />

      {/* ── Appointment ── */}
      <Text style={styles.sectionTitle}>Appointment</Text>

      <TouchableOpacity 
        style={styles.dateInputWrap} 
        activeOpacity={0.7} 
        onPress={() => setShowDatePicker(true)}
      >
        <Ionicons name="calendar-outline" size={18} color={ACCENT} />
        <Text style={styles.dateInputValue}>
          {dateObj.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
        </Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={dateObj}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={new Date()}
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) setDateObj(selectedDate);
          }}
        />
      )}

      <TouchableOpacity 
        style={styles.dateInputWrap} 
        activeOpacity={0.7} 
        onPress={() => setShowTimePicker(true)}
      >
        <Ionicons name="time-outline" size={18} color={ACCENT} />
        <Text style={styles.dateInputValue}>
          {timeObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
        </Text>
      </TouchableOpacity>

      {showTimePicker && (
        <DateTimePicker
          value={timeObj}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedTime) => {
            setShowTimePicker(false);
            if (selectedTime) setTimeObj(selectedTime);
          }}
        />
      )}

      {/* ── Notes ── */}
      <Text style={styles.sectionTitle}>Additional Notes</Text>
      <TextInput
        style={[styles.input, styles.notesInput]}
        placeholder="Any special requests or notes for the garage (optional)"
        placeholderTextColor="#b2bec3"
        multiline
        numberOfLines={4}
        value={notes}
        onChangeText={setNotes}
        textAlignVertical="top"
      />

      {/* ── Required note ── */}
      <Text style={styles.requiredNote}>* Vehicle Make, Model, Year, Plate Number, and Date are required</Text>

      {/* ── Submit ── */}
      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        activeOpacity={0.85}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Feather name="check-circle" size={19} color="#fff" />
            <Text style={styles.submitBtnText}>Confirm Booking</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  contentContainer: { padding: 20, paddingTop: 16 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 14 },
  loadingText: { marginTop: 10, color: '#b2bec3', fontSize: 14 },
  errorText: { fontSize: 15, color: '#636e72', textAlign: 'center' },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: ACCENT, paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: 20, marginTop: 4,
  },
  backBtnText: { color: '#fff', fontWeight: '600' },

  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14 },
  backRowText: { fontSize: 15, color: ACCENT, fontWeight: '600' },

  screenTitle: { fontSize: 26, fontWeight: '800', color: '#1a1a2e', marginBottom: 4, letterSpacing: -0.3 },
  screenSubtitle: { fontSize: 14, color: '#b2bec3', marginBottom: 22 },

  // ── Summary Card ──
  summaryCard: {
    backgroundColor: '#fdf8ff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 26,
    borderWidth: 1,
    borderColor: '#e8d5f5',
    ...Platform.select({
      ios: { shadowColor: ACCENT, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  summaryTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 2 },
  summaryIconWrap: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: '#f4ecf7',
    justifyContent: 'center', alignItems: 'center',
    marginTop: 2,
  },
  summaryGarageName: { fontSize: 17, fontWeight: '800', color: '#1a1a2e', flexShrink: 1 },
  summaryLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  summaryLocationText: { fontSize: 13, color: '#636e72' },

  summaryDivider: { height: 1, backgroundColor: '#e8d5f5', marginVertical: 14 },

  summaryServiceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  summaryServiceLabel: { fontSize: 10, color: '#b2bec3', fontWeight: '700', letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' },
  summaryServiceName: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 6, flexShrink: 1 },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#f4ecf7',
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 8, marginBottom: 8,
  },
  categoryPillText: { fontSize: 11, fontWeight: '700', color: ACCENT },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  durationText: { fontSize: 13, color: '#636e72' },
  summaryPrice: { fontSize: 22, fontWeight: '800', color: ACCENT, marginTop: 2 },
  offeringMissing: { fontSize: 14, color: '#b2bec3', fontStyle: 'italic' },

  // ── Section ──
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: '#636e72',
    textTransform: 'uppercase', letterSpacing: 0.7,
    marginBottom: 12, marginTop: 6,
  },

  row: { flexDirection: 'row', marginBottom: 0 },

  // ── Input ──
  inputWrapper: { marginBottom: 12 },
  inputLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
  inputLabel: { fontSize: 12, color: '#636e72', fontWeight: '600' },
  input: {
    backgroundColor: '#f8f9fa', borderRadius: 12,
    padding: 14, fontSize: 15, color: '#1a1a2e',
    borderWidth: 1, borderColor: '#e9ecef',
  },
  notesInput: { height: 105, textAlignVertical: 'top', marginBottom: 12 },

  // ── Picker ──
  pickerContainer: { marginBottom: 12 },
  pickerLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
  pickerLabel: { fontSize: 12, color: '#636e72', fontWeight: '600' },
  pickerBox: {
    backgroundColor: '#f8f9fa', borderRadius: 12,
    borderWidth: 1, borderColor: '#e9ecef',
    height: 50, justifyContent: 'center', overflow: 'hidden',
  },
  picker: { height: 50, color: '#1a1a2e' },

  // ── Date ──
  dateInputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#f8f9fa', borderRadius: 12,
    padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#e9ecef',
  },
  dateInputValue: { flex: 1, fontSize: 15, color: '#1a1a2e', fontWeight: '500' },

  // ── Footer ──
  requiredNote: { fontSize: 12, color: '#b2bec3', marginBottom: 18, marginTop: 2 },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: ACCENT, padding: 18, borderRadius: 16, marginTop: 4,
    ...Platform.select({
      ios: { shadowColor: ACCENT, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.35, shadowRadius: 10 },
      android: { elevation: 5 },
    }),
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});

export default BookService;
