import * as SecureStore from 'expo-secure-store';

// Base URL for service API - uses EXPO_PUBLIC_API_URL env variable
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000';
export const SERVICE_API_URL = `${API_URL}/api/service`;

// Helper to resolve service image URLs
export const resolveServiceImageUrl = (imagePath) => {
  if (!imagePath) return 'https://via.placeholder.com/400x200?text=No+Image';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
  return `${API_URL}${imagePath}`;
};

// Helper to get auth header
const getAuthHeader = async () => {
  const token = await SecureStore.getItemAsync('userToken');
  return { 'Authorization': `Bearer ${token}` };
};

// ==========================================
// GARAGE APIs
// Public list/detail return ServiceProvider-shaped garages; garageId elsewhere is ServiceProvider._id.
// ==========================================

export const fetchAllGarages = async (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.city && params.city !== 'All Cities') queryParams.append('city', params.city);
  if (params.search) queryParams.append('search', params.search);
  if (params.category) queryParams.append('category', params.category);
  if (params.page) queryParams.append('page', params.page);

  const queryString = queryParams.toString();
  const response = await fetch(`${SERVICE_API_URL}/garages${queryString ? `?${queryString}` : ''}`);
  if (!response.ok) throw new Error('Failed to fetch garages');
  return response.json();
};

export const fetchGarageById = async (garageId) => {
  const response = await fetch(`${SERVICE_API_URL}/garages/${garageId}`);
  if (!response.ok) throw new Error('Failed to fetch garage details');
  return response.json();
};

/** Multipart register; response includes token, user fields, and serviceProvider object. */
export const registerGarage = async (formData) => {
  const response = await fetch(`${SERVICE_API_URL}/garages/register`, {
    method: 'POST',
    body: formData,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Garage registration failed');
  return result;
};

export const fetchOwnerProfile = async () => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/garages/profile`, {
    method: 'GET',
    headers: { ...auth },
  });
  if (!response.ok) throw new Error('Failed to fetch owner profile');
  return response.json();
};

export const updateOwnerProfile = async (formData) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/garages/profile`, {
    method: 'PUT',
    headers: { ...auth },
    body: formData,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to update profile');
  return result;
};

/** GET /garages/me — current GarageOwner’s ServiceProvider (requires GarageOwner token). */
export const fetchOwnerGarage = async () => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/garages/me`, {
    method: 'GET',
    headers: { ...auth },
  });
  if (!response.ok) throw new Error('Failed to fetch owner garage');
  return response.json();
};

/**
 * PUT /garages/me — update garage fields (multipart FormData; optional `logo` file).
 * Do not set Content-Type; fetch sets multipart boundary.
 */
export const updateOwnerGarage = async (formData) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/garages/me`, {
    method: 'PUT',
    headers: { ...auth },
    body: formData,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to update garage');
  return result;
};

// ==========================================
// OFFERING APIs (POST/PUT/DELETE require GarageOwner token)
// ==========================================

export const createOffering = async (offeringData) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/offerings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify(offeringData),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to create offering');
  return result;
};

export const fetchMyOfferings = async () => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/offerings/my-offerings`, {
    method: 'GET',
    headers: { ...auth },
  });
  if (!response.ok) throw new Error('Failed to fetch offerings');
  return response.json();
};

export const fetchGarageOfferings = async (garageId) => {
  const response = await fetch(`${SERVICE_API_URL}/garages/${garageId}/offerings`);
  if (!response.ok) throw new Error('Failed to fetch garage offerings');
  return response.json();
};

export const updateOffering = async (offeringId, data) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/offerings/${offeringId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to update offering');
  return result;
};

export const deleteOffering = async (offeringId) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/offerings/${offeringId}`, {
    method: 'DELETE',
    headers: { ...auth },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to delete offering');
  return result;
};

// ==========================================
// MECHANIC APIs
// ==========================================

export const addMechanic = async (mechanicData) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/mechanics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify(mechanicData),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to add mechanic');
  return result;
};

export const fetchMyMechanics = async () => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/mechanics`, {
    method: 'GET',
    headers: { ...auth },
  });
  if (!response.ok) throw new Error('Failed to fetch mechanics');
  return response.json();
};

export const removeMechanic = async (mechanicId) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/mechanics/${mechanicId}`, {
    method: 'DELETE',
    headers: { ...auth },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to remove mechanic');
  return result;
};

// ==========================================
// BOOKING APIs (bookingData.garageId = ServiceProvider._id)
// ==========================================

export const createRepairBooking = async (bookingData) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify(bookingData),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to create booking');
  return result;
};

export const fetchMyRepairBookings = async (status = '') => {
  const auth = await getAuthHeader();
  const params = status && status !== 'All' ? `?status=${status}` : '';
  const response = await fetch(`${SERVICE_API_URL}/bookings/my-bookings${params}`, {
    method: 'GET',
    headers: { ...auth },
  });
  if (!response.ok) throw new Error('Failed to fetch bookings');
  return response.json();
};

export const fetchBookingQueue = async (filters = {}) => {
  const auth = await getAuthHeader();
  const params = new URLSearchParams();
  if (filters.status && filters.status !== 'All') params.append('status', filters.status);
  if (filters.date) params.append('date', filters.date);
  const queryString = params.toString();
  const response = await fetch(`${SERVICE_API_URL}/bookings/queue${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
    headers: { ...auth },
  });
  if (!response.ok) throw new Error('Failed to fetch booking queue');
  return response.json();
};

export const fetchMyJobs = async (status = '') => {
  const auth = await getAuthHeader();
  const params = status && status !== 'All' ? `?status=${status}` : '';
  const response = await fetch(`${SERVICE_API_URL}/bookings/my-jobs${params}`, {
    method: 'GET',
    headers: { ...auth },
  });
  if (!response.ok) throw new Error('Failed to fetch jobs');
  return response.json();
};

export const fetchRepairBookingById = async (bookingId) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/bookings/${bookingId}`, {
    method: 'GET',
    headers: { ...auth },
  });
  if (!response.ok) throw new Error('Failed to fetch booking details');
  return response.json();
};

export const confirmRepairBooking = async (bookingId, data) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/bookings/${bookingId}/confirm`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to confirm booking');
  return result;
};

export const declineRepairBooking = async (bookingId, data) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/bookings/${bookingId}/decline`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to decline booking');
  return result;
};

export const startJob = async (bookingId) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/bookings/${bookingId}/start`, {
    method: 'PUT',
    headers: { ...auth },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to start job');
  return result;
};

export const markJobReady = async (bookingId) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/bookings/${bookingId}/ready`, {
    method: 'PUT',
    headers: { ...auth },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to mark job ready');
  return result;
};

export const completeJob = async (bookingId, data) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/bookings/${bookingId}/complete`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to complete job');
  return result;
};

export const cancelRepairBooking = async (bookingId, data) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/bookings/${bookingId}/cancel`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to cancel booking');
  return result;
};

export const updateJobNotes = async (bookingId, data) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/bookings/${bookingId}/notes`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to update job notes');
  return result;
};

export const submitReview = async (bookingId, reviewData) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/bookings/${bookingId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify(reviewData),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to submit review');
  return result;
};
