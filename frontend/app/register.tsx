import React, { useState, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView, Platform, StatusBar,
} from 'react-native';
import { AuthContext } from '../src/context/AuthContext';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';

const ACCENT = '#8e44ad';

export default function RegisterScreen() {
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const { register, isLoading } = useContext(AuthContext);
  const router = useRouter();

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password || !phone.trim()) {
      return Alert.alert('Missing Fields', 'Please fill in all required fields.');
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return Alert.alert('Invalid Email', 'Please enter a valid email address.');
    }
    if (password.length < 6) {
      return Alert.alert('Weak Password', 'Password must be at least 6 characters.');
    }
    try {
      await register(name.trim(), email.trim().toLowerCase(), password, phone.trim());
      router.replace('/');
    } catch (error: any) {
      Alert.alert('Registration Failed', error?.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="light-content" backgroundColor={ACCENT} />

      {/* ── Hero ── */}
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="person-add" size={32} color="#fff" />
        </View>
        <Text style={styles.heroTitle}>Create Account</Text>
        <Text style={styles.heroSub}>Join VehicleHub as a Customer</Text>
      </View>

      {/* ── Customer Registration Form ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Customer Account</Text>
        <Text style={styles.cardSub}>Book garages, track repairs, and leave reviews</Text>

        {/* Name */}
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>Full Name *</Text>
          <View style={styles.inputRow}>
            <Feather name="user" size={16} color="#b2bec3" />
            <TextInput
              style={styles.input}
              placeholder="John Smith"
              placeholderTextColor="#b2bec3"
              autoCapitalize="words"
              value={name}
              onChangeText={setName}
            />
          </View>
        </View>

        {/* Phone */}
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>Phone Number *</Text>
          <View style={styles.inputRow}>
            <Feather name="phone" size={16} color="#b2bec3" />
            <TextInput
              style={styles.input}
              placeholder="+94 77 123 4567"
              placeholderTextColor="#b2bec3"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>
        </View>

        {/* Email */}
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>Email Address *</Text>
          <View style={styles.inputRow}>
            <Feather name="mail" size={16} color="#b2bec3" />
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#b2bec3"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
        </View>

        {/* Password */}
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>Password *</Text>
          <View style={styles.inputRow}>
            <Feather name="lock" size={16} color="#b2bec3" />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Min. 6 characters"
              placeholderTextColor="#b2bec3"
              secureTextEntry={!showPass}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPass(v => !v)} hitSlop={8}>
              <Feather name={showPass ? 'eye-off' : 'eye'} size={18} color="#b2bec3" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={isLoading} activeOpacity={0.85}>
          {isLoading
            ? <ActivityIndicator color="#fff" />
            : <><Feather name="user-plus" size={18} color="#fff" /><Text style={styles.btnText}>Create Customer Account</Text></>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/login')} style={styles.linkBtn} activeOpacity={0.7}>
          <Text style={styles.linkText}>Already have an account? <Text style={styles.linkAccent}>Sign in →</Text></Text>
        </TouchableOpacity>
      </View>

      {/* ── Divider ── */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>Are you a business?</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* ── Garage Owner Path ── */}
      <TouchableOpacity
        style={styles.altCard}
        activeOpacity={0.8}
        onPress={() => router.push('/GarageRegister')}
      >
        <View style={[styles.altIconWrap, { backgroundColor: '#f4ecf7' }]}>
          <Ionicons name="business" size={26} color={ACCENT} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.altTitle}>Register as Garage Owner</Text>
          <Text style={styles.altSub}>Set up your garage, manage services and bookings</Text>
        </View>
        <Feather name="chevron-right" size={20} color="#dfe6e9" />
      </TouchableOpacity>

      {/* ── Mechanic Note ── */}
      <View style={styles.noteBox}>
        <Feather name="info" size={14} color="#3498db" />
        <Text style={styles.noteText}>
          <Text style={{ fontWeight: '700' }}>Are you a mechanic?</Text> Mechanic accounts are created by garage owners — contact your employer to be added to their team.
        </Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#f8f9fa' },

  hero: {
    backgroundColor: ACCENT,
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 36,
    paddingHorizontal: 24,
    ...Platform.select({
      ios:     { shadowColor: ACCENT, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16 },
      android: { elevation: 10 },
    }),
  },
  heroIcon: {
    width: 68, height: 68, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  heroTitle: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -0.3 },
  heroSub:   { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 4 },

  card: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 20,
    padding: 24,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16 },
      android: { elevation: 4 },
    }),
  },
  cardTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a2e', marginBottom: 4 },
  cardSub:   { fontSize: 13, color: '#b2bec3', marginBottom: 22 },

  fieldWrap:  { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#636e72', marginBottom: 7 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#f8f9fa', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: '#e9ecef',
  },
  input: { flex: 1, fontSize: 15, color: '#1a1a2e' },

  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: ACCENT, paddingVertical: 16, borderRadius: 14,
    marginTop: 8,
    ...Platform.select({
      ios:     { shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  btnText:    { color: '#fff', fontSize: 16, fontWeight: '700' },
  linkBtn:    { marginTop: 18, alignItems: 'center' },
  linkText:   { fontSize: 14, color: '#636e72' },
  linkAccent: { color: ACCENT, fontWeight: '700' },

  dividerRow:  { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginVertical: 4, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e9ecef' },
  dividerText: { fontSize: 12, color: '#b2bec3', fontWeight: '600' },

  altCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', margin: 20, marginTop: 12,
    borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: '#e8d5f5',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  altIconWrap: { width: 50, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  altTitle:    { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginBottom: 3 },
  altSub:      { fontSize: 12, color: '#b2bec3', lineHeight: 17 },

  noteBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#eef6ff', marginHorizontal: 20, marginTop: 4,
    borderRadius: 12, padding: 14,
  },
  noteText: { flex: 1, fontSize: 13, color: '#636e72', lineHeight: 19 },
});
