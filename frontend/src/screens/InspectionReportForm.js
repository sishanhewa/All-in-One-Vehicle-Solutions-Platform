import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';

const API_URL = 'https://all-in-one-vehicle-solutions-platform.onrender.com/api';

const STATUS_OPTIONS = [
  { value: 'checked', label: '✓', title: 'Checked', color: '#2ecc71' },
  { value: 'problem', label: 'X', title: 'Problem', color: '#e74c3c' },
  { value: 'adjusted', label: 'A', title: 'Adjusted', color: '#3498db' },
  { value: 'clean', label: 'C', title: 'Clean', color: '#1abc9c' },
  { value: 'replace', label: 'R', title: 'Replace', color: '#e67e22' },
  { value: 'na', label: '-', title: 'N/A', color: '#95a5a6' },
];

const INITIAL_REPORT = {
  reportNumber: '',
  inspectionDateTime: new Date().toISOString(),
  vehiclePowerSystem: 'Non-Hybrid',
  registrationNo: '',
  meterReading: '',
  
  engineOn: {
    lightsAndIndicators: 'na', horn: 'na', windshieldWashersWipers: 'na',
    steeringFreePlay: 'na', brakeClutchPedal: 'na', parkingBrakeLevel: 'na',
    sideMirrorOperation: 'na', powerWindowsOperation: 'na', seatBeltOperation: 'na',
    powerSteeringFluidEPS: 'na', engineNoise: 'na'
  },
  engineOff: {
    engineOilLevelCheck: 'na', brakeFluid: 'na', clutchFluid: 'na',
    windscreenWasherFluid: 'na', engineCoolant: 'na', inverterCoolant: 'na',
    driveBelts: 'na', auxBatteryCondition: 'na', acFilter: 'na',
    airFilter: 'na', hvBatteryAirFilter: 'na', evBlower: 'na'
  },
  mechanical: {
    wheelBearing: 'na', steeringKnuckleLinkage: 'na', frontBrakes: 'na',
    rearBrakes: 'na', tyreCondition: 'na', oilDrain: 'na',
    engineOilFilter: 'na', transmissionFluid: 'na', transferCaseOil: 'na',
    differentialOil: 'na', greasePoints: 'na'
  },
  suspensionWheelsExhaust: {
    linkBushesStabilizer: 'na', ballJoints: 'na', bushesAndMounts: 'na',
    shockAbsorbers: 'na', wheelRotation: 'na', oilFluidLeakage: 'na',
    tyrePressureSpare: 'na', driveShaftJackBoots: 'na', exhaustHangers: 'na',
    fillEngineOilCheckLevel: 'na', torqueWheelNuts: 'na'
  },
  serviceOptions: {
    fullService: false, oilChange: false, interior: false
  },
  remarks: ''
};

