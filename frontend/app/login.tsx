import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { AuthContext } from '../src/context/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useContext(AuthContext);
  const router = useRouter();

  const handleLogin = async () => {
    if(!email || !password) return Alert.alert('Error', 'Please fill all fields');
    
    try {
      await login(email.toLowerCase(), password);
      router.replace('/'); 
    } catch (error: any) {
      Alert.alert('Login Failed', error?.message || 'Unknown error');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="car-sport" size={48} color="#10ac84" />
      </View>
      <Text style={styles.title}>VehicleRentals</Text>
      <Text style={styles.subtitle}>Sign in to your account</Text>
      
      <View style={styles.inputWrap}>
        <Ionicons name="mail-outline" size={20} color="#b2bec3" style={styles.inputIcon} />
        <TextInput 
          style={styles.input} 
          placeholder="Email Address" 
          placeholderTextColor="#b2bec3"
          keyboardType="email-address" 
          autoCapitalize="none"
          value={email} 
          onChangeText={setEmail} 
        />
      </View>

      <View style={styles.inputWrap}>
        <Ionicons name="lock-closed-outline" size={20} color="#b2bec3" style={styles.inputIcon} />
        <TextInput 
          style={styles.input} 
          placeholder="Password" 
          placeholderTextColor="#b2bec3"
          secureTextEntry={!showPassword} 
          value={password} 
          onChangeText={setPassword} 
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
          <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#b2bec3" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={isLoading} activeOpacity={0.8}>
        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Login Securely</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/register')} style={{marginTop: 20}}>
        <Text style={styles.linkText}>New here? <Text style={styles.linkBold}>Create an Account</Text></Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 25, justifyContent: 'center', backgroundColor: '#fff' },
  iconWrap: { alignSelf: 'center', width: 80, height: 80, borderRadius: 40, backgroundColor: '#f0faf7', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 4, color: '#1a1a2e', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#b2bec3', textAlign: 'center', marginBottom: 30 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#eee' },
  inputIcon: { paddingLeft: 16 },
  input: { flex: 1, padding: 16, fontSize: 16, color: '#1a1a2e' },
  eyeBtn: { padding: 16 },
  btn: { backgroundColor: '#10ac84', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  linkText: { textAlign: 'center', color: '#b2bec3', fontSize: 15 },
  linkBold: { color: '#10ac84', fontWeight: '700' }
});
