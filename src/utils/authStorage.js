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
const USER_KEY = "auth_user_v1";

// El perfil se guarda como JSON. En nativo va a un archivo y no a SecureStore:
// no es un secreto, y SecureStore desaconseja valores grandes (las listas de
// favoritos crecen). En web, localStorage junto al token.
let FileSystem;
try {
  FileSystem = require("expo-file-system");
} catch {}

const userFilePath = () =>
  FileSystem?.documentDirectory
    ? `${FileSystem.documentDirectory}${USER_KEY}.json`
    : null;

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
  // Perfil del usuario en sesion. Permite pintar el perfil sin conexion, ya
  // que /auth/me es una llamada de red y offline nunca responde.
  getUser: async () => {
    try {
      if (Platform.OS === "web") {
        const crudo = window.localStorage.getItem(USER_KEY);
        return crudo ? JSON.parse(crudo) : null;
      }
      const ruta = userFilePath();
      if (!ruta) return null;
      const info = await FileSystem.getInfoAsync(ruta);
      if (!info.exists) return null;
      return JSON.parse(await FileSystem.readAsStringAsync(ruta));
    } catch {
      return null;
    }
  },
  setUser: async (user) => {
    try {
      if (!user) return authStorage.clearUser();
      const crudo = JSON.stringify(user);
      if (Platform.OS === "web") {
        window.localStorage.setItem(USER_KEY, crudo);
        return;
      }
      const ruta = userFilePath();
      if (ruta) await FileSystem.writeAsStringAsync(ruta, crudo);
    } catch {
      /* que no se pueda cachear el perfil no debe romper el login */
    }
  },
  clearUser: async () => {
    try {
      if (Platform.OS === "web") {
        window.localStorage.removeItem(USER_KEY);
        return;
      }
      const ruta = userFilePath();
      if (ruta) await FileSystem.deleteAsync(ruta, { idempotent: true });
    } catch {}
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
