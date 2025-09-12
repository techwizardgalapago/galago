// -------------------------------------------------
// src/hooks/useAuthGuard.js (Optional guard for protected areas)
// -------------------------------------------------
import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from './useAuth';

export const useAuthGuard = () => {
  const { token, hydrated } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!token && !inAuthGroup) router.replace('/(auth)/login');
    if (token && inAuthGroup) router.replace('/');
  }, [hydrated, token, segments, router]);
};