export default function InspectionReportForm() {
  const { bookingId, token, bookingData } = useLocalSearchParams();
  const router = useRouter();
  
  const [report, setReport] = useState(INITIAL_REPORT);
  const [inspectionResult, setInspectionResult] = useState('Pass'); // Pass, Fail, Conditional
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (bookingData) {
      try {
        const parsed = JSON.parse(bookingData);
        if (parsed.vehicleInfo?.plateNumber) {
          setReport(prev => ({ ...prev, registrationNo: parsed.vehicleInfo.plateNumber }));
        }
      } catch (e) {
        console.error('Failed to parse booking data', e);
      }
    }
  }, [bookingData]);

  const handleUpdateSection = (section, key, value) => {
    setReport(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const handleTextChange = (field, value) => {
    setReport(prev => ({ ...prev, [field]: value }));
  };

  const toggleServiceOption = (opt) => {
    setReport(prev => ({
      ...prev,
      serviceOptions: {
        ...prev.serviceOptions,
        [opt]: !prev.serviceOptions[opt]
      }
    }));
  };

  const handleSubmit = async () => {
    if (!report.reportNumber || !report.registrationNo) {
      Alert.alert('Error', 'Please fill in the Report Number and Registration No.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/inspection/bookings/${bookingId}/complete`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          inspectionResult,
          inspectionReport: JSON.stringify(report)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit report');

      Alert.alert('Success', 'Inspection report submitted successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const StatusRow = ({ section, itemKey, label }) => {
    const currentValue = report[section][itemKey];
    return (
      <View style={styles.statusRow}>
        <Text style={styles.itemLabel}>{label}</Text>
        <View style={styles.optionsRow}>
          {STATUS_OPTIONS.map(opt => {
            const isSelected = currentValue === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.statusBtn, isSelected && { backgroundColor: opt.color, borderColor: opt.color }]}
                onPress={() => handleUpdateSection(section, itemKey, opt.value)}
              >
                <Text style={[styles.statusBtnText, isSelected && { color: '#fff' }]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const SectionHeader = ({ title }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        
        {/* Basic Info */}
        <View style={styles.card}>
          <SectionHeader title="Vehicle Identification Details" />
          
          <Text style={styles.inputLabel}>Report Number *</Text>
          <TextInput style={styles.input} value={report.reportNumber} onChangeText={(t) => handleTextChange('reportNumber', t)} placeholder="e.g. 107620" />

          <Text style={styles.inputLabel}>Registration No *</Text>
          <TextInput style={styles.input} value={report.registrationNo} onChangeText={(t) => handleTextChange('registrationNo', t)} placeholder="e.g. JK 0492" />

          <Text style={styles.inputLabel}>Meter Reading</Text>
          <TextInput style={styles.input} value={report.meterReading} onChangeText={(t) => handleTextChange('meterReading', t)} placeholder="e.g. 191796 km" />

          <Text style={styles.inputLabel}>Vehicle Power System</Text>
          <View style={styles.radioRow}>
            {['Hybrid', 'Non-Hybrid', 'Electric'].map(sys => (
              <TouchableOpacity key={sys} style={styles.radioBtn} onPress={() => handleTextChange('vehiclePowerSystem', sys)}>
                <View style={[styles.radioOuter, report.vehiclePowerSystem === sys && styles.radioOuterActive]}>
                  {report.vehiclePowerSystem === sys && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.radioText}>{sys}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legendCard}>
          <Text style={styles.legendTitle}>Legend</Text>
          <View style={styles.legendRow}>
            {STATUS_OPTIONS.map(opt => (
              <View key={opt.value} style={styles.legendItem}>
                <View style={[styles.legendBox, { backgroundColor: opt.color }]}>
                  <Text style={styles.legendBoxText}>{opt.label}</Text>
                </View>
                <Text style={styles.legendItemText}>{opt.title}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Engine ON */}
        <View style={styles.card}>
          <SectionHeader title="A. Engine ON" />
          <StatusRow section="engineOn" itemKey="lightsAndIndicators" label="Lights and indicators" />
          <StatusRow section="engineOn" itemKey="horn" label="Horn" />
          <StatusRow section="engineOn" itemKey="windshieldWashersWipers" label="Windshield washers/wipers" />
          <StatusRow section="engineOn" itemKey="steeringFreePlay" label="Steering free play" />
          <StatusRow section="engineOn" itemKey="brakeClutchPedal" label="Brake / Clutch pedal operation" />
          <StatusRow section="engineOn" itemKey="parkingBrakeLevel" label="Parking brake level" />
          <StatusRow section="engineOn" itemKey="sideMirrorOperation" label="Side mirror operation" />
          <StatusRow section="engineOn" itemKey="powerWindowsOperation" label="Power windows operation" />
          <StatusRow section="engineOn" itemKey="seatBeltOperation" label="Seat belt operation" />
          <StatusRow section="engineOn" itemKey="powerSteeringFluidEPS" label="Power Steering Fluid / EPS" />
          <StatusRow section="engineOn" itemKey="engineNoise" label="Engine Noise" />
        </View>

        {/* Engine OFF */}
        <View style={styles.card}>
          <SectionHeader title="B. Engine OFF" />
          <StatusRow section="engineOff" itemKey="engineOilLevelCheck" label="Engine Oil level check" />
          <StatusRow section="engineOff" itemKey="brakeFluid" label="Brake fluid" />
          <StatusRow section="engineOff" itemKey="clutchFluid" label="Clutch fluid (if required)" />
          <StatusRow section="engineOff" itemKey="windscreenWasherFluid" label="Windscreen Washer Fluid" />
          <StatusRow section="engineOff" itemKey="engineCoolant" label="Engine Coolant" />
          <StatusRow section="engineOff" itemKey="inverterCoolant" label="Inverter Coolant" />
          <StatusRow section="engineOff" itemKey="driveBelts" label="Drive belts" />
          <StatusRow section="engineOff" itemKey="auxBatteryCondition" label="Aux battery Condition" />
          <StatusRow section="engineOff" itemKey="acFilter" label="AC Filter" />
          <StatusRow section="engineOff" itemKey="airFilter" label="Air Filter" />
          <StatusRow section="engineOff" itemKey="hvBatteryAirFilter" label="HV Battery air Filter" />
          <StatusRow section="engineOff" itemKey="evBlower" label="EV Blower" />
        </View>

        {/* Mechanical */}
        <View style={styles.card}>
          <SectionHeader title="C. Mechanical / Undercarriage" />
          <StatusRow section="mechanical" itemKey="wheelBearing" label="Wheel Bearing" />
          <StatusRow section="mechanical" itemKey="steeringKnuckleLinkage" label="Steering Knuckle & linkage" />
          <StatusRow section="mechanical" itemKey="frontBrakes" label="Front brakes" />
          <StatusRow section="mechanical" itemKey="rearBrakes" label="Rear brakes" />
          <StatusRow section="mechanical" itemKey="tyreCondition" label="Tyre Condition" />
          <StatusRow section="mechanical" itemKey="oilDrain" label="Oil drain" />
          <StatusRow section="mechanical" itemKey="engineOilFilter" label="Engine oil Filter" />
          <StatusRow section="mechanical" itemKey="transmissionFluid" label="Transmission Fluid" />
          <StatusRow section="mechanical" itemKey="transferCaseOil" label="Transfer case Oil" />
          <StatusRow section="mechanical" itemKey="differentialOil" label="Differential Oil" />
          <StatusRow section="mechanical" itemKey="greasePoints" label="Grease Points" />
        </View>

        {/* Suspension */}
        <View style={styles.card}>
          <SectionHeader title="D. Suspension / Wheels / Exhaust" />
          <StatusRow section="suspensionWheelsExhaust" itemKey="linkBushesStabilizer" label="Link / Bushes stabilizer" />
          <StatusRow section="suspensionWheelsExhaust" itemKey="ballJoints" label="Ball Joints" />
          <StatusRow section="suspensionWheelsExhaust" itemKey="bushesAndMounts" label="Bushes and Mounts" />
          <StatusRow section="suspensionWheelsExhaust" itemKey="shockAbsorbers" label="Shock absorbers" />
          <StatusRow section="suspensionWheelsExhaust" itemKey="wheelRotation" label="Wheel rotation" />
          <StatusRow section="suspensionWheelsExhaust" itemKey="oilFluidLeakage" label="Oil Fluid leakage" />
          <StatusRow section="suspensionWheelsExhaust" itemKey="tyrePressureSpare" label="Tyre Pressure + Spare Wheel" />
          <StatusRow section="suspensionWheelsExhaust" itemKey="driveShaftJackBoots" label="Drive Shaft / rackboots" />
          <StatusRow section="suspensionWheelsExhaust" itemKey="exhaustHangers" label="Exhaust hangers" />
          <StatusRow section="suspensionWheelsExhaust" itemKey="fillEngineOilCheckLevel" label="Fill engine oil check level" />
          <StatusRow section="suspensionWheelsExhaust" itemKey="torqueWheelNuts" label="Torque Wheel Nuts" />
        </View>

        {/* Service Options */}
        <View style={styles.card}>
          <SectionHeader title="Service Options Completed" />
          <View style={styles.serviceRow}>
            {Object.keys(report.serviceOptions).map(opt => (
              <TouchableOpacity key={opt} style={styles.checkboxRow} onPress={() => toggleServiceOption(opt)}>
                <View style={[styles.checkbox, report.serviceOptions[opt] && styles.checkboxActive]}>
                  {report.serviceOptions[opt] && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <Text style={styles.checkboxLabel}>{opt.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Remarks & Final Verdict */}
        <View style={styles.card}>
          <SectionHeader title="Final Remarks & Result" />
          
          <Text style={styles.inputLabel}>Remarks / Issues Found</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={report.remarks}
            onChangeText={(t) => handleTextChange('remarks', t)}
            placeholder="E.g. Need to replace steering rack..."
            multiline
            numberOfLines={4}
          />

          <Text style={styles.inputLabel}>Final Inspection Result *</Text>
          <View style={styles.radioRow}>
            {['Pass', 'Fail', 'Conditional'].map(res => (
              <TouchableOpacity key={res} style={styles.radioBtn} onPress={() => setInspectionResult(res)}>
                <View style={[styles.radioOuter, inspectionResult === res && styles.radioOuterActive]}>
                  {inspectionResult === res && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.radioText}>{res}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]} 
          onPress={handleSubmit} 
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : (
            <>
              <Feather name="check-circle" size={20} color="#fff" />
              <Text style={styles.submitBtnText}>Submit Inspection Report</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  content: { padding: 16, paddingBottom: 40 },
  
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  sectionHeader: { borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e' },
  
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#34495e', marginBottom: 8, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#dfe6e9', borderRadius: 8, padding: 12, fontSize: 15, backgroundColor: '#f8f9fa' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  
  radioRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 8 },
  radioBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#bdc3c7', justifyContent: 'center', alignItems: 'center' },
  radioOuterActive: { borderColor: '#10ac84' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10ac84' },
  radioText: { fontSize: 15, color: '#2d3436' },
  
  legendCard: { backgroundColor: '#2d3436', borderRadius: 12, padding: 16, marginBottom: 16 },
  legendTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 10 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '30%' },
  legendBox: { width: 24, height: 24, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  legendBoxText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  legendItemText: { color: '#dfe6e9', fontSize: 11 },
  
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f2f6' },
  itemLabel: { flex: 1, fontSize: 13, color: '#2d3436', paddingRight: 10 },
  optionsRow: { flexDirection: 'row', gap: 4 },
  statusBtn: { width: 28, height: 28, borderRadius: 6, borderWidth: 1, borderColor: '#dfe6e9', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  statusBtnText: { fontSize: 12, fontWeight: 'bold', color: '#636e72' },
  
  serviceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#dfe6e9', justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: '#10ac84', borderColor: '#10ac84' },
  checkboxLabel: { fontSize: 14, color: '#2d3436' },
  
  submitBtn: { backgroundColor: '#10ac84', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 12, marginTop: 10 },
  submitBtnDisabled: { backgroundColor: '#78e08f' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
