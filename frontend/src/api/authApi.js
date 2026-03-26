import { API_URL } from './marketplaceApi';

export const registerUserAPI = async (userData) => {
  const response = await fetch(`${API_URL.replace('/marketplace', '/auth/register')}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Registration failed');
  return data;
};

export const loginUserAPI = async (userData) => {
  const response = await fetch(`${API_URL.replace('/marketplace', '/auth/login')}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Login failed');
  return data;
};
