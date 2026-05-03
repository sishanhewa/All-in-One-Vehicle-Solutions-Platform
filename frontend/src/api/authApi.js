import * as SecureStore from 'expo-secure-store';

// Base URL for authentication API
const AUTH_API_URL = 'https://all-in-one-vehicle-solutions-platform.onrender.com/api/auth';

export const registerUserAPI = async (userData) => {
  const response = await fetch(`${AUTH_API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Registration failed');
  return data;
};

export const loginUserAPI = async (userData) => {
  const response = await fetch(`${AUTH_API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Login failed');
  return data;
};

export const updateProfileAPI = async (userData) => {
  const token = await SecureStore.getItemAsync('userToken');
  const response = await fetch(`${AUTH_API_URL}/profile`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(userData),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to update profile');
  return data;
};
