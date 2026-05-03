import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, StyleSheet, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { resolveImageUrl } from '../api/marketplaceApi';
import { Ionicons } from '@expo/vector-icons';

const SellerProfile = () => {
  const { sellerId, sellerName, sellerPhone } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [seller, setSeller] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadSeller(); }, [sellerId]);

  const loadSeller = async () => {
    try {
      const API = 'https://all-in-one-vehicle-solutions-platform.onrender.com/api/marketplace';
      const res = await fetch(`${API}?sellerId=${sellerId}`);
      const data = await res.json();
      setListings(data);
      if (data.length > 0) setSeller(data[0].sellerId);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fmt = (p) => `Rs. ${Number(p).toLocaleString()}`;

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#10ac84" /></View>;

  const displaySeller = seller || { name: sellerName || 'Unknown Seller', phone: sellerPhone || '' };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.profileCard}>
        <View style={s.avatar}><Ionicons name="person" size={32} color="#fff" /></View>
        <Text style={s.name}>{displaySeller.name}</Text>
        <Text style={s.phone}>{displaySeller.phone}</Text>
        <Text style={s.count}>{listings.length} listing{listings.length !== 1 ? 's' : ''}</Text>
      </View>
      <FlatList
        data={listings}
        keyExtractor={i => i._id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Ionicons name="car-outline" size={48} color="#b2bec3" />
            <Text style={{ marginTop: 12, fontSize: 16, color: '#636e72', fontWeight: '500' }}>No active listings</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => router.push({ pathname: '/ListingDetails', params: { listingId: item._id } })}>
            <Image source={{ uri: item.images?.length ? resolveImageUrl(item.images[0]) : 'https://via.placeholder.com/120x90' }} style={s.thumb} />
            <View style={s.info}>
              <Text style={s.title} numberOfLines={1}>{item.year} {item.make} {item.model}</Text>
              <Text style={s.price}>{fmt(item.price)}</Text>
              <Text style={s.loc}>{item.location}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profileCard: { alignItems: 'center', padding: 30, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#10ac84', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  name: { fontSize: 20, fontWeight: '800', color: '#1a1a2e' },
  phone: { fontSize: 14, color: '#636e72', marginTop: 4 },
  count: { fontSize: 13, color: '#b2bec3', marginTop: 8 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10 }, android: { elevation: 3 } }) },
  thumb: { width: 90, height: 70, borderRadius: 12, resizeMode: 'cover', marginRight: 14 },
  info: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  price: { fontSize: 16, fontWeight: '800', color: '#10ac84', marginBottom: 2 },
  loc: { fontSize: 12, color: '#636e72' },
});

export default SellerProfile;
