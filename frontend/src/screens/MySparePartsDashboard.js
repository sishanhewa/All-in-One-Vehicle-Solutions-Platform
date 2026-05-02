import React, { useState, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchMyParts, deletePartAPI, resolveImageUrl } from '../api/sparePartsApi';
import { AuthContext } from '../context/AuthContext';
import { Ionicons, Feather } from '@expo/vector-icons';

const MySparePartsDashboard = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userInfo } = useContext(AuthContext);

  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMyParts = async () => {
    try {
      const data = await fetchMyParts();
      setParts(data);
    } catch (error) {
      console.error('Failed to load my parts:', error);
      Alert.alert('Error', 'Failed to load your spare parts');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    if (!userInfo) {
      router.replace('/login');
      return;
    }
    loadMyParts();
  }, [userInfo]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMyParts();
    setRefreshing(false);
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Listing', 'Are you sure you want to permanently delete this spare part listing?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePartAPI(id);
            setParts(prev => prev.filter(p => p._id !== id));
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        }
      }
    ]);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Available': return '#10ac84';
      case 'Sold': return '#e67e22';
      case 'Removed': return '#e74c3c';
      default: return '#636e72';
    }
  };

  const renderItem = ({ item }) => {
    const imageUri = item.images?.length ? resolveImageUrl(item.images[0]) : 'https://via.placeholder.com/200x200?text=No+Image';
    const statusColor = getStatusColor(item.status);

    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.8}
        onPress={() => router.push({ pathname: '/SparePartDetails', params: { partId: item._id } })}
      >
        <Image source={{ uri: imageUri }} style={styles.cardImg} />
        <View style={styles.cardContent}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>{item.partName}</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
              <Text style={[styles.statusTxt, { color: statusColor }]}>{item.status}</Text>
            </View>
          </View>
          
          <Text style={styles.price}>Rs. {item.price?.toLocaleString()}</Text>
          <Text style={styles.details} numberOfLines={1}>{item.category} • {item.condition}</Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={styles.actionBtnEdit}
              onPress={() => router.push({ pathname: '/EditSparePart', params: { partId: item._id } })}
            >
              <Feather name="edit-2" size={14} color="#3498db" />
              <Text style={styles.actionBtnTxtEdit}>Edit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionBtnDel}
              onPress={() => handleDelete(item._id)}
            >
              <Feather name="trash-2" size={14} color="#e74c3c" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#10ac84" />
      </View>
    );
  }

  const activeCount = parts.filter(p => p.status === 'Available').length;
  const soldCount = parts.filter(p => p.status === 'Sold').length;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      
      {/* Stats Header */}
      <View style={styles.statsHeader}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{parts.length}</Text>
          <Text style={styles.statLabel}>Total Parts</Text>
        </View>
        <View style={styles.statDiv} />
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#10ac84' }]}>{activeCount}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statDiv} />
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#e67e22' }]}>{soldCount}</Text>
          <Text style={styles.statLabel}>Sold</Text>
        </View>
      </View>

      <FlatList
        data={parts}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10ac84" />}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="construct-outline" size={48} color="#b2bec3" />
            </View>
            <Text style={styles.emptyTitle}>No Spare Parts Yet</Text>
            <Text style={styles.emptyDesc}>Start selling by posting your first spare part listing.</Text>
            <TouchableOpacity style={styles.postBtn} onPress={() => router.push('/CreateSparePart')}>
              <Text style={styles.postBtnTxt}>Post a Spare Part</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  statsHeader: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#eee', marginBottom: 10 },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', color: '#1a1a2e' },
  statLabel: { fontSize: 12, color: '#b2bec3', marginTop: 4, fontWeight: '600' },
  statDiv: { width: 1, height: '70%', backgroundColor: '#eee', alignSelf: 'center' },

  listContainer: { padding: 16 },
  
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 12, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }, android: { elevation: 2 } }) },
  cardImg: { width: 90, height: 90, borderRadius: 10, backgroundColor: '#f1f3f5' },
  cardContent: { flex: 1, marginLeft: 12, justifyContent: 'space-between' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusTxt: { fontSize: 10, fontWeight: '700' },
  price: { fontSize: 16, fontWeight: '800', color: '#10ac84', marginTop: 2 },
  details: { fontSize: 12, color: '#b2bec3', marginTop: 2 },

  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  actionBtnEdit: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eaf4fc', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 4 },
  actionBtnTxtEdit: { color: '#3498db', fontSize: 12, fontWeight: '700' },
  actionBtnDel: { backgroundColor: '#fce4e4', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, justifyContent: 'center' },

  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyIconWrap: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#f1f3f5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#b2bec3', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  postBtn: { backgroundColor: '#10ac84', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  postBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

export default MySparePartsDashboard;
