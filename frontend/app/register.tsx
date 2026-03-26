import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { AuthContext } from '../src/context/AuthContext';
import { useRouter } from 'expo-router';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  const { register, isLoading } = useContext(AuthContext);
  const router = useRouter();

  const handleRegister = async () => {
    if(!name || !email || !password || !phone) return Alert.alert('Error', 'Please fill all required profile fields');
    
    try {
      await register(name, email.toLowerCase(), password, phone);
      // Immediately dive into the marketplace as a verified Seller
      router.replace('/'); 
    } catch (error: any) {
      Alert.alert('Registration Failed', error?.message || 'Unknown error');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Join Marketplace</Text>
      
      <TextInput style={styles.input} placeholder="Full Name" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Phone Number (Important)" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      <TextInput style={styles.input} placeholder="Email Address" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Create Password" secureTextEntry value={password} onChangeText={setPassword} />

      <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={isLoading}>
        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Register New Account</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/login')} style={{marginTop: 20}}>
        <Text style={styles.linkText}>Already have an account? Login here.</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/CompanyRegister')} style={{marginTop: 16, paddingVertical: 12, paddingHorizontal: 20, borderWidth: 2, borderColor: '#e67e22', borderRadius: 10, alignItems: 'center'}}>
        <Text style={{color: '#e67e22', fontSize: 14, fontWeight: '700'}}>🏢 Register as Inspection Company</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 25, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 30, color: '#333', textAlign: 'center' },
  input: { backgroundColor: '#f2f2f2', padding: 18, borderRadius: 10, fontSize: 16, marginBottom: 15 },
  btn: { backgroundColor: '#2ecc71', padding: 18, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  linkText: { textAlign: 'center', color: '#2ecc71', fontSize: 16 }
});
