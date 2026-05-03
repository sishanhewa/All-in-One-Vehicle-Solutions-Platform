import * as SecureStore from 'expo-secure-store';

/** API origin (no trailing slash). */
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.9:5000';

export const SERVICE_API_URL = `${BASE_URL}/api/service`;

export const resolveServiceImageUrl = (path) => {
  if (!path) return 'https://via.placeholder.com/400x200?text=No+Image';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${BASE_URL}${path}`;
};

const getAuthHeader = async () => {
  const token = await SecureStore.getItemAsync('userToken');
  if (!token) return {};
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

export const fetchMechanicById = async (id) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/mechanics/${id}`, {
    method: 'GET',
    headers: { ...auth },
  });
  if (!response.ok) throw new Error('Failed to fetch mechanic');
  return response.json();
};

export const updateMechanic = async (id, data) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/mechanics/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to update mechanic');
  return result;
};

export const deactivateMechanic = async (id, isActive) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/mechanics/${id}/deactivate`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify({ isActive }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to update mechanic status');
  return result;
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

/** Mechanic self-service: view own profile (including populated garage info). */
export const fetchMechanicProfile = async () => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/mechanics/me`, {
    method: 'GET',
    headers: { ...auth },
  });
  if (!response.ok) throw new Error('Failed to fetch mechanic profile');
  return response.json();
};

/** Mechanic self-service: update own name / phone / password. */
export const updateMechanicProfile = async (data) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/mechanics/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to update mechanic profile');
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

export const fetchMyRepairBookings = async (status = '', page = 1, limit = 20) => {
  const auth = await getAuthHeader();
  const params = new URLSearchParams();
  if (status && status !== 'All') params.append('status', status);
  if (page > 1) params.append('page', page.toString());
  if (limit !== 20) params.append('limit', limit.toString());
  const queryString = params.toString();
  const response = await fetch(`${SERVICE_API_URL}/bookings/my-bookings${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
    headers: { ...auth },
  });
  if (!response.ok) throw new Error('Failed to fetch bookings');
  return response.json();
};

export const fetchBookingQueue = async (filters = {}, page = 1, limit = 20) => {
  const auth = await getAuthHeader();
  const params = new URLSearchParams();
  if (filters.status && filters.status !== 'All') params.append('status', filters.status);
  if (filters.mechanicId) params.append('mechanicId', filters.mechanicId);
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo)   params.append('dateTo',   filters.dateTo);
  if (page > 1) params.append('page', page.toString());
  if (limit !== 20) params.append('limit', limit.toString());

  const queryString = params.toString();
  const response = await fetch(`${SERVICE_API_URL}/bookings/queue${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
    headers: { ...auth },
  });
  if (!response.ok) throw new Error('Failed to fetch booking queue');
  return response.json();
};

export const fetchMyJobs = async (status = '', page = 1, limit = 20) => {
  const auth = await getAuthHeader();
  const params = new URLSearchParams();
  if (status && status !== 'All') params.append('status', status);
  if (page > 1) params.append('page', page.toString());
  if (limit !== 20) params.append('limit', limit.toString());
  const queryString = params.toString();
  const response = await fetch(`${SERVICE_API_URL}/bookings/my-jobs${queryString ? `?${queryString}` : ''}`, {
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

/** Customer edits a pending booking (date / time / vehicleInfo / notes). */
export const updateRepairBooking = async (id, data) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/bookings/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to update booking');
  return result;
};

/** GarageOwner reassigns mechanic on a confirmed/in-progress booking. */
export const reassignMechanic = async (bookingId, mechanicId, note = '') => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/bookings/${bookingId}/reassign`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify({ assignedMechanicId: mechanicId, note }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to reassign mechanic');
  return result;
};

/** Fetch single service offering by ID (public). */
export const fetchOfferingById = async (id) => {
  const response = await fetch(`${SERVICE_API_URL}/offerings/${id}`);
  if (!response.ok) throw new Error('Failed to fetch offering');
  return response.json();
};

// --- Admin API ---

export const adminFetchGarages = async () => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/admin/garages`, { headers: { ...auth } });
  if (!response.ok) throw new Error('Failed to fetch garages');
  return response.json();
};

export const adminVerifyGarage = async (id, isVerified) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/admin/garages/${id}/verify`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify({ isVerified }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed');
  return result;
};

export const adminSuspendGarage = async (id) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/admin/garages/${id}/suspend`, {
    method: 'PUT',
    headers: { ...auth },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed');
  return result;
};

export const adminDeleteGarage = async (id) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/admin/garages/${id}`, {
    method: 'DELETE',
    headers: { ...auth },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to delete garage');
  return result;
};

export const adminFetchBookings = async (params = {}) => {
  const auth = await getAuthHeader();
  const qs = new URLSearchParams(params).toString();
  const response = await fetch(`${SERVICE_API_URL}/admin/bookings${qs ? `?${qs}` : ''}`, {
    headers: { ...auth },
  });
  if (!response.ok) throw new Error('Failed to fetch bookings');
  return response.json();
};

export const adminDeleteBooking = async (id) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/admin/bookings/${id}`, {
    method: 'DELETE',
    headers: { ...auth },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to delete booking');
  return result;
};

export const adminFetchStats = async () => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/admin/stats`, { headers: { ...auth } });
  if (!response.ok) throw new Error('Failed to fetch stats');
  return response.json();
};

export const adminFetchUsers = async (params = {}) => {
  const auth = await getAuthHeader();
  const qs = new URLSearchParams(params).toString();
  const response = await fetch(`${SERVICE_API_URL}/admin/users${qs ? `?${qs}` : ''}`, {
    headers: { ...auth },
  });
  if (!response.ok) throw new Error('Failed to fetch users');
  return response.json();
};

export const adminGetUser = async (id) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/admin/users/${id}`, { headers: { ...auth } });
  if (!response.ok) throw new Error('Failed to fetch user');
  return response.json();
};

export const adminChangeUserRole = async (id, role) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/admin/users/${id}/role`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify({ role }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to change role');
  return result;
};

export const adminToggleUserActive = async (id) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${SERVICE_API_URL}/admin/users/${id}/toggle-active`, {
    method: 'PUT',
    headers: { ...auth },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to toggle user status');
  return result;
};
