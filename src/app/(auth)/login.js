import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import GoogleIcon from "../../../assets/icons/google.svg";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { useDispatch } from "react-redux";
import { useAuth } from "../../hooks/useAuth";
import { Link } from "expo-router";
import { authStorage } from "../../utils/authStorage";
import { setAuthHeader } from "../../services/api";
import { setToken } from "../../store/slices/authSlice";
import AuthBackground from "../../components/auth/AuthBackground";
import AuthCard from "../../components/auth/AuthCard";
import AuthTitle from "../../components/auth/AuthTitle";
import AuthInput from "../../components/auth/AuthInput";
import AuthButton from "../../components/auth/AuthButton";
import AuthLink from "../../components/auth/AuthLink";

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
    <AuthBackground>
      <AuthCard style={styles.card}>
        <View style={styles.content}>
          <View style={styles.avatar} />
          <AuthTitle>Bienvenidx!</AuthTitle>

          <View style={styles.form}>
            <AuthInput
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Correo electrónico"
              value={email}
              onChangeText={setEmail}
            />
            <AuthInput
              placeholder="Contraseña"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {!!localError && <Text style={styles.error}>{localError}</Text>}
          {!!error && <Text style={styles.error}>{String(error)}</Text>}

          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialButton} onPress={startGoogleLogin}>
              <GoogleIcon width={28} height={28} />
            </TouchableOpacity>
          </View>

          <View style={styles.buttonRow}>
            <AuthButton
              label={status === "loading" ? "Entrando…" : "Iniciar Sesión"}
              onPress={onSubmit}
              disabled={status === "loading"}
              style={styles.button}
            />
            <Link href="/(auth)/register" asChild>
              <AuthButton
                label="O Regístrate"
                variant="outline"
                style={styles.button}
              />
            </Link>
          </View>

          <AuthLink label="Continuar como invitadx" style={styles.link} />
        </View>
      </AuthCard>
    </AuthBackground>
  );
}


const styles = StyleSheet.create({
  card: {
    height: 744,
    marginBottom: 108,
    paddingTop: 136,
    paddingHorizontal: 30,
    paddingBottom: 24,
  },
  content: {
    alignItems: "center",
    gap: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#9FD4F2",
    marginBottom: 8,
  },
  form: {
    width: "100%",
    gap: 20,
    marginTop: 8,
  },
  socialRow: {
    flexDirection: "row",
    gap: 20,
    marginTop: 12,
  },
  socialButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  button: {
    flex: 1,
  },
  link: {
    marginTop: 8,
    paddingVertical: 12,
  },
  error: {
    color: "#D93B3B",
    marginTop: 4,
    textAlign: "center",
  },
});
