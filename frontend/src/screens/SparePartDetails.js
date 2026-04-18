import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Dimensions, Alert, Linking, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { fetchPartById, resolveImageUrl, deletePartAPI } from '../api/sparePartsApi';
import { AuthContext } from '../context/AuthContext';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const SparePartDetails = () => {
  const { partId } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userInfo } = useContext(AuthContext);

  const [part, setPart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    const loadPart = async () => {
      try {
        const data = await fetchPartById(partId);
        setPart(data);
      } catch (error) {
        Alert.alert('Error', error.message || 'Failed to load details');
        router.back();
      } finally {
        setLoading(false);
      }
    };
    if (partId) loadPart();
  }, [partId]);

  const handleDelete = () => {
    Alert.alert('Delete Part', 'Are you sure you want to delete this listing?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePartAPI(partId);
            Alert.alert('Success', 'Listing deleted successfully');
            router.back();
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        }
      }
    ]);
  };

  const handleCall = () => {
    if (part?.sellerId?.phone) {
      Linking.openURL(`tel:${part.sellerId.phone}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#10ac84" />
        <Text style={styles.loaderText}>Loading details...</Text>
      </View>
    );
  }

  if (!part) return null;

  const isOwner = userInfo && userInfo._id === part.sellerId?._id;
  const images = part.images?.length > 0 ? part.images : [null];

  return (
    <ScrollView style={[styles.container, { paddingBottom: insets.bottom }]} showsVerticalScrollIndicator={false}>
      {/* Image Carousel */}
      <View style={styles.imageContainer}>
        <ScrollView 
          horizontal 
          pagingEnabled 
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
            setActiveImageIndex(newIndex);
          }}
        >
          {images.map((img, idx) => (
            <Image 
              key={idx} 
              source={{ uri: img ? resolveImageUrl(img) : 'https://via.placeholder.com/400x300?text=No+Image' }} 
              style={styles.image} 
            />
          ))}
        </ScrollView>
        {images.length > 1 && (
          <View style={styles.pagination}>
            {images.map((_, idx) => (
              <View key={idx} style={[styles.dot, idx === activeImageIndex && styles.activeDot]} />
            ))}
          </View>
        )}
      </View>

      <View style={styles.content}>
        {/* Header Section */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>{part.partName}</Text>
          <Text style={styles.price}>Rs. {part.price?.toLocaleString()}</Text>
        </View>

        <View style={styles.badgesRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{part.category}</Text>
          </View>
          <View style={[styles.badge, part.condition === 'New' ? styles.badgeNew : part.condition === 'Refurbished' ? styles.badgeRefurb : null]}>
            <Text style={[styles.badgeText, part.condition === 'New' ? styles.badgeTextNew : part.condition === 'Refurbished' ? styles.badgeTextRefurb : null]}>{part.condition}</Text>
          </View>
          <View style={[styles.badge, styles.badgeStatus]}>
            <Text style={styles.badgeTextStatus}>{part.status}</Text>
          </View>
        </View>

        {part.partNumber ? (
          <Text style={styles.partNumber}>Part Number: {part.partNumber}</Text>
        ) : null}

        {part.location ? (
          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color="#e74c3c" />
            <Text style={styles.locationText}>{part.location}</Text>
          </View>
        ) : null}

        <View style={styles.divider} />

        {/* Compatibility Section */}
        <Text style={styles.sectionTitle}>Compatibility</Text>
        <View style={styles.specsGrid}>
          {part.compatibility?.make ? (
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Make</Text>
              <Text style={styles.specValue}>{part.compatibility.make}</Text>
            </View>
          ) : null}
          {part.compatibility?.model ? (
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Model</Text>
              <Text style={styles.specValue}>{part.compatibility.model}</Text>
            </View>
          ) : null}
          {(part.compatibility?.yearFrom || part.compatibility?.yearTo) ? (
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Year Range</Text>
              <Text style={styles.specValue}>
                {part.compatibility.yearFrom || 'Any'} - {part.compatibility.yearTo || 'Any'}
              </Text>
            </View>
          ) : null}
          {part.compatibility?.engineType ? (
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Engine Type</Text>
              <Text style={styles.specValue}>{part.compatibility.engineType}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.divider} />

        {/* Description */}
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{part.description || 'No description provided.'}</Text>
        
        <View style={styles.divider} />

        {/* Seller Info */}
        <Text style={styles.sectionTitle}>Seller Information</Text>
        <View style={styles.sellerCard}>
          <View style={styles.sellerHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTxt}>{part.sellerId?.name?.charAt(0).toUpperCase() || 'S'}</Text>
            </View>
            <View style={styles.sellerDetails}>
              <Text style={styles.sellerName}>{part.sellerId?.name}</Text>
              <Text style={styles.sellerType}>Verified Seller</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtnCall} onPress={handleCall}>
              <Ionicons name="call" size={18} color="#fff" />
              <Text style={styles.actionBtnTxtCall}>Call Seller</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionBtnMsg}
              onPress={() => router.push({ pathname: '/SparePartSellerProfile', params: { sellerId: part.sellerId?._id } })}
            >
              <Ionicons name="person" size={18} color="#10ac84" />
              <Text style={styles.actionBtnTxtMsg}>View Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Owner Controls */}
        {isOwner && (
          <View style={styles.ownerControls}>
            <Text style={styles.ownerTitle}>Manage Listing</Text>
            <View style={styles.ownerBtnRow}>
              <TouchableOpacity 
                style={styles.editBtn} 
                onPress={() => router.push({ pathname: '/EditSparePart', params: { partId: part._id } })}
              >
                <Feather name="edit-2" size={18} color="#fff" />
                <Text style={styles.editBtnTxt}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.delBtn} onPress={handleDelete}>
                <Feather name="trash-2" size={18} color="#e74c3c" />
                <Text style={styles.delBtnTxt}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 12, color: '#b2bec3', fontSize: 14 },
  
  imageContainer: { width, height: 280, backgroundColor: '#eee', position: 'relative' },
  image: { width, height: 280, resizeMode: 'cover' },
  pagination: { position: 'absolute', bottom: 16, flexDirection: 'row', width: '100%', justifyContent: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  activeDot: { backgroundColor: '#fff', width: 24 },

  content: { padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#1a1a2e', flex: 1, marginRight: 10 },
  price: { fontSize: 22, fontWeight: '800', color: '#10ac84' },
  
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  badge: { backgroundColor: '#f1f3f5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#636e72' },
  badgeNew: { backgroundColor: '#e8f5e9' },
  badgeTextNew: { color: '#2e7d32' },
  badgeRefurb: { backgroundColor: '#fff3e0' },
  badgeTextRefurb: { color: '#e65100' },
  badgeStatus: { backgroundColor: '#e3f2fd' },
  badgeTextStatus: { color: '#1976d2' },

  partNumber: { fontSize: 14, color: '#636e72', marginBottom: 8, fontWeight: '500' },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
  locationText: { fontSize: 14, color: '#636e72' },

  divider: { height: 1, backgroundColor: '#eee', marginVertical: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e', marginBottom: 16 },

  specsGrid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#fff', borderRadius: 12, padding: 16, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }, android: { elevation: 2 } }) },
  specItem: { width: '50%', marginBottom: 16 },
  specLabel: { fontSize: 12, color: '#b2bec3', marginBottom: 4 },
  specValue: { fontSize: 15, fontWeight: '600', color: '#1a1a2e' },

  description: { fontSize: 15, lineHeight: 24, color: '#636e72' },

  sellerCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10 }, android: { elevation: 3 } }) },
  sellerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#3498db', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarTxt: { color: '#fff', fontSize: 20, fontWeight: '700' },
  sellerDetails: { flex: 1 },
  sellerName: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  sellerType: { fontSize: 13, color: '#10ac84', marginTop: 2, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtnCall: { flex: 1, backgroundColor: '#10ac84', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 8 },
  actionBtnTxtCall: { color: '#fff', fontWeight: '700', fontSize: 15 },
  actionBtnMsg: { flex: 1, backgroundColor: '#f0faf7', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 8 },
  actionBtnTxtMsg: { color: '#10ac84', fontWeight: '700', fontSize: 15 },

  ownerControls: { marginTop: 24, padding: 16, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#eee' },
  ownerTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 12 },
  ownerBtnRow: { flexDirection: 'row', gap: 10 },
  editBtn: { flex: 1, backgroundColor: '#3498db', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 8 },
  editBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  delBtn: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#fce4e4', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 8 },
  delBtnTxt: { color: '#e74c3c', fontWeight: '700', fontSize: 15 },
});

export default SparePartDetails;
