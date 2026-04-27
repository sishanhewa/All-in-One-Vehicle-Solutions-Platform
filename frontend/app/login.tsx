import React, { useState, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView, Platform, StatusBar,
} from 'react-native';
import { AuthContext } from '../src/context/AuthContext';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';

const ACCENT = '#8e44ad';

export default function LoginScreen() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const { login, isLoading } = useContext(AuthContext);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      return Alert.alert('Missing Fields', 'Please enter your email and password.');
    }
    try {
      const user = await login(email.trim().toLowerCase(), password);
      // Role-aware redirect after login
      const role = user?.role ?? 'User';
      if (role === 'GarageOwner') {
        router.replace('/ownerDashboard');
      } else if (role === 'Mechanic') {
        router.replace('/myJobs');
      } else if (role === 'Admin') {
        router.replace('/adminDashboard');
      } else {
        router.replace('/');
      }
    } catch (error: any) {
      Alert.alert('Login Failed', error?.message || 'Invalid email or password.');
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
          <Ionicons name="construct" size={36} color="#fff" />
        </View>
        <Text style={styles.heroTitle}>VehicleHub</Text>
        <Text style={styles.heroSub}>Your all-in-one vehicle care platform</Text>
      </View>

      {/* ── Card ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Welcome back</Text>
        <Text style={styles.cardSub}>Sign in to your account</Text>

        {/* Email */}
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>Email Address</Text>
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
          <Text style={styles.fieldLabel}>Password</Text>
          <View style={styles.inputRow}>
            <Feather name="lock" size={16} color="#b2bec3" />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Your password"
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

        {/* Submit */}
        <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={isLoading} activeOpacity={0.85}>
          {isLoading
            ? <ActivityIndicator color="#fff" />
            : <><Feather name="log-in" size={18} color="#fff" /><Text style={styles.btnText}>Sign In</Text></>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/register')} style={styles.linkBtn} activeOpacity={0.7}>
          <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkAccent}>Create one →</Text></Text>
        </TouchableOpacity>
      </View>

      {/* ── Role hints ── */}
      <View style={styles.hintBox}>
        <Text style={styles.hintTitle}>Who can sign in?</Text>
        <View style={styles.hintRow}>
          <Ionicons name="person-outline" size={14} color="#636e72" />
          <Text style={styles.hintText}>Customers — book garages & track repairs</Text>
        </View>
        <View style={styles.hintRow}>
          <Ionicons name="business-outline" size={14} color={ACCENT} />
          <Text style={styles.hintText}>Garage Owners — manage your business</Text>
        </View>
        <View style={styles.hintRow}>
          <Ionicons name="hammer-outline" size={14} color="#f39c12" />
          <Text style={styles.hintText}>Mechanics — view assigned jobs</Text>
        </View>
        <View style={styles.hintRow}>
          <Ionicons name="shield-outline" size={14} color="#e74c3c" />
          <Text style={styles.hintText}>Admins — platform management</Text>
        </View>
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
    paddingBottom: 40,
    paddingHorizontal: 24,
    ...Platform.select({
      ios:     { shadowColor: ACCENT, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16 },
      android: { elevation: 10 },
    }),
  },
  heroIcon: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
  },
  heroTitle: { fontSize: 30, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  heroSub:   { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 4, fontWeight: '500' },

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
  cardTitle: { fontSize: 22, fontWeight: '800', color: '#1a1a2e', marginBottom: 4 },
  cardSub:   { fontSize: 14, color: '#b2bec3', marginBottom: 24 },

  fieldWrap:  { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#636e72', marginBottom: 8 },
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
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  linkBtn:    { marginTop: 18, alignItems: 'center' },
  linkText:   { fontSize: 14, color: '#636e72' },
  linkAccent: { color: ACCENT, fontWeight: '700' },

  hintBox: {
    marginHorizontal: 20, backgroundColor: '#fff',
    borderRadius: 16, padding: 18, gap: 10,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  hintTitle: { fontSize: 12, fontWeight: '700', color: '#b2bec3', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  hintRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hintText:  { fontSize: 13, color: '#636e72' },
});
