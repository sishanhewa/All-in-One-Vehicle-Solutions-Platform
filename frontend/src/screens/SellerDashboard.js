import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchMyListings, deleteListingAPI, updateListingAPI, resolveImageUrl } from '../api/marketplaceApi';
import { Ionicons } from '@expo/vector-icons';

const SellerDashboard = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => { loadMyListings(); }, []));

  const loadMyListings = async () => {
    setLoading(true);
    try { setListings(await fetchMyListings()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleDelete = (id, title) => {
    Alert.alert('Delete', `Delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteListingAPI(id); setListings(p => p.filter(l => l._id !== id)); }
        catch (e) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  const handleToggleSold = async (item) => {
    const newStatus = item.status === 'Sold' ? 'Available' : 'Sold';
    try {
      const formData = new FormData();
      formData.append('status', newStatus);
      const updated = await updateListingAPI(item._id, formData);
      setListings(p => p.map(l => l._id === updated._id ? updated : l));
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const fmt = (p) => `Rs. ${Number(p).toLocaleString()}`;

  const renderItem = ({ item }) => {
    const img = item.images?.length ? resolveImageUrl(item.images[0]) : 'https://via.placeholder.com/120x90?text=No+Image';
    const title = `${item.year} ${item.make} ${item.model}`;
    return (
      <View style={s.card}>
        <View style={s.row}>
          <Image source={{ uri: img }} style={s.thumb} />
          <View style={s.info}><Text style={s.title} numberOfLines={1}>{title}</Text><Text style={s.price}>{fmt(item.price)}</Text><Text style={s.loc}>{item.location} · {item.status}</Text></View>
        </View>
        <View style={s.actions}>
          <TouchableOpacity style={s.btn} onPress={() => handleToggleSold(item)}>
            <Ionicons name={item.status === 'Sold' ? 'refresh-outline' : 'checkmark-circle-outline'} size={18} color="#27ae60" />
            <Text style={[s.btnTxt,{color:'#27ae60'}]}>{item.status === 'Sold' ? 'Relist' : 'Mark Sold'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btn} onPress={() => router.push({ pathname: '/EditListing', params: { listingId: item._id } })}><Ionicons name="create-outline" size={18} color="#e67e22" /><Text style={[s.btnTxt,{color:'#e67e22'}]}>Edit</Text></TouchableOpacity>
          <TouchableOpacity style={s.btn} onPress={() => handleDelete(item._id, title)}><Ionicons name="trash-outline" size={18} color="#e74c3c" /><Text style={[s.btnTxt,{color:'#e74c3c'}]}>Delete</Text></TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.headerTitle}>My Listings</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => router.push('/CreateListing')}><Ionicons name="add-circle" size={18} color="#fff" /><Text style={s.addTxt}>New</Text></TouchableOpacity>
      </View>
      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color="#10ac84" /></View>
      ) : listings.length === 0 ? (
        <View style={s.center}><Ionicons name="car-outline" size={64} color="#dfe6e9" /><Text style={s.empty}>No listings yet</Text></View>
      ) : (
        <FlatList data={listings} keyExtractor={i => i._id} renderItem={renderItem} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} />
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:'#f8f9fa'},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:20,backgroundColor:'#fff',borderBottomWidth:1,borderBottomColor:'#eee'},
  headerTitle:{fontSize:22,fontWeight:'800',color:'#1a1a2e'},
  addBtn:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:'#10ac84',paddingHorizontal:16,paddingVertical:10,borderRadius:20},
  addTxt:{color:'#fff',fontSize:14,fontWeight:'700'},
  center:{flex:1,justifyContent:'center',alignItems:'center'},
  empty:{fontSize:16,color:'#636e72',marginTop:16},
  card:{backgroundColor:'#fff',borderRadius:16,marginBottom:14,overflow:'hidden',...Platform.select({ios:{shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.08,shadowRadius:12},android:{elevation:3}})},
  row:{flexDirection:'row',padding:14},
  thumb:{width:100,height:80,borderRadius:12,resizeMode:'cover',marginRight:14},
  info:{flex:1},
  title:{fontSize:16,fontWeight:'700',color:'#1a1a2e',marginBottom:4},
  price:{fontSize:17,fontWeight:'800',color:'#10ac84',marginBottom:4},
  loc:{fontSize:12,color:'#636e72'},
  actions:{flexDirection:'row',borderTopWidth:1,borderTopColor:'#f1f3f5'},
  btn:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,paddingVertical:12},
  btnTxt:{fontSize:13,fontWeight:'600'},
});

export default SellerDashboard;
