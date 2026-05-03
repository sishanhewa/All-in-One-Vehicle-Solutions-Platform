// Connecting via the Android Emulator's dedicated Localhost Bridge
export const API_URL = 'https://all-in-one-vehicle-solutions-platform.onrender.com/api/marketplace';
import * as SecureStore from 'expo-secure-store';

// Helper to resolve image URLs correctly (handles both local uploads and external URLs)
export const resolveImageUrl = (imagePath) => {
  if (!imagePath) return 'https://via.placeholder.com/400x200?text=No+Image';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
  return `https://all-in-one-vehicle-solutions-platform.onrender.com${imagePath}`;
};

// Strips default "Any ..." placeholder values before sending to API
const cleanFilters = (params) => {
  const cleaned = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value && !value.toString().startsWith('Any') && value !== '') {
      cleaned[key] = value;
    }
  });
  return cleaned;
};

export const fetchListings = async (queryParams = {}) => {
  const clean = cleanFilters(queryParams);
  const params = new URLSearchParams(clean);
  const response = await fetch(`${API_URL}?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch listings');
  return response.json();
};

export const createListing = async (formData) => {
  const token = await SecureStore.getItemAsync('userToken');

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData,
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to create listing');
  }
  return response.json();
};

export const fetchMyListings = async () => {
  const token = await SecureStore.getItemAsync('userToken');
  const response = await fetch(`${API_URL}/my-listings`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) throw new Error('Failed to fetch your listings');
  return response.json();
};

export const updateListingAPI = async (id, formData) => {
  const token = await SecureStore.getItemAsync('userToken');
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData,
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to update listing');
  }
  return response.json();
};

export const deleteListingAPI = async (id) => {
  const token = await SecureStore.getItemAsync('userToken');
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to delete listing');
  }
  return response.json();
};
