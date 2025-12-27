import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { useDispatch } from "react-redux";
import { useAuth } from "../../hooks/useAuth";
import { Link } from "expo-router";
import { authStorage } from "../../utils/authStorage";
import { setAuthHeader } from "../../services/api";
import { setToken } from "../../store/slices/authSlice";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { status, error, doLogin } = useAuth();
  const dispatch = useDispatch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");

  const api = process.env.EXPO_PUBLIC_API_URL;

  const onSubmit = async () => {
    setLocalError("");
    if (!email || !password) {
      setLocalError("Ingresa email y contraseña");
      return;
    }
    try {
      await doLogin({ email, password });
    } catch (e) {
      setLocalError(e?.message || "Error de autenticación");
    }
  };

  const extractTokenFromUrl = (url) => {
    if (!url) return null;
    const hash = url.split("#")[1] || "";
    const query = url.split("?")[1] || "";
    const params = hash || query;
    if (!params) return null;
    try {
      const usp = new URLSearchParams(params);
      return usp.get("token");
    } catch {
      const match = params
        .split("&")
        .map((p) => p.split("="))
        .find(([k]) => k === "token");
      return match ? match[1] : null;
    }
  };

  const startGoogleLogin = async () => {
    try {
      const redirectUri = AuthSession.makeRedirectUri({
        useProxy: Platform.OS !== "web",
        path: "callback",
      });
      const url = `${api}/auth/google-login?redirect_uri=${encodeURIComponent(
        redirectUri
      )}`;

      const res = await WebBrowser.openAuthSessionAsync(url, redirectUri);

      if (res.type !== "success" || !res.url) {
        if (res.type !== "dismiss" && res.type !== "cancel") {
          setLocalError("No se pudo completar el login con Google.");
        }
        return;
      }

      const token = extractTokenFromUrl(res.url);
      if (!token) {
        setLocalError("No se recibio token de Google.");
        return;
      }

      await authStorage.setToken(token);
      setAuthHeader(token);
      dispatch(setToken(token));
    } catch (e) {
      setLocalError(e?.message || "Error de autenticacion con Google");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Iniciar sesión</Text>

      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />

      <TextInput
        placeholder="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />

      {!!localError && <Text style={styles.error}>{localError}</Text>}
      {!!error && <Text style={styles.error}>{String(error)}</Text>}

      <TouchableOpacity style={styles.btn} onPress={onSubmit}>
        <Text style={styles.btnText}>
          {status === "loading" ? "Entrando…" : "Entrar"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnGoogle} onPress={startGoogleLogin}>
        <Text style={styles.btnGoogleText}>Continuar con Google</Text>
      </TouchableOpacity>

      <Text style={styles.alt}>
        ¿No tienes cuenta? <Link href="/(auth)/register">Crear cuenta</Link>
      </Text>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#0B0F14",
    justifyContent: "center",
  },
  title: {
    color: "white",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#121821",
    borderColor: "#1F2A37",
    borderWidth: 1,
    color: "white",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  btn: {
    backgroundColor: "#2563EB",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 4,
  },
  btnGoogle: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  btnGoogleText: { color: "#111827", fontWeight: "700" },
  btnText: { color: "white", fontWeight: "700" },
  error: { color: "#FCA5A5", marginBottom: 8, textAlign: "center" },
  alt: { color: "#9CA3AF", marginTop: 12, textAlign: "center" },
});
