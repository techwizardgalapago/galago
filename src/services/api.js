// -------------------------------------------------
// src/services/api.js
// -------------------------------------------------
import axios from 'axios';
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.galago.ec/api/v1/';

export const api = axios.create({ baseURL: API_URL, timeout: 15000 });

// Helper to set/unset Authorization header after login/logout
export const setAuthHeader = (token) => {
if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
else delete api.defaults.headers.common.Authorization;
};
