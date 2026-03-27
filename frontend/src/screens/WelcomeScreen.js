import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to VMS</Text>
      <Text style={styles.subtitle}>Project Initialized Successfully</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f6fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d3436',
  },
  subtitle: {
    fontSize: 16,
    color: '#636e72',
    marginTop: 8,
  },
});
