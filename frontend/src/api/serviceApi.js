import * as SecureStore from 'expo-secure-store';

/** API origin (no trailing slash). */
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000';

export const SERVICE_API_URL = `${BASE_URL}/api/service`;

export const resolveServiceImageUrl = (path) => {
  if (!path) return 'https://via.placeholder.com/400x200?text=No+Image';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${BASE_URL}${path}`;
};

const getAuthHeader = async () => {
  const token = await SecureStore.getItemAsync('userToken');
  return { Authorization: `Bearer ${token}` };
};

/** Backend expects `{ reason }` for decline/cancel; accept a string or a full body object. */
const declineOrCancelBody = (reason) => {
  if (reason == null) return {};
  if (typeof reason === 'object') return reason;
  return { reason: String(reason) };
};

// --- Garages (public + owner; garageId in app = ServiceProvider._id) ---

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

export const fetchGarageById = async (id) => {
  const response = await fetch(`${SERVICE_API_URL}/garages/${id}`);
  if (!response.ok) throw new Error('Failed to fetch garage details');
  return response.json();
};

/** Multipart FormData; response includes user, token, and `serviceProvider` (not embedded profile). */
export const registerGarage = async (formData) => {
  const response = await fetch(`${SERVICE_API_URL}/garages/register`, {
    method: 'POST',
    body: formData,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Garage registration failed');
  return result;
};

/** Legacy: GET /garages/profile — same data model as ServiceProvider; prefer fetchOwnerGarage when possible. */
export const fetchOwnerProfile = async () => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/garages/profile`, {
    method: 'GET',
    headers: { ...auth },
  });
  if (!response.ok) throw new Error('Failed to fetch owner profile');
  return response.json();
};

/** Legacy: PUT /garages/profile (multipart). Prefer updateOwnerGarage for new code. */
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

export const fetchOwnerGarage = async () => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/garages/me`, {
    method: 'GET',
    headers: { ...auth },
  });
  if (!response.ok) throw new Error('Failed to fetch owner garage');
  return response.json();
};

/** Multipart FormData; optional `logo` file. Do not set Content-Type on the request. */
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

// --- Offerings (GarageOwner token for mutations) ---

export const createOffering = async (data) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/offerings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify(data),
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

// --- Mechanics ---

export const addMechanic = async (data) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/mechanics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify(data),
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

export const removeMechanic = async (id) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/mechanics/${id}`, {
    method: 'DELETE',
    headers: { ...auth },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to remove mechanic');
  return result;
};

// --- Bookings (createRepairBooking.data.garageId = ServiceProvider._id) ---

export const createRepairBooking = async (data) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to create booking');
  return result;
};

export const fetchMyRepairBookings = async (status = '') => {
  const auth = await getAuthHeader();
  const params = status && status !== 'All' ? `?status=${encodeURIComponent(status)}` : '';
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
  if (filters.mechanicId) params.append('mechanicId', filters.mechanicId);
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.append('dateTo', filters.dateTo);
  if (filters.date && !filters.dateFrom) params.append('dateFrom', filters.date);
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
  const params = status && status !== 'All' ? `?status=${encodeURIComponent(status)}` : '';
  const response = await fetch(`${SERVICE_API_URL}/bookings/my-jobs${params}`, {
    method: 'GET',
    headers: { ...auth },
  });
  if (!response.ok) throw new Error('Failed to fetch jobs');
  return response.json();
};

export const fetchRepairBookingById = async (id) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/bookings/${id}`, {
    method: 'GET',
    headers: { ...auth },
  });
  if (!response.ok) throw new Error('Failed to fetch booking details');
  return response.json();
};

export const confirmRepairBooking = async (id, data) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/bookings/${id}/confirm`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to confirm booking');
  return result;
};

export const declineRepairBooking = async (id, reason) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/bookings/${id}/decline`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify(declineOrCancelBody(reason)),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to decline booking');
  return result;
};

export const startJob = async (id) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/bookings/${id}/start`, {
    method: 'PUT',
    headers: { ...auth },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to start job');
  return result;
};

export const markJobReady = async (id) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/bookings/${id}/ready`, {
    method: 'PUT',
    headers: { ...auth },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to mark job ready');
  return result;
};

export const completeJob = async (id, invoiceData) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/bookings/${id}/complete`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify(invoiceData),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to complete job');
  return result;
};

export const cancelRepairBooking = async (id, reason) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/bookings/${id}/cancel`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify(declineOrCancelBody(reason)),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to cancel booking');
  return result;
};

export const updateJobNotes = async (id, data) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/bookings/${id}/notes`, {
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
