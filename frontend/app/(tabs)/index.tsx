import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView 
        style={[styles.container, { paddingTop: insets.top }]} 
        contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Text style={styles.appName}>Vehicle<Text style={styles.appNameAccent}>Hub</Text></Text>
        <Text style={styles.tagline}>Everything your vehicle needs, in one place.</Text>
      </View>

      <View style={styles.featureGrid}>
        {/* Spare Parts Card */}
        <TouchableOpacity 
          style={[styles.card, { backgroundColor: '#f0faf7' }]} 
          activeOpacity={0.8}
          onPress={() => router.push('/spareParts')}
        >
          <View style={[styles.iconWrap, { backgroundColor: '#10ac84' }]}>
            <Ionicons name="construct" size={28} color="#fff" />
          </View>
          <Text style={styles.cardTitle}>Spare Parts</Text>
          <Text style={styles.cardDesc}>Browse and buy quality spare parts and compatibility items.</Text>
          <View style={styles.cardFooter}>
             <Text style={[styles.cardAction, { color: '#10ac84' }]}>Explore Parts</Text>
        {/* Marketplace Card */}
        <TouchableOpacity 
          style={[styles.card, { backgroundColor: '#e8f8f5' }]} 
          activeOpacity={0.8}
          onPress={() => router.push('/marketplace')}
        >
          <View style={[styles.iconWrap, { backgroundColor: '#10ac84' }]}>
            <Ionicons name="cart" size={28} color="#fff" />
          </View>
          <Text style={styles.cardTitle}>Marketplace</Text>
          <Text style={styles.cardDesc}>Browse and buy quality vehicles from trusted sellers.</Text>
          <View style={styles.cardFooter}>
             <Text style={[styles.cardAction, { color: '#10ac84' }]}>Explore Listings</Text>
             <Feather name="arrow-right" size={16} color="#10ac84" />
          </View>
        </TouchableOpacity>

        {/* Inspections Card */}
        <TouchableOpacity 
          style={[styles.card, { backgroundColor: '#fef0e3' }]} 
          activeOpacity={0.8}
          onPress={() => router.push('/inspections')}
        >
          <View style={[styles.iconWrap, { backgroundColor: '#e67e22' }]}>
            <Ionicons name="shield-checkmark" size={28} color="#fff" />
          </View>
          <Text style={styles.cardTitle}>Inspections</Text>
          <Text style={styles.cardDesc}>Book professional vehicle inspections before you buy.</Text>
          <View style={styles.cardFooter}>
             <Text style={[styles.cardAction, { color: '#e67e22' }]}>Find Services</Text>
             <Feather name="arrow-right" size={16} color="#e67e22" />
          </View>
        </TouchableOpacity>

        {/* Sell Card */}
        <TouchableOpacity 
          style={[styles.card, { backgroundColor: '#eff2f7' }]} 
          activeOpacity={0.8}
          onPress={() => router.push('/CreateListing')}
        >
          <View style={[styles.iconWrap, { backgroundColor: '#3498db' }]}>
            <Ionicons name="add-circle" size={28} color="#fff" />
          </View>
          <Text style={styles.cardTitle}>Sell Vehicle</Text>
          <Text style={styles.cardDesc}>Post your ad for free and reach thousands of buyers.</Text>
          <View style={styles.cardFooter}>
             <Text style={[styles.cardAction, { color: '#3498db' }]}>Post Ad</Text>
             <Feather name="arrow-right" size={16} color="#3498db" />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.versionInfo}>
        <Text style={styles.versionText}>VMS v1.0.0 — Unified Team Project</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  contentContainer: { padding: 24, paddingBottom: 100 },
  header: { marginBottom: 32, marginTop: 20 },
  appName: { fontSize: 32, fontWeight: '900', color: '#1a1a2e', letterSpacing: -1 },
  appNameAccent: { color: '#10ac84' },
  tagline: { fontSize: 16, color: '#636e72', marginTop: 8, fontWeight: '500' },
  
  featureGrid: { gap: 20 },
  card: { padding: 24, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)' },
  iconWrap: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a2e', marginBottom: 8 },
  cardDesc: { fontSize: 14, color: '#636e72', lineHeight: 20, marginBottom: 16 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardAction: { fontSize: 14, fontWeight: '700' },

  versionInfo: { marginTop: 40, alignItems: 'center' },
  versionText: { fontSize: 12, color: '#b2bec3', fontWeight: '600', letterSpacing: 0.5 },
});
