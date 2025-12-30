// -------------------------------------------------
// src/app/(auth)/register.js
// -------------------------------------------------
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'expo-router';
import AuthBackground from '../../components/auth/AuthBackground';
import AuthCard from '../../components/auth/AuthCard';
import AuthTitle from '../../components/auth/AuthTitle';
import AuthInput from '../../components/auth/AuthInput';
import AuthButton from '../../components/auth/AuthButton';

export default function RegisterScreen() {
  const { status, error, doRegister } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const onSubmit = async () => {
    setLocalError('');
    if (!userEmail || !password || !firstName) { setLocalError('Completa nombre, email y contraseña'); return; }
    try {
      // El payload esta dentro de un array porque tenemos airtable en mente
      const payload = [{ fields: {firstName, lastName, userEmail, password} }];
      const res = await doRegister(payload);
      if (!res?.token) {
        alert('Cuenta creada. Ahora inicia sesión.');
      }
    } catch (e) {
      setLocalError(e?.message || 'Error al crear cuenta');
    }
  };

  return (
    <AuthBackground>
      <AuthCard style={styles.card}>
        <View style={styles.content}>
          <AuthTitle>Bienvenidx!</AuthTitle>

          <View style={styles.form}>
            <AuthInput
              placeholder="Nombre"
              value={firstName}
              onChangeText={setFirstName}
            />
            <AuthInput
              placeholder="Apellido"
              value={lastName}
              onChangeText={setLastName}
            />
            <AuthInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="Correo electrónico"
              value={userEmail}
              onChangeText={setUserEmail}
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

          <AuthButton
            label={status === 'loading' ? 'Creando…' : 'Regístrate'}
            variant="outline"
            onPress={onSubmit}
            disabled={status === 'loading'}
            style={styles.button}
          />

          <View style={styles.altBottom}>
            <Text style={styles.alt}>
              ¿Ya tienes cuenta? <Link href="/(auth)/login">Inicia sesión</Link>
            </Text>
          </View>
        </View>
      </AuthCard>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 800,
    marginBottom: 52,
    paddingTop: 88,
    paddingHorizontal: 30,
    paddingBottom: 30,
    position: 'relative',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    gap: 20,
  },
  form: {
    width: '100%',
    gap: 20,
  },
  button: {
    width: 303,
  },
  error: { color: '#D93B3B', textAlign: 'center' },
  altBottom: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  alt: { color: '#99A0A0', textAlign: 'center' },
});
