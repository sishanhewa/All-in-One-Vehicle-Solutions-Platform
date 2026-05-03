import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { AuthContext } from '../src/context/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const { register, isLoading } = useContext(AuthContext);
  const router = useRouter();

  const handleRegister = async () => {
    if(!name || !email || !password || !phone) return Alert.alert('Error', 'Please fill all required fields');
    
    try {
      await register(name, email.toLowerCase(), password, phone);
      router.replace('/'); 
    } catch (error: any) {
      Alert.alert('Registration Failed', error?.message || 'Unknown error');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="person-add" size={40} color="#10ac84" />
      </View>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Join VehicleRentals today</Text>

      <View style={styles.inputWrap}>
        <Ionicons name="person-outline" size={20} color="#b2bec3" style={styles.inputIcon} />
        <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#b2bec3" value={name} onChangeText={setName} />
      </View>

      <View style={styles.inputWrap}>
        <Ionicons name="call-outline" size={20} color="#b2bec3" style={styles.inputIcon} />
        <TextInput style={styles.input} placeholder="Phone Number" placeholderTextColor="#b2bec3" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      </View>

      <View style={styles.inputWrap}>
        <Ionicons name="mail-outline" size={20} color="#b2bec3" style={styles.inputIcon} />
        <TextInput style={styles.input} placeholder="Email Address" placeholderTextColor="#b2bec3" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
      </View>

      <View style={styles.inputWrap}>
        <Ionicons name="lock-closed-outline" size={20} color="#b2bec3" style={styles.inputIcon} />
        <TextInput style={styles.input} placeholder="Create Password" placeholderTextColor="#b2bec3" secureTextEntry={!showPassword} value={password} onChangeText={setPassword} />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
          <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#b2bec3" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={isLoading} activeOpacity={0.8}>
        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Account</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/login')} style={{marginTop: 20}}>
        <Text style={styles.linkText}>Already have an account? <Text style={styles.linkBold}>Login here</Text></Text>
      </TouchableOpacity>

      <View style={styles.businessSection}>
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Business Accounts</Text>
          <View style={styles.dividerLine} />
        </View>
        
        <View style={styles.businessLinksRow}>
          <TouchableOpacity 
            onPress={() => router.push('/GarageRegister')} 
            style={styles.businessBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="construct" size={18} color="#8e44ad" />
            <Text style={[styles.businessBtnText, {color: '#8e44ad'}]}>Register Garage</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => router.push('/CompanyRegister')} 
            style={styles.businessBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="shield-checkmark" size={18} color="#3498db" />
            <Text style={[styles.businessBtnText, {color: '#3498db'}]}>Register Inspection Co.</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 25, justifyContent: 'center', backgroundColor: '#fff' },
  iconWrap: { alignSelf: 'center', width: 72, height: 72, borderRadius: 36, backgroundColor: '#f0faf7', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 4, color: '#1a1a2e', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#b2bec3', textAlign: 'center', marginBottom: 30 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#eee' },
  inputIcon: { paddingLeft: 16 },
  input: { flex: 1, padding: 16, fontSize: 16, color: '#1a1a2e' },
  eyeBtn: { padding: 16 },
  btn: { backgroundColor: '#10ac84', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  linkText: { textAlign: 'center', color: '#b2bec3', fontSize: 15 },
  linkBold: { color: '#10ac84', fontWeight: '700' },
  businessSection: { marginTop: 35 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#eee' },
  dividerText: { marginHorizontal: 12, color: '#b2bec3', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  businessLinksRow: { flexDirection: 'column', gap: 12 },
  businessBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f9fa', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#eee', gap: 8 },
  businessBtnText: { fontSize: 15, fontWeight: '700' }
});
