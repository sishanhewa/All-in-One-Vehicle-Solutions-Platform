import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'http://192.168.8.100:5000';
export const API_URL = `${BASE_URL}/api/admin`;

const getAuthHeaders = async () => {
  const token = await SecureStore.getItemAsync('userToken');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export const fetchDashboardStats = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/dashboard`, { headers });
  if (!response.ok) throw new Error('Failed to fetch stats');
  return response.json();
};

export const fetchUsers = async (role = 'All', search = '') => {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams();
  if (role !== 'All') params.append('role', role);
  if (search) params.append('search', search);
  
  const response = await fetch(`${API_URL}/users?${params.toString()}`, { headers });
  if (!response.ok) throw new Error('Failed to fetch users');
  return response.json();
};

export const fetchUserById = async (id) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/users/${id}`, { headers });
  if (!response.ok) throw new Error('Failed to fetch user details');
  return response.json();
};

export const updateUserRole = async (id, role) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/users/${id}/role`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ role }),
  });
  if (!response.ok) throw new Error('Failed to update role');
  return response.json();
};

export const deleteUser = async (id) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/users/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!response.ok) throw new Error('Failed to delete user');
  return response.json();
};

export const fetchListings = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/listings`, { headers });
  if (!response.ok) throw new Error('Failed to fetch listings');
  return response.json();
};

export const updateListingStatus = async (id, status) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/listings/${id}/status`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error('Failed to update status');
  return response.json();
};

export const deleteListing = async (id) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/listings/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!response.ok) throw new Error('Failed to delete listing');
  return response.json();
};

export const fetchRentals = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/rentals`, { headers });
  if (!response.ok) throw new Error('Failed to fetch rentals');
  return response.json();
};

export const deleteRental = async (id) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/rentals/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!response.ok) throw new Error('Failed to delete rental');
  return response.json();
};

export const fetchParts = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/parts`, { headers });
  if (!response.ok) throw new Error('Failed to fetch parts');
  return response.json();
};

export const deletePart = async (id) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/parts/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!response.ok) throw new Error('Failed to delete part');
  return response.json();
};

export const fetchTickets = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/tickets`, { headers });
  if (!response.ok) throw new Error('Failed to fetch tickets');
  return response.json();
};

export const assignTicketStatus = async (id, status) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/tickets/${id}/status`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error('Failed to update status');
  return response.json();
};

export const respondToTicket = async (id, message) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/tickets/${id}/respond`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message }),
  });
  if (!response.ok) throw new Error('Failed to respond to ticket');
  return response.json();
};

export const deleteTicket = async (id) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/tickets/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!response.ok) throw new Error('Failed to delete ticket');
  return response.json();
};

export const fetchInspections = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/inspections`, { headers });
  if (!response.ok) throw new Error('Failed to fetch inspections');
  return response.json();
};

export const updateBookingStatus = async (id, status) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/inspections/${id}/status`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error('Failed to update status');
  return response.json();
};
