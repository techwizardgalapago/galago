// -------------------------------------------------
// src/app/(auth)/register.js
// -------------------------------------------------
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen() {
  const { status, error, doRegister, doLoginWithGoogle } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const onSubmit = async () => {
    setLocalError('');
    if (!email || !password || !firstName) { setLocalError('Completa nombre, email y contraseña'); return; }
    try {
      const payload = { firstName, lastName, email, password };
      const res = await doRegister(payload);
      if (!res?.token) {
        alert('Cuenta creada. Ahora inicia sesión.');
      }
    } catch (e) {
      setLocalError(e?.message || 'Error al crear cuenta');
    }
  };

  // --- Google OAuth (Sign up / Sign in) ---
  const redirectUri = AuthSession.makeRedirectUri({ useProxy: Platform.OS !== 'web' });
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    redirectUri,
    scopes: ['profile', 'email'],
    responseType: 'id_token',
    extraParams: { prompt: 'select_account' },
  });

  const onGooglePress = async () => {
    try {
      const res = await promptAsync({ useProxy: Platform.OS !== 'web' });
      if (res?.type === 'success') {
        const idToken = res.params?.id_token || res.authentication?.idToken;
        if (!idToken) throw new Error('No id_token from Google');
        // Backend should create the user if not existing, and return { token, user }
        await doLoginWithGoogle(idToken);
      }
    } catch (err) {
      setLocalError(err?.message || 'Google sign-in failed');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crear cuenta</Text>

      <TextInput placeholder="Nombre" placeholderTextColor="#9CA3AF" value={firstName} onChangeText={setFirstName} style={styles.input} />
      <TextInput placeholder="Apellido" placeholderTextColor="#9CA3AF" value={lastName} onChangeText={setLastName} style={styles.input} />
      <TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="Correo electrónico" placeholderTextColor="#9CA3AF" value={email} onChangeText={setEmail} style={styles.input} />
      <TextInput placeholder="Contraseña" placeholderTextColor="#9CA3AF" secureTextEntry value={password} onChangeText={setPassword} style={styles.input} />

      {!!localError && <Text style={styles.error}>{localError}</Text>}
      {!!error && <Text style={styles.error}>{String(error)}</Text>}

      <TouchableOpacity style={styles.btn} onPress={onSubmit} disabled={status === 'loading'}>
        <Text style={styles.btnText}>{status === 'loading' ? 'Creando…' : 'Crear cuenta'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnGoogle} onPress={onGooglePress} disabled={!request}>
        <Text style={styles.btnGoogleText}>Continuar con Google</Text>
      </TouchableOpacity>

      <Text style={styles.alt}>¿Ya tienes cuenta? <Link href="/(auth)/login">Inicia sesión</Link></Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#0B0F14', justifyContent: 'center' },
  title: { color: 'white', fontSize: 24, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  input: { backgroundColor: '#121821', borderColor: '#1F2A37', borderWidth: 1, color: 'white', padding: 12, borderRadius: 12, marginBottom: 12 },
  btn: { backgroundColor: '#2563EB', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  btnText: { color: 'white', fontWeight: '700' },
  btnGoogle: { backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnGoogleText: { color: '#111827', fontWeight: '700' },
  error: { color: '#FCA5A5', marginBottom: 8, textAlign: 'center' },
  alt: { color: '#9CA3AF', marginTop: 12, textAlign: 'center' },
});
