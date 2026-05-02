import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Platform, StatusBar, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchUsers } from '../api/adminApi';
import { Feather, Ionicons } from '@expo/vector-icons';

const TABS = ['All', 'User', 'InspectionCompany', 'Admin'];

const AdminUserManagement = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const loadUsers = async (role = activeTab, search = searchQuery) => {
    setLoading(true);
    try {
      const data = await fetchUsers(role, search);
      setUsers(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadUsers(); }, []));

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    loadUsers(tab, searchQuery);
  };

  const handleSearch = () => {
    loadUsers(activeTab, searchQuery);
  };

  const getRoleColor = (role) => {
    switch(role) {
      case 'Admin': return '#e74c3c';
      case 'InspectionCompany': return '#f39c12';
      default: return '#3498db';
    }
  };

  const renderUser = ({ item }) => (
    <TouchableOpacity 
      style={styles.userCard} 
      activeOpacity={0.7}
      onPress={() => router.push({ pathname: '/AdminUserDetail', params: { userId: item._id } })}
    >
      <View style={[styles.avatar, { backgroundColor: getRoleColor(item.role) }]}>
        <Text style={styles.avatarTxt}>{item.name ? item.name.charAt(0).toUpperCase() : 'U'}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        <Text style={styles.userPhone}>{item.phone}</Text>
      </View>
      <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) + '15' }]}>
        <Text style={[styles.roleTxt, { color: getRoleColor(item.role) }]}>
          {item.role === 'InspectionCompany' ? 'Company' : item.role}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#1a1a2e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Management</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Feather name="search" size={20} color="#b2bec3" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => { setSearchQuery(''); loadUsers(activeTab, ''); }}>
              <Ionicons name="close-circle" size={20} color="#b2bec3" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
          {TABS.map(tab => (
            <TouchableOpacity 
              key={tab} 
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => handleTabChange(tab)}
            >
              <Text style={[styles.tabTxt, activeTab === tab && styles.tabTxtActive]}>
                {tab === 'InspectionCompany' ? 'Companies' : tab + 's'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10ac84" />
        </View>
      ) : users.length === 0 ? (
        <View style={styles.centerContainer}>
          <Feather name="users" size={48} color="#dfe6e9" />
          <Text style={styles.emptyText}>No users found.</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item._id}
          renderItem={renderUser}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e' },
  
  searchContainer: { padding: 16, backgroundColor: '#fff' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f3f5', borderRadius: 12, paddingHorizontal: 16, height: 48 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: '#1a1a2e' },

  tabsWrapper: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 12 },
  tabsContainer: { paddingHorizontal: 16, gap: 10 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#eee' },
  tabActive: { backgroundColor: '#1a1a2e', borderColor: '#1a1a2e' },
  tabTxt: { fontSize: 13, fontWeight: '600', color: '#636e72' },
  tabTxtActive: { color: '#fff' },

  listContent: { padding: 16 },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }, android: { elevation: 2 } }) },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarTxt: { color: '#fff', fontSize: 20, fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  userEmail: { fontSize: 13, color: '#636e72', marginBottom: 2 },
  userPhone: { fontSize: 12, color: '#b2bec3' },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  roleTxt: { fontSize: 11, fontWeight: '700' },
  
  emptyText: { marginTop: 16, fontSize: 15, color: '#b2bec3' }
});

export default AdminUserManagement;
