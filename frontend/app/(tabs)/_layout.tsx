import { Tabs } from 'expo-router';
import React, { useContext } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../src/context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';

// tabBarItemStyle helper — hides a tab when the user's role isn't in the list.
// Expo Router requires ALL Tabs.Screen entries to be rendered in the tree;
// display:'none' is the correct way to hide individual items without unmounting.
const hidden = { display: 'none' as const };
const visible = {};

export default function TabLayout() {
  const { userInfo } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const role = userInfo?.role ?? 'User';

  const isUser     = !userInfo || role === 'User';
  const isOwner    = role === 'GarageOwner';
  const isMechanic = role === 'Mechanic';
  const isAdmin    = role === 'Admin';

  // Role-specific accent colour for the active tab
  const accent =
    isOwner || isMechanic ? '#8e44ad' :
    isAdmin               ? '#e74c3c' :
    '#10ac84';

  const show = (condition: boolean) => (condition ? visible : hidden);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor:   accent,
        tabBarInactiveTintColor: '#7f8c8d',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#eee',
          paddingBottom: Platform.OS === 'android' ? insets.bottom + 12 : insets.bottom + 8,
          paddingTop: 8,
          height: 64 + insets.bottom,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
      }}
    >
      {/* ── Home ── all roles ── */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />

      {/* ── Marketplace ── User & Admin ── */}
      <Tabs.Screen
        name="marketplace"
        options={{
          title: 'Marketplace',
          tabBarItemStyle: show(isUser || isAdmin),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'cart' : 'cart-outline'} size={24} color={color} />
          ),
        }}
      />

      {/* ── Inspections ── User & Admin ── */}
      <Tabs.Screen
        name="inspections"
        options={{
          title: 'Inspections',
          tabBarItemStyle: show(isUser || isAdmin),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'} size={24} color={color} />
          ),
        }}
      />

      {/* ── Services (Repair) ── User & Admin ── */}
      <Tabs.Screen
        name="services"
        options={{
          title: 'Services',
          tabBarActiveTintColor: '#8e44ad',
          tabBarItemStyle: show(isUser || isAdmin),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'construct' : 'construct-outline'} size={24} color={color} />
          ),
        }}
      />

      {/* ── Owner Dashboard ── GarageOwner only ── */}
      <Tabs.Screen
        name="ownerDashboard"
        options={{
          title: 'Dashboard',
          tabBarItemStyle: show(isOwner),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'business' : 'business-outline'} size={24} color={color} />
          ),
        }}
      />

      {/* ── Booking Queue ── GarageOwner only ── */}
      <Tabs.Screen
        name="bookingQueue"
        options={{
          title: 'Queue',
          tabBarItemStyle: show(isOwner),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'list' : 'list-outline'} size={24} color={color} />
          ),
        }}
      />

      {/* ── Manage (Offerings / Team) ── GarageOwner only ── */}
      <Tabs.Screen
        name="manage"
        options={{
          title: 'Manage',
          tabBarItemStyle: show(isOwner),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={24} color={color} />
          ),
        }}
      />

      {/* ── My Repairs ── User & Admin ── */}
      <Tabs.Screen
        name="myRepairs"
        options={{
          title: 'My Repairs',
          tabBarItemStyle: show(isUser || isAdmin),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'construct' : 'construct-outline'} size={24} color={color} />
          ),
        }}
      />

      {/* ── My Jobs ── Mechanic only ── */}
      <Tabs.Screen
        name="myJobs"
        options={{
          title: 'My Jobs',
          tabBarItemStyle: show(isMechanic),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'hammer' : 'hammer-outline'} size={24} color={color} />
          ),
        }}
      />

      {/* ── Admin Dashboard ── Admin only ── */}
      <Tabs.Screen
        name="adminDashboard"
        options={{
          title: 'Admin',
          tabBarItemStyle: show(isAdmin),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'shield' : 'shield-outline'} size={24} color={color} />
          ),
        }}
      />

      {/* ── Account ── all roles ── */}
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
