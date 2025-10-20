// src/hooks/useAuthGuard.js
import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSegments } from "expo-router";
import { useAuth } from "./useAuth";
import { useSelector } from "react-redux";
import { selectUserById as selectUserByIdFromUsers } from "../store/slices/userSlice";
import { isProfileComplete } from "../features/users/profileComplition";

const PUBLIC = new Set([
  "/login",
  "/auth/callback",
  "/(auth)/login",
  "/(auth)/callback",
]);

const REGISTER_PATH = "/(tabs)/perfil/settings/register";

export const useAuthGuard = () => {
  const { token, hydrated, user: authUser } = useAuth();
  const pathname = usePathname();
  const segments = useSegments();
  const router = useRouter();

  // Pull most recent local user (from SQLite via usersSlice)
  const localUser = useSelector((s) =>
    authUser?.userID ? selectUserByIdFromUsers(s, authUser.userID) : null
  );

  // Merge: local overrides server for completeness checks
  const effectiveUser = useMemo(
    () => ({ ...(authUser || {}), ...(localUser || {}) }),
    [authUser, localUser]
  );

  useEffect(() => {
    if (!hydrated) return;

    const inAuthGroup = segments[0] === "(auth)";
    const atRegister = pathname === REGISTER_PATH || pathname?.includes(REGISTER_PATH);
    const isPublic = PUBLIC.has(pathname) || inAuthGroup;

    // 1) Not logged in → any private route (including register) goes to login
    if (!token) {
      if (!isPublic) {
        console.log("🔐 [guard] no token → /(auth)/login");
        router.replace("/(auth)/login");
      }
      return;
    }

    // 2) Logged in but user not loaded yet → wait (avoid flicker/loops)
    if (!authUser) {
      return;
    }

    // 3) Logged in + user loaded → if profile incomplete, force register (unless already there)
    const incomplete = !isProfileComplete(effectiveUser);
    if (incomplete && !atRegister) {
      console.log("🧩 [guard] profile incomplete → /perfil/settings/register");
      router.replace(REGISTER_PATH);
      return;
    }

    // 4) Logged in + profile OK:
    //    If currently on public/auth routes, send to home
    if (!incomplete && isPublic) {
      console.log("🔐 [guard] token present on public/auth route → /");
      router.replace("/");
      return;
    }
  }, [hydrated, token, authUser, pathname, segments, router]);
};
