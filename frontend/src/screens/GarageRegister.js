import React, { useState, useContext, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Platform, Image, KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Feather, Ionicons } from '@expo/vector-icons';
import { registerGarage } from '../api/serviceApi';
import { AuthContext } from '../context/AuthContext';

const ACCENT      = '#8e44ad';
const TOTAL_STEPS = 2;

// ─── Helpers ───────────────────────────────────────────────────────────────────

const Field = ({
  label, icon, required, hint, error, containerStyle, inputStyle, ...props
}) => (
  <View style={[styles.fieldWrap, containerStyle]}>
    <View style={styles.fieldLabelRow}>
      {icon ? <Feather name={icon} size={13} color="#636e72" /> : null}
      <Text style={styles.fieldLabel}>{label}{required ? <Text style={styles.required}> *</Text> : null}</Text>
    </View>
    <TextInput
      style={[styles.input, error && styles.inputError, inputStyle]}
      placeholderTextColor="#b2bec3"
      {...props}
    />
    {hint  ? <Text style={styles.hint}>{hint}</Text>   : null}
    {error ? <Text style={styles.errorMsg}>{error}</Text> : null}
  </View>
);

const StepDot = ({ step, active, done }) => (
  <View style={[styles.stepDot, done && styles.stepDotDone, active && styles.stepDotActive]}>
    {done
      ? <Ionicons name="checkmark" size={13} color="#fff" />
      : <Text style={[styles.stepDotText, active && { color: '#fff' }]}>{step}</Text>}
  </View>
);

// ─── Main Screen ───────────────────────────────────────────────────────────────

