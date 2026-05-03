import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { createBookingAPI } from '../api/inspectionApi';
import { AuthContext } from '../context/AuthContext';
import DropDownPicker from 'react-native-dropdown-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather, Ionicons } from '@expo/vector-icons';

const VEHICLE_TYPES = ['Car', 'SUV', 'Van', 'Motorcycle', 'Truck'];
const TIME_SLOTS = ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];

const BookInspection = () => {
  const router = useRouter();
  const { userInfo } = useContext(AuthContext);
  const params = useLocalSearchParams();

  const { packageId, companyId, packageName, packagePrice, packageDuration, companyName } = params;

  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('Car');
  const [vehicleTypeOpen, setVehicleTypeOpen] = useState(false);
  const [vehicleTypeItems, setVehicleTypeItems] = useState(VEHICLE_TYPES.map(v => ({label: v, value: v})));
  const [customerEmail, setCustomerEmail] = useState(userInfo?.email || '');

  const [appointmentDate, setAppointmentDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateObj, setDateObj] = useState(new Date());

  const [appointmentTime, setAppointmentTime] = useState(TIME_SLOTS[2]);
  const [timeOpen, setTimeOpen] = useState(false);
  const [timeItems, setTimeItems] = useState(TIME_SLOTS.map(t => ({label: t, value: t})));

  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDateObj(selectedDate);
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setAppointmentDate(formattedDate);
    }
  };

  useEffect(() => {
    if (!userInfo) {
      Alert.alert('Authentication Required', 'You must log in to book an inspection.');
      router.replace('/login');
    }
  }, [userInfo]);

  const handleSubmit = async () => {
    if (!make || !model || !year || !plateNumber || !appointmentDate || !customerEmail) {
      Alert.alert('Missing Fields', 'Please fill in all vehicle details, email, and select an appointment date.');
      return;
    }

    if (!customerEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address for report delivery.');
      return;
    }

    // Basic date validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(appointmentDate)) {
      Alert.alert('Invalid Date', 'Please enter date in YYYY-MM-DD format (e.g., 2026-04-15)');
      return;
    }

    const selectedDate = new Date(appointmentDate);
    if (selectedDate < new Date()) {
      Alert.alert('Invalid Date', 'Please select a future date for your appointment.');
      return;
    }

    setLoading(true);
    try {
      await createBookingAPI({
        companyId,
        packageId,
        make,
        model,
        year: Number(year),
        plateNumber,
        vehicleType,
        appointmentDate,
        appointmentTime,
        notes,
        customerEmail,
      });
      Alert.alert(
        'Booking Confirmed! 🎉',
        `Your inspection has been booked with ${companyName}. They will confirm your appointment shortly.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert('Booking Failed', error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };


  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.header}>Book Inspection</Text>
      <Text style={styles.subText}>Fill in your vehicle details and select an appointment time</Text>

      {/* Package Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Feather name="package" size={20} color="#e67e22" />
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryLabel}>Package</Text>
            <Text style={styles.summaryValue}>{packageName}</Text>
          </View>
          <Text style={styles.summaryPrice}>Rs. {Number(packagePrice).toLocaleString()}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryMeta}>
          <View style={styles.summaryMetaItem}>
            <Feather name="briefcase" size={14} color="#636e72" />
            <Text style={styles.summaryMetaText}>{companyName}</Text>
          </View>
          <View style={styles.summaryMetaItem}>
            <Ionicons name="time-outline" size={14} color="#636e72" />
            <Text style={styles.summaryMetaText}>{packageDuration} mins</Text>
          </View>
        </View>
      </View>

      {/* Vehicle Information */}
      <Text style={styles.sectionTitle}>Your Vehicle</Text>
      <View style={styles.row}>
        <TextInput style={[styles.input, { flex: 1, marginRight: 8 }]} placeholder="Make (e.g. Toyota)" placeholderTextColor="#b2bec3" value={make} onChangeText={setMake} />
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="Model (e.g. Corolla)" placeholderTextColor="#b2bec3" value={model} onChangeText={setModel} />
      </View>
      <View style={styles.row}>
        <TextInput style={[styles.input, { flex: 1, marginRight: 8 }]} placeholder="Year (e.g. 2021)" placeholderTextColor="#b2bec3" keyboardType="numeric" value={year} onChangeText={setYear} />
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="Plate (e.g. CAB-1234)" placeholderTextColor="#b2bec3" value={plateNumber} onChangeText={setPlateNumber} autoCapitalize="characters" />
      </View>
      <TextInput 
        style={styles.input} 
        placeholder="Delivery Email (where report will be sent)" 
        placeholderTextColor="#b2bec3" 
        keyboardType="email-address" 
        autoCapitalize="none" 
        value={customerEmail} 
        onChangeText={setCustomerEmail} 
      />
      <View style={{ marginBottom: 12, zIndex: 3000 }}>
        <View style={styles.pickerLabelRow}>
          <Ionicons name="car-outline" size={14} color="#636e72" />
          <Text style={styles.pickerLabel}>Vehicle Type</Text>
        </View>
        <DropDownPicker
          open={vehicleTypeOpen}
          value={vehicleType}
          items={vehicleTypeItems}
          setOpen={setVehicleTypeOpen}
          setValue={setVehicleType}
          setItems={setVehicleTypeItems}
          zIndex={3000}
          zIndexInverse={1000}
          listMode="SCROLLVIEW"
          style={styles.dropdown}
          textStyle={styles.dropdownText}
          dropDownContainerStyle={styles.dropdownContainer}
        />
      </View>

      {/* Appointment */}
      <Text style={styles.sectionTitle}>Appointment</Text>
      <TouchableOpacity 
        style={styles.dateInputWrap} 
        onPress={() => setShowDatePicker(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar-outline" size={18} color="#e67e22" />
        <Text style={[styles.dateInput, !appointmentDate && {color: '#b2bec3'}]}>
          {appointmentDate || "Date (YYYY-MM-DD)"}
        </Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={dateObj}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={onDateChange}
        />
      )}

      <View style={{ marginBottom: 12, zIndex: 2000 }}>
        <View style={styles.pickerLabelRow}>
          <Ionicons name="time-outline" size={14} color="#636e72" />
          <Text style={styles.pickerLabel}>Time Slot</Text>
        </View>
        <DropDownPicker
          open={timeOpen}
          value={appointmentTime}
          items={timeItems}
          setOpen={setTimeOpen}
          setValue={setAppointmentTime}
          setItems={setTimeItems}
          zIndex={2000}
          zIndexInverse={2000}
          listMode="SCROLLVIEW"
          style={styles.dropdown}
          textStyle={styles.dropdownText}
          dropDownContainerStyle={styles.dropdownContainer}
        />
      </View>

      {/* Notes */}
      <Text style={styles.sectionTitle}>Additional Notes</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Any special requests or notes for the inspection company (optional)"
        placeholderTextColor="#b2bec3"
        multiline numberOfLines={4}
        value={notes} onChangeText={setNotes}
      />

      {/* Submit */}
      <TouchableOpacity style={styles.submitBtn} activeOpacity={0.85} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : (
          <>
            <Feather name="check-circle" size={18} color="#fff" />
            <Text style={styles.submitBtnText}>Confirm Booking</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  header: { fontSize: 26, fontWeight: '800', color: '#1a1a2e', marginBottom: 4, letterSpacing: -0.3 },
  subText: { fontSize: 14, color: '#b2bec3', marginBottom: 20 },

  summaryCard: { backgroundColor: '#fef9f0', borderRadius: 16, padding: 18, marginBottom: 24, borderWidth: 1, borderColor: '#fde8c8' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  summaryLabel: { fontSize: 11, color: '#b2bec3', textTransform: 'uppercase', fontWeight: '600' },
  summaryValue: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  summaryPrice: { fontSize: 20, fontWeight: '800', color: '#e67e22' },
  summaryDivider: { height: 1, backgroundColor: '#fde8c8', marginVertical: 14 },
  summaryMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryMetaText: { fontSize: 13, color: '#636e72', fontWeight: '600' },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginBottom: 12, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },

  input: { backgroundColor: '#f8f9fa', borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 15, color: '#1a1a2e', borderWidth: 1, borderColor: '#e9ecef' },
  textArea: { height: 100, textAlignVertical: 'top' },

  pickerLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 5 },
  pickerLabel: { fontSize: 12, color: '#636e72', fontWeight: '600' },
  dropdown: { backgroundColor: '#f8f9fa', borderRadius: 12, borderWidth: 1, borderColor: '#e9ecef', height: 48 },
  dropdownText: { fontSize: 15, color: '#1a1a2e' },
  dropdownContainer: { backgroundColor: '#fff', borderColor: '#e9ecef', borderRadius: 12 },

  dateInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f8f9fa', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e9ecef' },
  dateInput: { flex: 1, fontSize: 15, color: '#1a1a2e' },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#e67e22', padding: 18, borderRadius: 14, marginTop: 8, ...Platform.select({ ios: { shadowColor: '#e67e22', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }, android: { elevation: 4 } }) },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});

export default BookInspection;
