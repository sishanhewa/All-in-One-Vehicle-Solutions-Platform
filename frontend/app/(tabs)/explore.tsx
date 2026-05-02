import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { AuthContext } from '../../src/context/AuthContext';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';

export default function ProfileTab() {
  const { userInfo, logout } = useContext(AuthContext);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (!userInfo) {
    return (
      <View style={[styles.guestContainer, { paddingTop: insets.top }]}>
        <View style={styles.guestIconWrap}>
          <Feather name="user" size={40} color="#b2bec3" />
        </View>
        <Text style={styles.guestTitle}>Welcome to VehicleHub</Text>
        <Text style={styles.guestText}>Login or create an account to rent vehicles, manage your listings and track your ads</Text>
        <TouchableOpacity style={styles.guestLoginBtn} activeOpacity={0.8} onPress={() => router.push('/login')}>
          <Feather name="log-in" size={18} color="#fff" />
          <Text style={styles.guestLoginBtnTxt}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.guestRegBtn} activeOpacity={0.7} onPress={() => router.push('/register')}>
          <Text style={styles.guestRegBtnTxt}>Create Account</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const MenuItem = ({ icon, title, subtitle, onPress, iconColor = '#1a1a2e' }) => (
    <TouchableOpacity style={styles.menuItem} activeOpacity={0.6} onPress={onPress}>
      <View style={[styles.menuIconWrap, { backgroundColor: `${iconColor}10` }]}>
        <Feather name={icon} size={20} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSub}>{subtitle}</Text>
      </View>
      <Feather name="chevron-right" size={18} color="#dfe6e9" />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTxt}>{userInfo.name?.charAt(0).toUpperCase() || 'U'}</Text>
        </View>
        <Text style={styles.name}>{userInfo.name}</Text>
        <Text style={styles.email}>{userInfo.email}</Text>
        {userInfo.phone && (
          <View style={styles.phoneRow}>
            <Feather name="phone" size={13} color="#b2bec3" />
            <Text style={styles.phone}>{userInfo.phone}</Text>
          </View>
        )}
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        <MenuItem
          icon="plus-circle"
          title="List Vehicle for Rent"
          subtitle="Add a new vehicle to the rental marketplace"
          onPress={() => router.push('/rentals/add-rental')}
          iconColor="#10ac84"
        />
        <MenuItem
          icon="grid"
          title="My Rental Listings"
          subtitle="Manage your listed rental vehicles"
          onPress={() => router.push('/rentals/my-listings')}
          iconColor="#3498db"
        />
        <MenuItem
          icon="inbox"
          title="Rental Requests"
          subtitle="Approve or reject booking requests for your vehicles"
          onPress={() => router.push('/rentals/requests')}
          iconColor="#f39c12"
        />
        <MenuItem
          icon="calendar"
          title="My Bookings"
          subtitle="Track the status of your rental bookings"
          onPress={() => router.push('/rentals/my-bookings')}
          iconColor="#e67e22"
        />
        <MenuItem
          icon="grid"
          title="My Listings"
          subtitle="Manage your active and sold vehicle ads"
          onPress={() => router.push('/ManageAds')}
          iconColor="#3498db"
        />
        <MenuItem
          icon="plus-circle"
          title="Post New Ad"
          subtitle="List a new vehicle on the marketplace"
          onPress={() => router.push('/CreateListing')}
          iconColor="#10ac84"
        />
        <MenuItem
          icon="tool"
          title="My Spare Parts"
          subtitle="Manage your spare part listings"
          onPress={() => router.push('/MySparePartsDashboard')}
          iconColor="#e67e22"
        />
        <MenuItem
          icon="user"
          title="Public Profile"
          subtitle="See how buyers view your profile"
          onPress={() => router.push({
            pathname: '/SellerProfile',
            params: { sellerId: userInfo._id, sellerName: userInfo.name, sellerPhone: userInfo.phone }
          })}
          iconColor="#9b59b6"
        />
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.7} onPress={logout}>
        <Feather name="log-out" size={18} color="#e74c3c" />
        <Text style={styles.logoutTxt}>Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  guestContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, backgroundColor: '#f8f9fa' },
  guestIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f1f3f5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  guestTitle: { fontSize: 22, fontWeight: '800', color: '#1a1a2e', marginBottom: 8 },
  guestText: { fontSize: 14, color: '#b2bec3', textAlign: 'center', marginBottom: 30, lineHeight: 22 },
  guestLoginBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#10ac84', paddingVertical: 14, paddingHorizontal: 50, borderRadius: 25, marginBottom: 14, width: '80%', justifyContent: 'center' },
  guestLoginBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  guestRegBtn: { borderWidth: 2, borderColor: '#10ac84', paddingVertical: 12, paddingHorizontal: 50, borderRadius: 25, width: '80%', alignItems: 'center' },
  guestRegBtnTxt: { color: '#10ac84', fontWeight: '700', fontSize: 16 },

  profileHeader: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#3498db', justifyContent: 'center', alignItems: 'center', marginBottom: 14, ...Platform.select({ ios: { shadowColor: '#3498db', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }, android: { elevation: 4 } }) },
  avatarTxt: { fontSize: 30, color: '#fff', fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '800', color: '#1a1a2e', marginBottom: 4 },
  email: { fontSize: 14, color: '#b2bec3', marginBottom: 4 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  phone: { fontSize: 14, color: '#b2bec3' },

  menu: { backgroundColor: '#fff', marginTop: 16, marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 }, android: { elevation: 2 } }) },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: '#f8f9fa' },
  menuIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  menuTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  menuSub: { fontSize: 12, color: '#b2bec3', marginTop: 2 },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: 20, padding: 16, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#fce4e4', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6 }, android: { elevation: 1 } }) },
  logoutTxt: { color: '#e74c3c', fontWeight: '700', fontSize: 16 }
});
