import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, Platform } from 'react-native';
import { AuthContext } from '../src/context/AuthContext';
import { registerCompanyAPI } from '../src/api/inspectionApi';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Feather, Ionicons } from '@expo/vector-icons';

const CITIES = ['Colombo', 'Kandy', 'Gampaha', 'Kurunegala', 'Kalutara', 'Galle', 'Matara', 'Ratnapura', 'Anuradhapura', 'Jaffna', 'Batticaloa', 'Badulla'];

export default function CompanyRegisterScreen() {
  // Account fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  // Company fields
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [operatingHours, setOperatingHours] = useState('Mon-Sat 8:00 AM - 6:00 PM');
  const [website, setWebsite] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 = account, 2 = company
  const router = useRouter();

  const handleNext = () => {
    if (!name || !email || !password || !phone) {
      return Alert.alert('Missing Fields', 'Please fill all account fields before proceeding.');
    }
    if (password.length < 6) {
      return Alert.alert('Weak Password', 'Password must be at least 6 characters.');
    }
    setStep(2);
  };

  const handleRegister = async () => {
    if (!companyName || !selectedCity) {
      return Alert.alert('Missing Fields', 'Company Name and City are required.');
    }

    setIsLoading(true);
    try {
      const resp = await registerCompanyAPI({
        name,
        email: email.toLowerCase(),
        password,
        phone,
        companyName,
        description,
        address,
        city: selectedCity,
        operatingHours,
        website,
      });

      // Save the response to SecureStore to log in the user automatically
      await SecureStore.setItemAsync('userInfo', JSON.stringify(resp));
      await SecureStore.setItemAsync('userToken', resp.token);

      Alert.alert(
        '🎉 Registration Successful!',
        `Welcome, ${companyName}! Your inspection company account has been created. You can now create inspection packages from your dashboard.`,
        [{ text: 'Get Started', onPress: () => router.replace('/') }]
      );
    } catch (error: any) {
      Alert.alert('Registration Failed', error?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: Account Details
  if (step === 1) {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={32} color="#e67e22" />
          </View>
          <Text style={styles.title}>Register Your{'\n'}Inspection Company</Text>
          <Text style={styles.subtitle}>Step 1 of 2 — Account Details</Text>
          
          {/* Progress Bar */}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '50%' }]} />
          </View>
        </View>

        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Account Details</Text>

          <View style={styles.inputWrap}>
            <Feather name="user" size={16} color="#b2bec3" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Full Name (Contact Person)" placeholderTextColor="#b2bec3" value={name} onChangeText={setName} />
          </View>

          <View style={styles.inputWrap}>
            <Feather name="phone" size={16} color="#b2bec3" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Phone Number" placeholderTextColor="#b2bec3" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          </View>

          <View style={styles.inputWrap}>
            <Feather name="mail" size={16} color="#b2bec3" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Email Address" placeholderTextColor="#b2bec3" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
          </View>

          <View style={styles.inputWrap}>
            <Feather name="lock" size={16} color="#b2bec3" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Create Password (min 6 chars)" placeholderTextColor="#b2bec3" secureTextEntry value={password} onChangeText={setPassword} />
          </View>

          <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={handleNext}>
            <Text style={styles.primaryBtnText}>Next — Company Details</Text>
            <Feather name="arrow-right" size={18} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/register')} style={styles.linkRow}>
            <Text style={styles.linkText}>Want a regular account? </Text>
            <Text style={[styles.linkText, { color: '#10ac84', fontWeight: '700' }]}>Register here</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/login')} style={{ marginTop: 8 }}>
            <Text style={styles.linkText}>Already have an account? <Text style={{ color: '#e67e22', fontWeight: '700' }}>Login</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Step 2: Company Details
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.headerSection}>
        <View style={styles.iconCircle}>
          <Ionicons name="business" size={32} color="#e67e22" />
        </View>
        <Text style={styles.title}>Company Information</Text>
        <Text style={styles.subtitle}>Step 2 of 2 — Tell us about your business</Text>

        {/* Progress Bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '100%' }]} />
        </View>
      </View>

      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Company Details</Text>

        <View style={styles.inputWrap}>
          <Feather name="briefcase" size={16} color="#b2bec3" style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="Company Name *" placeholderTextColor="#b2bec3" value={companyName} onChangeText={setCompanyName} />
        </View>

        <View style={[styles.inputWrap, { height: 100, alignItems: 'flex-start', paddingTop: 14 }]}>
          <Feather name="file-text" size={16} color="#b2bec3" style={[styles.inputIcon, { marginTop: 2 }]} />
          <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Description — What services do you offer?" placeholderTextColor="#b2bec3" multiline value={description} onChangeText={setDescription} />
        </View>

        {/* City Selection */}
        <Text style={styles.fieldLabel}>City *</Text>
        <View style={styles.cityGrid}>
          {CITIES.map(city => (
            <TouchableOpacity
              key={city}
              style={[styles.cityChip, selectedCity === city && styles.cityChipActive]}
              activeOpacity={0.7}
              onPress={() => setSelectedCity(city)}
            >
              <Text style={[styles.cityChipText, selectedCity === city && styles.cityChipTextActive]}>{city}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.inputWrap}>
          <Feather name="map-pin" size={16} color="#b2bec3" style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="Full Address" placeholderTextColor="#b2bec3" value={address} onChangeText={setAddress} />
        </View>

        <View style={styles.inputWrap}>
          <Feather name="clock" size={16} color="#b2bec3" style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="Operating Hours" placeholderTextColor="#b2bec3" value={operatingHours} onChangeText={setOperatingHours} />
        </View>

        <View style={styles.inputWrap}>
          <Feather name="globe" size={16} color="#b2bec3" style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="Website (optional)" placeholderTextColor="#b2bec3" autoCapitalize="none" value={website} onChangeText={setWebsite} />
        </View>

        {/* Action Buttons */}
        <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={handleRegister} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#fff" /> : (
            <>
              <Ionicons name="shield-checkmark" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Register Company</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.backBtn} activeOpacity={0.7} onPress={() => setStep(1)}>
          <Feather name="arrow-left" size={16} color="#636e72" />
          <Text style={styles.backBtnText}>Back to Account Details</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, backgroundColor: '#fff' },

  headerSection: { alignItems: 'center', paddingTop: 50, paddingBottom: 24, paddingHorizontal: 30, backgroundColor: '#fff' },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fef9f0', justifyContent: 'center', alignItems: 'center', marginBottom: 16, ...Platform.select({ ios: { shadowColor: '#e67e22', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 }, android: { elevation: 3 } }) },
  title: { fontSize: 26, fontWeight: '800', color: '#1a1a2e', textAlign: 'center', marginBottom: 8, letterSpacing: -0.5, lineHeight: 34 },
  subtitle: { fontSize: 14, color: '#b2bec3', textAlign: 'center' },

  progressBar: { width: '80%', height: 4, backgroundColor: '#f1f3f5', borderRadius: 2, marginTop: 16, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#e67e22', borderRadius: 2 },

  form: { padding: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#636e72', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#636e72', marginBottom: 10 },

  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 14, paddingHorizontal: 14, marginBottom: 14, height: 54, borderWidth: 1, borderColor: '#e9ecef' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#1a1a2e' },

  cityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  cityChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#f1f3f5', borderWidth: 1, borderColor: '#e9ecef' },
  cityChipActive: { backgroundColor: '#fef0e3', borderColor: '#e67e22' },
  cityChipText: { fontSize: 13, color: '#636e72', fontWeight: '600' },
  cityChipTextActive: { color: '#e67e22' },

  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#e67e22', paddingVertical: 16, borderRadius: 14, marginTop: 8, ...Platform.select({ ios: { shadowColor: '#e67e22', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }, android: { elevation: 4 } }) },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 10 },
  backBtnText: { color: '#636e72', fontSize: 15, fontWeight: '600' },

  linkRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  linkText: { textAlign: 'center', color: '#b2bec3', fontSize: 14 },
});
