import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, Linking, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchParts, resolveImageUrl } from '../api/sparePartsApi';
import { Ionicons } from '@expo/vector-icons';

const SparePartSellerProfile = () => {
  const { sellerId } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [parts, setParts] = useState([]);
  const [sellerInfo, setSellerInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSellerData = async () => {
      try {
        // Fetch all parts, but we'll filter client-side for this seller 
        // (In a real app, you'd add a ?sellerId= filter to the API)
        const allParts = await fetchParts();
        const sellerParts = allParts.filter(p => p.sellerId?._id === sellerId);
        
        setParts(sellerParts);
        
        if (sellerParts.length > 0) {
          setSellerInfo(sellerParts[0].sellerId);
        }
      } catch (error) {
        console.error('Failed to load seller profile:', error);
      } finally {
        setLoading(false);
      }
    };
    if (sellerId) loadSellerData();
  }, [sellerId]);

  const handleCall = () => {
    if (sellerInfo?.phone) {
      Linking.openURL(`tel:${sellerInfo.phone}`);
    }
  };

  const renderItem = ({ item }) => {
    const imageUri = item.images?.length ? resolveImageUrl(item.images[0]) : 'https://via.placeholder.com/200x200?text=No+Image';

    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.8}
        onPress={() => router.push({ pathname: '/SparePartDetails', params: { partId: item._id } })}
      >
        <Image source={{ uri: imageUri }} style={styles.cardImg} />
        <View style={styles.cardContent}>
          <Text style={styles.title} numberOfLines={2}>{item.partName}</Text>
          <Text style={styles.price}>Rs. {item.price?.toLocaleString()}</Text>
          <View style={styles.detailsRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeTxt}>{item.category}</Text>
            </View>
            <Text style={styles.conditionTxt}>{item.condition}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#10ac84" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Profile Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTxt}>{sellerInfo?.name?.charAt(0).toUpperCase() || 'S'}</Text>
        </View>
        <Text style={styles.name}>{sellerInfo?.name || 'Seller Profile'}</Text>
        <Text style={styles.memberSince}>Verified Member</Text>
        
        {sellerInfo?.phone && (
          <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
            <Ionicons name="call" size={16} color="#fff" />
            <Text style={styles.callBtnTxt}>{sellerInfo.phone}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Parts List */}
      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>Listings by {sellerInfo?.name?.split(' ')[0] || 'this seller'} ({parts.length})</Text>
        
        <FlatList
          data={parts}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Ionicons name="construct-outline" size={48} color="#dfe6e9" />
              <Text style={styles.emptyText}>No active listings</Text>
            </View>
          )}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { backgroundColor: '#fff', alignItems: 'center', paddingBottom: 30, borderBottomWidth: 1, borderBottomColor: '#eee', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }, android: { elevation: 2 } }) },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#10ac84', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarTxt: { color: '#fff', fontSize: 32, fontWeight: '800' },
  name: { fontSize: 22, fontWeight: '800', color: '#1a1a2e', marginBottom: 4 },
  memberSince: { fontSize: 13, color: '#b2bec3', marginBottom: 16 },
  callBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10ac84', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, gap: 8 },
  callBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },

  listSection: { flex: 1, paddingTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', paddingHorizontal: 20, marginBottom: 12 },
  listContainer: { paddingHorizontal: 16, paddingBottom: 40 },
  
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 12, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }, android: { elevation: 2 } }) },
  cardImg: { width: 90, height: 90, borderRadius: 10, backgroundColor: '#f1f3f5' },
  cardContent: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginBottom: 6 },
  price: { fontSize: 16, fontWeight: '800', color: '#10ac84', marginBottom: 8 },
  detailsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { backgroundColor: '#f1f3f5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeTxt: { fontSize: 10, fontWeight: '700', color: '#636e72' },
  conditionTxt: { fontSize: 12, color: '#b2bec3' },

  emptyState: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 15, color: '#b2bec3', marginTop: 12 },
});

export default SparePartSellerProfile;
