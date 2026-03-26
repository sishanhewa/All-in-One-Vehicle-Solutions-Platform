import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { AuthContext } from '../src/context/AuthContext';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useContext(AuthContext);
  const router = useRouter();

  const handleLogin = async () => {
    if(!email || !password) return Alert.alert('Error', 'Please fill all fields');
    
    try {
      await login(email.toLowerCase(), password);
      // Boot them over to the marketplace seamlessly
      router.replace('/'); 
    } catch (error: any) {
      Alert.alert('Login Failed', error?.message || 'Unknown error');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login to Riyasewana Clone</Text>
      
      <TextInput 
        style={styles.input} 
        placeholder="Email Address" 
        keyboardType="email-address" 
        autoCapitalize="none"
        value={email} 
        onChangeText={setEmail} 
      />
      <TextInput 
        style={styles.input} 
        placeholder="Password" 
        secureTextEntry 
        value={password} 
        onChangeText={setPassword} 
      />

      <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={isLoading}>
        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Login Securely</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/register')} style={{marginTop: 20}}>
        <Text style={styles.linkText}>New Seller? Create an Account here.</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 25, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 30, color: '#333', textAlign: 'center' },
  input: { backgroundColor: '#f2f2f2', padding: 18, borderRadius: 10, fontSize: 16, marginBottom: 15 },
  btn: { backgroundColor: '#3498db', padding: 18, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  linkText: { textAlign: 'center', color: '#3498db', fontSize: 16 }
});
