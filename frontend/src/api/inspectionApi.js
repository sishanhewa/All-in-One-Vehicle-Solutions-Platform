import * as SecureStore from 'expo-secure-store';

// Base URL for inspection API - uses the same server as marketplace
export const INSPECTION_API_URL = 'https://all-in-one-vehicle-solutions-platform.onrender.com/api/inspection';

// Helper to resolve inspection image URLs
export const resolveInspectionImageUrl = (imagePath) => {
  if (!imagePath) return 'https://via.placeholder.com/400x200?text=No+Image';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
  return `https://all-in-one-vehicle-solutions-platform.onrender.com${imagePath}`;
};

// Helper to get auth header
const getAuthHeader = async () => {
  const token = await SecureStore.getItemAsync('userToken');
  return { 'Authorization': `Bearer ${token}` };
};

// ==========================================
// COMPANY APIs
// ==========================================

export const registerCompanyAPI = async (data) => {
  const response = await fetch(`${INSPECTION_API_URL}/companies/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Company registration failed');
  return result;
};

export const fetchAllCompanies = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.city && filters.city !== 'All Cities') params.append('city', filters.city);
  if (filters.search) params.append('search', filters.search);
  const response = await fetch(`${INSPECTION_API_URL}/companies?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch companies');
  return response.json();
};

export const fetchCompanyById = async (id) => {
  const response = await fetch(`${INSPECTION_API_URL}/companies/${id}`);
  if (!response.ok) throw new Error('Failed to fetch company details');
  return response.json();
};

export const fetchCompanyPackages = async (companyId) => {
  const response = await fetch(`${INSPECTION_API_URL}/companies/${companyId}/packages`);
  if (!response.ok) throw new Error('Failed to fetch company packages');
  return response.json();
};

export const updateCompanyProfileAPI = async (formData) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${INSPECTION_API_URL}/companies/profile`, {
    method: 'PUT',
    headers: { ...auth },
    body: formData,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to update profile');
  return result;
};

// ==========================================
// PACKAGE APIs
// ==========================================

export const createPackageAPI = async (formData) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${INSPECTION_API_URL}/packages`, {
    method: 'POST',
    headers: { ...auth },
    body: formData,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to create package');
  return result;
};

export const fetchMyPackages = async () => {
  const auth = await getAuthHeader();
  const response = await fetch(`${INSPECTION_API_URL}/packages/my-packages`, {
    method: 'GET',
    headers: { ...auth },
  });
  if (!response.ok) throw new Error('Failed to fetch packages');
  return response.json();
};

export const updatePackageAPI = async (id, formData) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${INSPECTION_API_URL}/packages/${id}`, {
    method: 'PUT',
    headers: { ...auth },
    body: formData,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to update package');
  return result;
};

export const deletePackageAPI = async (id) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${INSPECTION_API_URL}/packages/${id}`, {
    method: 'DELETE',
    headers: { ...auth },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to delete package');
  return result;
};

// ==========================================
// BOOKING APIs
// ==========================================

export const createBookingAPI = async (data) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${INSPECTION_API_URL}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to create booking');
  return result;
};

export const fetchMyBookings = async (status = '') => {
  const auth = await getAuthHeader();
  const params = status && status !== 'All' ? `?status=${status}` : '';
  const response = await fetch(`${INSPECTION_API_URL}/bookings/my-bookings${params}`, {
    method: 'GET',
    headers: { ...auth },
  });
  if (!response.ok) throw new Error('Failed to fetch bookings');
  return response.json();
};

export const fetchBookingById = async (id) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${INSPECTION_API_URL}/bookings/${id}`, {
    method: 'GET',
    headers: { ...auth },
  });
  if (!response.ok) throw new Error('Failed to fetch booking details');
  return response.json();
};

export const cancelBookingAPI = async (id, reason) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${INSPECTION_API_URL}/bookings/${id}/cancel`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify({ reason }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to cancel booking');
  return result;
};

export const fetchCompanyQueue = async (filters = {}) => {
  const auth = await getAuthHeader();
  const params = new URLSearchParams();
  if (filters.status && filters.status !== 'All') params.append('status', filters.status);
  if (filters.date) params.append('date', filters.date);
  const response = await fetch(`${INSPECTION_API_URL}/bookings/queue?${params.toString()}`, {
    method: 'GET',
    headers: { ...auth },
  });
  if (!response.ok) throw new Error('Failed to fetch queue');
  return response.json();
};

export const confirmBookingAPI = async (id) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${INSPECTION_API_URL}/bookings/${id}/confirm`, {
    method: 'PUT',
    headers: { ...auth },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to confirm booking');
  return result;
};

export const startInspectionAPI = async (id) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${INSPECTION_API_URL}/bookings/${id}/start`, {
    method: 'PUT',
    headers: { ...auth },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to start inspection');
  return result;
};

export const completeInspectionAPI = async (id, data) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${INSPECTION_API_URL}/bookings/${id}/complete`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to complete inspection');
  return result;
};

export const uploadReportImagesAPI = async (id, formData) => {
  const auth = await getAuthHeader();
  const response = await fetch(`${INSPECTION_API_URL}/bookings/${id}/images`, {
    method: 'POST',
    headers: { ...auth },
    body: formData,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to upload images');
  return result;
};
