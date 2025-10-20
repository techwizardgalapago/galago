// src/hooks/useRequireProfile.js
import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useSelector } from 'react-redux';
import { isProfileComplete } from '@/features/users/profileCompletion';

// This hook relies on the user in auth slice (Airtable payload).
// If you also hydrate local users into Redux, you can merge them here if needed.

export const useRequireProfile = () => {
  const router = useRouter();
  const segments = useSegments(); // useful to avoid loops on the same route
  const { user, hydrated, token } = useSelector((s) => s.auth || {});

  useEffect(() => {
    if (!hydrated) return;      // wait until auth hydration
    if (!token) return;         // not logged in → your existing guards handle it

    // If user exists but profile incomplete, force register page
    if (user && !isProfileComplete(user)) {
      const atRegister = segments.join('/').includes('perfil/settings/register');
      if (!atRegister) {
        router.replace('/perfil/settings/register');
      }
    }
  }, [hydrated, token, user, segments, router]);
};
