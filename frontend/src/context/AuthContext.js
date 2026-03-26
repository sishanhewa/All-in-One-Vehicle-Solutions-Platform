import React, { createContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { loginUserAPI, registerUserAPI } from '../api/authApi';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userInfo, setUserInfo] = useState(null);
  const [userToken, setUserToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Re-hydrate session on app boot
  const loadStoredUser = async () => {
    try {
      setIsLoading(true);
      let foundUserInfo = await SecureStore.getItemAsync('userInfo');
      let foundUserToken = await SecureStore.getItemAsync('userToken');

      if (foundUserInfo) setUserInfo(JSON.parse(foundUserInfo));
      if (foundUserToken) setUserToken(foundUserToken);
    } catch (e) {
      console.log(`Failed fetching stored user info: ${e}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStoredUser();
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const resp = await loginUserAPI({ email, password });
      setUserInfo(resp);
      setUserToken(resp.token);
      await SecureStore.setItemAsync('userInfo', JSON.stringify(resp));
      await SecureStore.setItemAsync('userToken', resp.token);
      return resp;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name, email, password, phone) => {
    setIsLoading(true);
    try {
      const resp = await registerUserAPI({ name, email, password, phone });
      setUserInfo(resp);
      setUserToken(resp.token);
      await SecureStore.setItemAsync('userInfo', JSON.stringify(resp));
      await SecureStore.setItemAsync('userToken', resp.token);
      return resp;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      setUserInfo(null);
      setUserToken(null);
      await SecureStore.deleteItemAsync('userInfo');
      await SecureStore.deleteItemAsync('userToken');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ login, register, logout, isLoading, userToken, userInfo }}>
      {children}
    </AuthContext.Provider>
  );
};
