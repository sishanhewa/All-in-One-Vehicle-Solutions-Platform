import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { fetchRepairBookingById, submitReview } from '../api/serviceApi';

const ACCENT    = '#8e44ad';
const MAX_CHARS = 1000;

// ─── Star Picker ───────────────────────────────────────────────────────────────

const StarPicker = ({ value, onChange, size = 36 }) => (
  <View style={styles.starsRow}>
    {[1, 2, 3, 4, 5].map((star) => (
      <TouchableOpacity
        key={star}
        onPress={() => onChange(star)}
        activeOpacity={0.7}
        hitSlop={8}
      >
        <Ionicons
          name={star <= value ? 'star' : 'star-outline'}
          size={size}
          color={star <= value ? '#f39c12' : '#dfe6e9'}
        />
      </TouchableOpacity>
    ))}
  </View>
);

const ratingLabel = (v) => {
  if (!v) return '';
  return ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][v] ?? '';
};

// ─── Main Screen ───────────────────────────────────────────────────────────────

const LeaveReview = () => {
  const router   = useRouter();
  const { bookingId } = useLocalSearchParams();

  const [booking,        setBooking]        = useState(null);
  const [fetching,       setFetching]       = useState(true);
  const [garageRating,   setGarageRating]   = useState(0);
  const [mechanicRating, setMechanicRating] = useState(0);
  const [comment,        setComment]        = useState('');
  const [submitting,     setSubmitting]     = useState(false);

  // ── Fetch booking on mount ──
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchRepairBookingById(bookingId);
        setBooking(data);
      } catch {
        // Non-fatal — mechanic section simply won't show
      } finally {
        setFetching(false);
      }
    })();
  }, [bookingId]);

  const mechanicName  = booking?.assignedMechanicId?.name ?? null;
  const garageName    = booking?.garageId?.garageName     ?? 'the Garage';
  const hasMechanic   = !!mechanicName;

  // ── Submit ──
  const handleSubmit = async () => {
    if (!garageRating) {
      Alert.alert('Rating Required', 'Please rate the garage before submitting.');
      return;
    }

    const payload = {
      garageRating,
      comment: comment.trim(),
    };
    if (hasMechanic && mechanicRating > 0) {
      payload.mechanicRating = mechanicRating;
    }

    setSubmitting(true);
    try {
      await submitReview(bookingId, payload);
      Alert.alert(
        'Review Submitted! 🌟',
        'Thank you for your feedback.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (e) {
      Alert.alert('Submission Failed', e.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──
  if (fetching) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Loading booking info...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Back row ── */}
      <TouchableOpacity style={styles.backRow} onPress={() => router.back()} hitSlop={12} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={20} color={ACCENT} />
        <Text style={styles.backRowText}>Back</Text>
      </TouchableOpacity>

      {/* ── Header ── */}
      <View style={styles.heroWrap}>
        <View style={styles.heroIconWrap}>
          <Ionicons name="star" size={32} color="#f39c12" />
        </View>
        <Text style={styles.screenTitle}>Leave a Review</Text>
        <Text style={styles.screenSubtitle}>
          Share your experience with {garageName}
        </Text>
      </View>

      {/* ── Garage rating ── */}
      <View style={styles.ratingCard}>
        <View style={styles.ratingCardHeader}>
          <View style={styles.ratingIconWrap}>
            <Feather name="tool" size={18} color={ACCENT} />
          </View>
          <View>
            <Text style={styles.ratingCardTitle}>Garage Rating</Text>
            <Text style={styles.ratingCardSub}>{garageName}</Text>
          </View>
        </View>

        <StarPicker value={garageRating} onChange={setGarageRating} />

        {garageRating > 0 && (
          <Text style={styles.ratingLabelText}>{ratingLabel(garageRating)}</Text>
        )}
      </View>

      {/* ── Mechanic rating (only if assigned) ── */}
      {hasMechanic && (
        <View style={styles.ratingCard}>
          <View style={styles.ratingCardHeader}>
            <View style={[styles.ratingIconWrap, { backgroundColor: '#eef6ff' }]}>
              <Feather name="user" size={18} color="#3498db" />
            </View>
            <View>
              <Text style={styles.ratingCardTitle}>Mechanic Rating</Text>
              <Text style={styles.ratingCardSub}>{mechanicName} · Optional</Text>
            </View>
          </View>

          <StarPicker value={mechanicRating} onChange={setMechanicRating} />

          {mechanicRating > 0 && (
            <Text style={[styles.ratingLabelText, { color: '#3498db' }]}>
              {ratingLabel(mechanicRating)}
            </Text>
          )}
        </View>
      )}

      {/* ── Comment ── */}
      <View style={styles.commentCard}>
        <View style={styles.commentHeader}>
          <Feather name="message-square" size={15} color={ACCENT} />
          <Text style={styles.commentTitle}>Your Comment</Text>
          <Text style={styles.commentOptional}>Optional</Text>
        </View>
        <TextInput
          style={styles.commentInput}
          placeholder="Tell others about your experience — the quality of service, professionalism, value for money..."
          placeholderTextColor="#b2bec3"
          multiline
          numberOfLines={6}
          maxLength={MAX_CHARS}
          value={comment}
          onChangeText={setComment}
          textAlignVertical="top"
        />
        <Text style={[
          styles.charCount,
          comment.length > MAX_CHARS * 0.9 && { color: '#e74c3c' },
        ]}>
          {comment.length} / {MAX_CHARS}
        </Text>
      </View>

      {/* ── Submit ── */}
      <TouchableOpacity
        style={[styles.submitBtn, (!garageRating || submitting) && styles.submitBtnDisabled]}
        activeOpacity={0.85}
        onPress={handleSubmit}
        disabled={!garageRating || submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="star" size={18} color="#fff" />
            <Text style={styles.submitBtnText}>Submit Review</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.footerNote}>
        Reviews help other customers find great service providers.
      </Text>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const cardShadow = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10 },
  android: { elevation: 2 },
});

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#f8f9fa' },
  contentContainer: { padding: 20, paddingTop: 16 },

  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#b2bec3', fontSize: 14 },

  backRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 20 },
  backRowText: { fontSize: 15, color: ACCENT, fontWeight: '600' },

  // ── Hero ──
  heroWrap: { alignItems: 'center', marginBottom: 28 },
  heroIconWrap: {
    width: 68, height: 68, borderRadius: 22,
    backgroundColor: '#fff9e6',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
    ...Platform.select({
      ios:     { shadowColor: '#f39c12', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  screenTitle:    { fontSize: 26, fontWeight: '800', color: '#1a1a2e', marginBottom: 6, letterSpacing: -0.3 },
  screenSubtitle: { fontSize: 14, color: '#b2bec3', textAlign: 'center' },

  // ── Rating cards ──
  ratingCard: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 20, marginBottom: 16,
    gap: 16, ...cardShadow,
  },
  ratingCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  ratingIconWrap:   {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: '#f4ecf7',
    justifyContent: 'center', alignItems: 'center',
  },
  ratingCardTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  ratingCardSub:   { fontSize: 13, color: '#636e72', marginTop: 2 },

  starsRow:       { flexDirection: 'row', gap: 8 },
  ratingLabelText: { fontSize: 14, fontWeight: '700', color: '#f39c12' },

  // ── Comment ──
  commentCard: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 20, marginBottom: 20, ...cardShadow,
  },
  commentHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginBottom: 14,
  },
  commentTitle:    { fontSize: 15, fontWeight: '700', color: '#1a1a2e', flex: 1 },
  commentOptional: { fontSize: 12, color: '#b2bec3', fontWeight: '600' },
  commentInput: {
    backgroundColor: '#f8f9fa', borderRadius: 12,
    borderWidth: 1, borderColor: '#e9ecef',
    padding: 14, fontSize: 15, color: '#1a1a2e',
    minHeight: 130, textAlignVertical: 'top',
    lineHeight: 22,
  },
  charCount: { fontSize: 12, color: '#b2bec3', textAlign: 'right', marginTop: 8 },

  // ── Submit ──
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: ACCENT, padding: 18, borderRadius: 16,
    ...Platform.select({
      ios:     { shadowColor: ACCENT, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.35, shadowRadius: 10 },
      android: { elevation: 5 },
    }),
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText:     { color: '#fff', fontSize: 17, fontWeight: '700' },

  footerNote: { fontSize: 12, color: '#b2bec3', textAlign: 'center', marginTop: 14 },
});

export default LeaveReview;
