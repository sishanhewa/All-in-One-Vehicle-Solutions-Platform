import * as SecureStore from 'expo-secure-store';

// Connecting via the Android Emulator's dedicated Localhost Bridge
const BASE_URL = 'http://10.0.2.2:5000';
export const API_URL = `${BASE_URL}/api/spare-parts`;

// Helper to resolve image URLs correctly (handles both local uploads and external URLs)
export const resolveImageUrl = (imagePath) => {
  if (!imagePath) return 'https://via.placeholder.com/400x200?text=No+Image';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
  return `${BASE_URL}${imagePath}`;
};

// Strips default "Any ..." placeholder values before sending to API
const cleanFilters = (params) => {
  const cleaned = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value && !value.toString().startsWith('Any') && !value.toString().startsWith('All') && value !== '') {
      cleaned[key] = value;
    }
  });
  return cleaned;
};

export const fetchParts = async (queryParams = {}) => {
  const clean = cleanFilters(queryParams);
  const params = new URLSearchParams(clean);
  const response = await fetch(`${API_URL}?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch spare parts');
  return response.json();
};

export const fetchPartById = async (id) => {
  const response = await fetch(`${API_URL}/${id}`);
  if (!response.ok) throw new Error('Failed to fetch spare part details');
  return response.json();
};

export const createPartAPI = async (formData) => {
  const token = await SecureStore.getItemAsync('userToken');

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to create spare part');
  }
  return response.json();
};

export const updatePartAPI = async (id, formData) => {
  const token = await SecureStore.getItemAsync('userToken');
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to update spare part');
  }
  return response.json();
};

export const deletePartAPI = async (id) => {
  const token = await SecureStore.getItemAsync('userToken');
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to delete spare part');
  }
  return response.json();
};

export const fetchMyParts = async () => {
  const token = await SecureStore.getItemAsync('userToken');
  const response = await fetch(`${API_URL}/my-parts`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Failed to fetch your spare parts');
  return response.json();
};
