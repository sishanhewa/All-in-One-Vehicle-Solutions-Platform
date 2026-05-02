import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, TextInput, Alert, StatusBar, Platform, KeyboardAvoidingView } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchTickets, assignTicketStatus, respondToTicket, deleteTicket } from '../api/adminApi';
import { Feather } from '@expo/vector-icons';
// NOTE: Re-using the normal support endpoint for fetching a single ticket since adminApi doesn't duplicate the GET /:id right now.
// Actually, I can just fetch all tickets and find the one. 
// Or better, I will use fetchTickets and filter.

const BASE_URL = 'http://192.168.8.100:5000';
const resolveImageUrl = (imagePath) => {
  if (!imagePath) return 'https://via.placeholder.com/400x200?text=No+Image';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
  return `${BASE_URL}${imagePath}`;
};

const AdminTicketDetail = () => {
  const { ticketId } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const loadTicket = async () => {
    try {
      const tickets = await fetchTickets();
      const found = tickets.find(t => t._id === ticketId);
      if (!found) throw new Error('Ticket not found');
      setTicket(found);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to load ticket details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { if (ticketId) loadTicket(); }, [ticketId]));

  const handleReply = async () => {
    if (!replyMessage.trim()) return;
    setIsReplying(true);
    try {
      await respondToTicket(ticketId, replyMessage);
      setReplyMessage('');
      loadTicket();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsReplying(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setIsUpdatingStatus(true);
    try {
      await assignTicketStatus(ticketId, newStatus);
      loadTicket();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Ticket', 'Are you sure you want to permanently delete this ticket?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteTicket(ticketId);
            router.back();
          } catch (e) {
            Alert.alert('Error', e.message);
          }
      }}
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#10ac84" />
      </View>
    );
  }

  if (!ticket) return null;

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'Urgent': return '#e74c3c';
      case 'High': return '#e67e22';
      case 'Medium': return '#f39c12';
      case 'Low': return '#10ac84';
      default: return '#3498db';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Open': return '#3498db';
      case 'In Progress': return '#f39c12';
      case 'Resolved': return '#10ac84';
      case 'Closed': return '#7f8c8d';
      default: return '#1a1a2e';
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#1a1a2e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin View</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
          <Feather name="trash-2" size={20} color="#e74c3c" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.ticketHeaderCard}>
          <View style={styles.badgesRow}>
            <View style={[styles.badge, { backgroundColor: getStatusColor(ticket.status) + '15' }]}>
              <Text style={[styles.badgeText, { color: getStatusColor(ticket.status) }]}>{ticket.status}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: getPriorityColor(ticket.priority) + '15' }]}>
              <Text style={[styles.badgeText, { color: getPriorityColor(ticket.priority) }]}>{ticket.priority}</Text>
            </View>
            <Text style={styles.timeText}>{new Date(ticket.createdAt).toLocaleDateString()}</Text>
          </View>
          
          <Text style={styles.subject}>{ticket.subject}</Text>
          
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Feather name="tag" size={14} color="#636e72" />
              <Text style={styles.metaText}>{ticket.category}</Text>
            </View>
            <View style={styles.metaItem}>
              <Feather name="user" size={14} color="#636e72" />
              <Text style={styles.metaText}>{ticket.userId?.name || 'Unknown'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <View style={styles.descriptionBox}>
            <Text style={styles.descriptionText}>{ticket.description}</Text>
          </View>
        </View>

        {ticket.images && ticket.images.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Attachments</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {ticket.images.map((img, idx) => (
                <Image key={idx} source={{ uri: resolveImageUrl(img) }} style={styles.attachedImage} />
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.actionSection}>
          <Text style={styles.sectionTitle}>Admin Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#f39c12' }]} onPress={() => handleStatusChange('In Progress')} disabled={isUpdatingStatus}>
              <Text style={styles.actionBtnText}>Mark In Progress</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10ac84' }]} onPress={() => handleStatusChange('Resolved')} disabled={isUpdatingStatus}>
              <Text style={styles.actionBtnText}>Mark Resolved</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#7f8c8d' }]} onPress={() => handleStatusChange('Closed')} disabled={isUpdatingStatus}>
              <Text style={styles.actionBtnText}>Close Ticket</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conversation Thread</Text>
          {ticket.responses && ticket.responses.length > 0 ? (
            ticket.responses.map((resp, idx) => {
              const rAdmin = resp.responderRole === 'Admin';
              return (
                <View key={idx} style={[styles.messageBubble, rAdmin ? styles.messageMe : styles.messageOther]}>
                  <View style={styles.messageHeader}>
                    <Text style={[styles.messageName, rAdmin && styles.adminName]}>
                      {rAdmin ? 'You (Admin)' : (resp.responderId?.name || 'User')}
                    </Text>
                    <Text style={styles.messageTime}>{new Date(resp.createdAt).toLocaleDateString()}</Text>
                  </View>
                  <Text style={styles.messageText}>{resp.message}</Text>
                </View>
              );
            })
          ) : (
            <Text style={styles.noResponses}>No responses yet.</Text>
          )}
        </View>

        <View style={styles.replyBox}>
          <TextInput
            style={styles.replyInput}
            placeholder="Type your admin reply..."
            value={replyMessage}
            onChangeText={setReplyMessage}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendBtn, !replyMessage.trim() && styles.sendBtnDisabled]} 
            onPress={handleReply}
            disabled={!replyMessage.trim() || isReplying}
          >
            {isReplying ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="send" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e' },
  deleteBtn: { padding: 8, marginRight: -8 },
  
  scrollContent: { padding: 20, paddingBottom: 40 },
  
  ticketHeaderCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 20, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }, android: { elevation: 2 } }), borderWidth: 1, borderColor: '#f1f3f5' },
  badgesRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  timeText: { fontSize: 12, color: '#b2bec3', marginLeft: 'auto' },
  subject: { fontSize: 20, fontWeight: '800', color: '#1a1a2e', marginBottom: 16, lineHeight: 28 },
  metaRow: { flexDirection: 'row', gap: 16, borderTopWidth: 1, borderTopColor: '#f8f9fa', paddingTop: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: '#636e72', fontWeight: '500' },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a2e', marginBottom: 12 },
  
  descriptionBox: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#eee' },
  descriptionText: { fontSize: 15, color: '#2d3436', lineHeight: 24 },

  attachedImage: { width: 120, height: 120, borderRadius: 12, marginRight: 12, backgroundColor: '#eee' },

  actionSection: { marginBottom: 24 },
  actionsGrid: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  actionBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  messageBubble: { padding: 16, borderRadius: 16, marginBottom: 12, maxWidth: '90%' },
  messageMe: { backgroundColor: '#fde8e8', alignSelf: 'flex-end', borderBottomRightRadius: 4, borderWidth: 1, borderColor: '#fce4e4' }, // Admin reply styling
  messageOther: { backgroundColor: '#fff', alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#eee' },
  messageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 16 },
  messageName: { fontSize: 13, fontWeight: '700', color: '#1a1a2e' },
  adminName: { color: '#e74c3c' },
  messageTime: { fontSize: 11, color: '#b2bec3' },
  messageText: { fontSize: 14, color: '#2d3436', lineHeight: 20 },
  noResponses: { fontSize: 14, color: '#b2bec3', fontStyle: 'italic', textAlign: 'center', padding: 20 },

  replyBox: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#fff', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#eee' },
  replyInput: { flex: 1, minHeight: 40, maxHeight: 100, fontSize: 15, paddingRight: 12, paddingTop: 10 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#10ac84', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#b2bec3' },
});

export default AdminTicketDetail;
