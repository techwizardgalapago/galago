// =============================================
// Auth module ready for React Native + Web (Expo)
// Files combined in one gist-style document.
// Copy each section into its path.
// =============================================

// -------------------------------------------------
// src/utils/authStorage.js
// -------------------------------------------------
import { Platform } from "react-native";
let SecureStore;
try {
  SecureStore = require("expo-secure-store");
} catch {}

const WEB_KEY = "auth_token_v1";

export const authStorage = {
  getToken: async () => {
    if (Platform.OS === "web") {
      try {
        return window.localStorage.getItem(WEB_KEY);
      } catch {
        return null;
      }
    }
    if (SecureStore?.getItemAsync)
      return await SecureStore.getItemAsync(WEB_KEY);
    // Fallback in native if SecureStore unavailable
    return null;
  },
  setToken: async (token) => {
    if (!token) return authStorage.clearToken();
    if (Platform.OS === "web") {
      try {
        window.localStorage.setItem(WEB_KEY, token);
      } catch {}
      return;
    }
    if (SecureStore?.setItemAsync)
      return await SecureStore.setItemAsync(WEB_KEY, token);
  },
  clearToken: async () => {
    if (Platform.OS === "web") {
      try {
        window.localStorage.removeItem(WEB_KEY);
      } catch {}
      return;
    }
    if (SecureStore?.deleteItemAsync)
      return await SecureStore.deleteItemAsync(WEB_KEY);
  },
};