const GarageRegister = () => {
  const router = useRouter();
  const { loginWithToken } = useContext(AuthContext);

  const [step,       setStep]       = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // ── Step 1: Account ──
  const [name,            setName]            = useState('');
  const [email,           setEmail]           = useState('');
  const [phone,           setPhone]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass,        setShowPass]        = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);

  // ── Step 2: Garage ──
  const [garageName,      setGarageName]      = useState('');
  const [city,            setCity]            = useState('');
  const [address,         setAddress]         = useState('');
  const [description,     setDescription]     = useState('');
  const [operatingHours,  setOperatingHours]  = useState('');
  const [website,         setWebsite]         = useState('');
  const [logoUri,         setLogoUri]         = useState(null);
  const [logoFile,        setLogoFile]        = useState(null);

  // ── Errors ──
  const [errors, setErrors] = useState({});

  const scrollRef = useRef(null);

  // ── Logo picker ──
  const pickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setLogoUri(asset.uri);
      setLogoFile(asset);
    }
  };

  // ── Validate step 1 ──
  const validateStep1 = () => {
    const e = {};
    if (!name.trim())               e.name            = 'Full name is required.';
    if (!email.trim())              e.email           = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email    = 'Enter a valid email address.';
    if (!phone.trim())              e.phone           = 'Phone number is required.';
    if (!password)                  e.password        = 'Password is required.';
    else if (password.length < 6)   e.password        = 'Password must be at least 6 characters.';
    if (!confirmPassword)           e.confirmPassword = 'Please confirm your password.';
    else if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Validate step 2 ──
  const validateStep2 = () => {
    const e = {};
    if (!garageName.trim()) e.garageName = 'Garage name is required.';
    if (!city.trim())       e.city       = 'City is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Next step ──
  const handleNext = () => {
    if (!validateStep1()) return;
    setStep(2);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (!validateStep2()) return;

    setSubmitting(true);
    try {
      const fd = new FormData();

      // Account fields
      fd.append('name',     name.trim());
      fd.append('email',    email.trim().toLowerCase());
      fd.append('phone',    phone.trim());
      fd.append('password', password);

      // Garage fields
      fd.append('garageName',     garageName.trim());
      fd.append('city',           city.trim());
      if (address.trim())        fd.append('address',        address.trim());
      if (description.trim())    fd.append('description',    description.trim());
      if (operatingHours.trim()) fd.append('operatingHours', operatingHours.trim());
      if (website.trim())        fd.append('website',        website.trim());

      // Logo
      if (logoFile) {
        const ext = logoFile.uri.split('.').pop() || 'jpg';
        fd.append('logo', {
          uri:  logoFile.uri,
          name: `logo.${ext}`,
          type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        });
      }

      const result = await registerGarage(fd);

      // Build the user payload the same way authController does
      const token = result.token;
      const user  = result.user ?? result;
      const userData = { ...user, token };

      // Commit the session — loginWithToken saves to SecureStore and updates context
      await loginWithToken(userData);

      Alert.alert(
        'Garage Registered! 🎉',
        'Your garage account has been created. Welcome aboard!',
        [{ text: 'Get Started', onPress: () => router.replace('/') }]
      );
    } catch (e) {
      Alert.alert('Registration Failed', e.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step indicator ──
  const StepIndicator = () => (
    <View style={styles.stepIndicator}>
      <StepDot step={1} active={step === 1} done={step > 1} />
      <View style={[styles.stepLine, step > 1 && styles.stepLineDone]} />
      <StepDot step={2} active={step === 2} done={false} />
    </View>
  );

  // ── Step 1 render ──
  const renderStep1 = () => (
    <>
      <Text style={styles.stepTitle}>Account Details</Text>
      <Text style={styles.stepSubtitle}>Create your GarageOwner account credentials</Text>

      <Field
        label="Full Name" icon="user" required
        placeholder="John Smith"
        value={name} onChangeText={setName}
        autoCapitalize="words"
        error={errors.name}
      />
      <Field
        label="Email Address" icon="mail" required
        placeholder="you@example.com"
        value={email} onChangeText={setEmail}
        keyboardType="email-address" autoCapitalize="none"
        error={errors.email}
      />
      <Field
        label="Phone Number" icon="phone" required
        placeholder="+94 77 123 4567"
        value={phone} onChangeText={setPhone}
        keyboardType="phone-pad"
        error={errors.phone}
      />

      {/* Password */}
      <View style={styles.fieldWrap}>
        <View style={styles.fieldLabelRow}>
          <Feather name="lock" size={13} color="#636e72" />
          <Text style={styles.fieldLabel}>Password <Text style={styles.required}>*</Text></Text>
        </View>
        <View style={[styles.passwordWrap, errors.password && styles.inputError]}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Min. 6 characters"
            placeholderTextColor="#b2bec3"
            secureTextEntry={!showPass}
            value={password} onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setShowPass((v) => !v)} hitSlop={8}>
            <Feather name={showPass ? 'eye-off' : 'eye'} size={18} color="#b2bec3" />
          </TouchableOpacity>
        </View>
        {errors.password ? <Text style={styles.errorMsg}>{errors.password}</Text> : null}
      </View>

      {/* Confirm Password */}
      <View style={styles.fieldWrap}>
        <View style={styles.fieldLabelRow}>
          <Feather name="lock" size={13} color="#636e72" />
          <Text style={styles.fieldLabel}>Confirm Password <Text style={styles.required}>*</Text></Text>
        </View>
        <View style={[styles.passwordWrap, errors.confirmPassword && styles.inputError]}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Re-enter password"
            placeholderTextColor="#b2bec3"
            secureTextEntry={!showConfirm}
            value={confirmPassword} onChangeText={setConfirmPassword}
          />
          <TouchableOpacity onPress={() => setShowConfirm((v) => !v)} hitSlop={8}>
            <Feather name={showConfirm ? 'eye-off' : 'eye'} size={18} color="#b2bec3" />
          </TouchableOpacity>
        </View>
        {errors.confirmPassword ? <Text style={styles.errorMsg}>{errors.confirmPassword}</Text> : null}
      </View>

      <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={handleNext}>
        <Text style={styles.primaryBtnText}>Continue</Text>
        <Feather name="arrow-right" size={18} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.loginLink} onPress={() => router.back()} activeOpacity={0.7}>
        <Text style={styles.loginLinkText}>Already have an account? <Text style={{ color: ACCENT, fontWeight: '700' }}>Sign In</Text></Text>
      </TouchableOpacity>
    </>
  );

  // ── Step 2 render ──
  const renderStep2 = () => (
    <>
      <Text style={styles.stepTitle}>Garage Details</Text>
      <Text style={styles.stepSubtitle}>Tell customers about your garage</Text>

      <Field
        label="Garage Name" icon="tool" required
        placeholder="e.g. City Auto Repairs"
        value={garageName} onChangeText={setGarageName}
        error={errors.garageName}
      />
      <Field
        label="City" icon="map-pin" required
        placeholder="e.g. Colombo"
        value={city} onChangeText={setCity}
        error={errors.city}
      />
      <Field
        label="Address" icon="home"
        placeholder="Street address (optional)"
        value={address} onChangeText={setAddress}
      />
      <Field
        label="Description" icon="file-text"
        placeholder="Brief description of your services..."
        value={description} onChangeText={setDescription}
        multiline numberOfLines={4}
        inputStyle={styles.textArea}
      />
      <Field
        label="Operating Hours" icon="clock"
        placeholder="e.g. Mon–Fri 8:00 AM – 6:00 PM"
        value={operatingHours} onChangeText={setOperatingHours}
        hint="Let customers know when you're open"
      />
      <Field
        label="Website" icon="globe"
        placeholder="https://yourgarage.com (optional)"
        value={website} onChangeText={setWebsite}
        keyboardType="url" autoCapitalize="none"
      />

      {/* Logo picker */}
      <View style={styles.fieldWrap}>
        <View style={styles.fieldLabelRow}>
          <Feather name="image" size={13} color="#636e72" />
          <Text style={styles.fieldLabel}>Garage Logo <Text style={styles.optional}>(Optional)</Text></Text>
        </View>
        <TouchableOpacity style={styles.logoPicker} onPress={pickLogo} activeOpacity={0.8}>
          {logoUri ? (
            <Image source={{ uri: logoUri }} style={styles.logoPreview} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Feather name="camera" size={28} color="#b2bec3" />
              <Text style={styles.logoPlaceholderText}>Tap to upload logo</Text>
            </View>
          )}
        </TouchableOpacity>
        {logoUri && (
          <TouchableOpacity onPress={() => { setLogoUri(null); setLogoFile(null); }} style={styles.removeLogoBtn}>
            <Feather name="x" size={14} color="#e74c3c" />
            <Text style={styles.removeLogoText}>Remove logo</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
        activeOpacity={0.85}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Feather name="check-circle" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Register Garage</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.backStepBtn} onPress={() => { setStep(1); setErrors({}); }} activeOpacity={0.7}>
        <Feather name="arrow-left" size={15} color={ACCENT} />
        <Text style={styles.backStepText}>Back to Account Details</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <Ionicons name="construct" size={28} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Register Your Garage</Text>
          <Text style={styles.headerSubtitle}>
            Step {step} of {TOTAL_STEPS}
          </Text>
        </View>

        {/* ── Step indicator ── */}
        <StepIndicator />

        {/* ── Form ── */}
        <View style={styles.form}>
          {step === 1 ? renderStep1() : renderStep2()}
        </View>

        <View style={{ height: 40 }} />
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
  container:        { flex: 1, backgroundColor: '#f8f9fa' },
  contentContainer: { paddingBottom: 20 },

  // ── Header ──
  header: {
    backgroundColor: ACCENT, paddingTop: 60, paddingBottom: 36,
    paddingHorizontal: 24, alignItems: 'center',
    ...Platform.select({
      ios:     { shadowColor: ACCENT, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14 },
      android: { elevation: 8 },
    }),
  },
  logoWrap: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  headerTitle:    { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  // ── Step indicator ──
  stepIndicator: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 22, gap: 0,
  },
  stepDot: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#e9ecef',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#e9ecef',
  },
  stepDotActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  stepDotDone:   { backgroundColor: '#10ac84', borderColor: '#10ac84' },
  stepDotText:   { fontSize: 14, fontWeight: '700', color: '#b2bec3' },
  stepLine:      { flex: 0, width: 60, height: 2, backgroundColor: '#e9ecef' },
  stepLineDone:  { backgroundColor: '#10ac84' },

  // ── Form container ──
  form: {
    marginHorizontal: 16,
    backgroundColor: '#fff', borderRadius: 20,
    padding: 24, ...cardShadow,
  },
  stepTitle:    { fontSize: 20, fontWeight: '800', color: '#1a1a2e', marginBottom: 4 },
  stepSubtitle: { fontSize: 13, color: '#b2bec3', marginBottom: 22 },

  // ── Fields ──
  fieldWrap:     { marginBottom: 16 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  fieldLabel:    { fontSize: 13, color: '#4a4a4a', fontWeight: '600' },
  required:      { color: '#e74c3c' },
  optional:      { color: '#b2bec3', fontWeight: '400' },
  hint:          { fontSize: 11, color: '#b2bec3', marginTop: 5 },
  errorMsg:      { fontSize: 11, color: '#e74c3c', marginTop: 5, fontWeight: '600' },

  input: {
    backgroundColor: '#f8f9fa', borderRadius: 12,
    padding: 14, fontSize: 15, color: '#1a1a2e',
    borderWidth: 1, borderColor: '#e9ecef',
  },
  inputError: { borderColor: '#e74c3c', backgroundColor: '#fff8f8' },
  textArea:   { height: 100, textAlignVertical: 'top' },

  passwordWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8f9fa', borderRadius: 12,
    borderWidth: 1, borderColor: '#e9ecef',
    paddingHorizontal: 14,
  },
  passwordInput: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#1a1a2e' },

  // ── Logo ──
  logoPicker: {
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 2, borderColor: '#e9ecef', borderStyle: 'dashed',
  },
  logoPreview: { width: '100%', height: 160, resizeMode: 'cover' },
  logoPlaceholder: {
    height: 130, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#f8f9fa', gap: 10,
  },
  logoPlaceholderText: { fontSize: 14, color: '#b2bec3' },
  removeLogoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8, alignSelf: 'flex-end',
  },
  removeLogoText: { fontSize: 13, color: '#e74c3c', fontWeight: '600' },

  // ── Buttons ──
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: ACCENT, padding: 18, borderRadius: 14, marginTop: 8,
    ...Platform.select({
      ios:     { shadowColor: ACCENT, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.35, shadowRadius: 10 },
      android: { elevation: 5 },
    }),
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText:     { color: '#fff', fontSize: 17, fontWeight: '700' },

  backStepBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 14,
  },
  backStepText: { fontSize: 14, color: ACCENT, fontWeight: '600' },

  loginLink:     { alignItems: 'center', marginTop: 20 },
  loginLinkText: { fontSize: 14, color: '#636e72' },
});

export default GarageRegister;
