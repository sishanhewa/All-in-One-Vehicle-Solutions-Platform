import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'https://all-in-one-vehicle-solutions-platform.onrender.com';
export const API_URL = `${BASE_URL}/api/support`;

export const resolveImageUrl = (imagePath) => {
  if (!imagePath) return 'https://via.placeholder.com/400x200?text=No+Image';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
  return `${BASE_URL}${imagePath}`;
};

const cleanFilters = (params) => {
  const cleaned = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value && !value.toString().startsWith('All') && !value.toString().startsWith('Any') && value !== '') {
      cleaned[key] = value;
    }
  });
  return cleaned;
};

export const fetchTickets = async (queryParams = {}) => {
  const clean = cleanFilters(queryParams);
  const params = new URLSearchParams(clean);
  const response = await fetch(`${API_URL}?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch tickets');
  return response.json();
};

export const fetchMyTickets = async () => {
  const token = await SecureStore.getItemAsync('userToken');
  const response = await fetch(`${API_URL}/my-tickets`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch your tickets');
  return response.json();
};

export const fetchTicketById = async (id) => {
  const token = await SecureStore.getItemAsync('userToken');
  const response = await fetch(`${API_URL}/${id}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch ticket details');
  return response.json();
};

export const createTicketAPI = async (formData) => {
  const token = await SecureStore.getItemAsync('userToken');
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to create ticket');
  }
  return response.json();
};

export const updateTicketAPI = async (id, formData) => {
  const token = await SecureStore.getItemAsync('userToken');
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to update ticket');
  }
  return response.json();
};

export const deleteTicketAPI = async (id) => {
  const token = await SecureStore.getItemAsync('userToken');
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to delete ticket');
  }
  return response.json();
};

export const addResponseAPI = async (id, message) => {
  const token = await SecureStore.getItemAsync('userToken');
  const response = await fetch(`${API_URL}/${id}/respond`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({ message }),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to add response');
  }
  return response.json();
};

export const updateStatusAPI = async (id, status) => {
  const token = await SecureStore.getItemAsync('userToken');
  const response = await fetch(`${API_URL}/${id}/status`, {
    method: 'PATCH',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to update status');
  }
  return response.json();
};
