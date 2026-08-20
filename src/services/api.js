// -------------------------------------------------
// src/services/api.js
// -------------------------------------------------
import axios from 'axios';
import { authStorage } from '../utils/authStorage';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.galago.ec/api/v1/';

// Une la base con un path sin generar dobles barras ni depender de que
// EXPO_PUBLIC_API_URL exista (en web las vars se inlinean en build).
export const buildApiUrl = (path = '') =>
  `${API_URL.replace(/\/+$/, '')}/${String(path).replace(/^\/+/, '')}`;

export const api = axios.create({ baseURL: API_URL, timeout: 15000 });

// Helper to set/unset Authorization header after login/logout
export const setAuthHeader = (token) => {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
};

// Sesion expirada: la app registra aqui que hacer (ver useAuth).
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = typeof fn === 'function' ? fn : null;
};

// Rutas donde un 401 significa "credenciales malas", no "sesion expirada".
const AUTH_ENDPOINTS = ['auth/login', 'auth/sign-up', 'auth/google-login'];
const isAuthEndpoint = (url = '') =>
  AUTH_ENDPOINTS.some((route) => String(url).includes(route));

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const requestUrl = error?.config?.url || '';

    if (status === 401 && !isAuthEndpoint(requestUrl)) {
      setAuthHeader(null);
      try {
        await authStorage.clearToken();
      } catch {}
      onUnauthorized?.();
    }

    return Promise.reject(error);
  }
);
