import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';

const ACCENT = '#8e44ad';

const MANAGE_ITEMS = [
  {
    route:    '/ManageOfferings',
    icon:     'tool',
    iconLib:  'Feather',
    label:    'Manage Services',
    subtitle: 'Add, edit and toggle your service offerings',
    color:    ACCENT,
    bg:       '#f4ecf7',
  },
  {
    route:    '/ManageMechanics',
    icon:     'users',
    iconLib:  'Feather',
    label:    'Manage Team',
    subtitle: 'Add, edit and deactivate mechanics in your garage',
    color:    '#10ac84',
    bg:       '#f0faf7',
  },
  {
    route:    '/GarageProfile',
    icon:     'settings',
    iconLib:  'Feather',
    label:    'Garage Profile',
    subtitle: 'View and edit your garage details and business info',
    color:    '#3498db',
    bg:       '#eef6ff',
  },
  {
    route:    '/BookingQueue',
    icon:     'list',
    iconLib:  'Feather',
    label:    'Booking Queue',
    subtitle: 'Review pending, confirmed and in-progress repairs',
    color:    '#e67e22',
    bg:       '#fef9f0',
  },
];

const ManageHub = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerAvatar}>
          <Ionicons name="construct" size={24} color="#fff" />
        </View>
        <View>
          <Text style={styles.headerTitle}>Manage</Text>
          <Text style={styles.headerSubtitle}>Your garage management hub</Text>
        </View>
      </View>

      {/* ── Cards ── */}
      <View style={styles.cardList}>
        {MANAGE_ITEMS.map((item) => {
          const Icon = item.iconLib === 'Ionicons' ? Ionicons : Feather;
          return (
            <TouchableOpacity
              key={item.route}
              style={styles.card}
              activeOpacity={0.75}
              onPress={() => router.push(item.route)}
            >
              <View style={[styles.cardIcon, { backgroundColor: item.bg }]}>
                <Icon name={item.icon} size={26} color={item.color} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardLabel}>{item.label}</Text>
                <Text style={styles.cardSubtitle} numberOfLines={2}>{item.subtitle}</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#dfe6e9" />
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
};

const cardShadow = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10 },
  android: { elevation: 2 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },

  header: {
    backgroundColor: ACCENT,
    paddingHorizontal: 20, paddingBottom: 28,
    flexDirection: 'row', alignItems: 'center', gap: 16,
    ...Platform.select({
      ios:     { shadowColor: ACCENT, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14 },
      android: { elevation: 8 },
    }),
  },
  headerAvatar: {
    width: 50, height: 50, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle:    { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginTop: 2 },

  cardList: { padding: 16, gap: 12 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    ...cardShadow,
  },
  cardIcon: {
    width: 56, height: 56, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  cardText:     { flex: 1 },
  cardLabel:    { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: '#b2bec3', lineHeight: 18 },
});

export default ManageHub;
