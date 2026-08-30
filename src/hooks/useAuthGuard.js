// src/hooks/useAuthGuard.js
import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSegments } from "expo-router";
import { useAuth } from "./useAuth";
import { useSelector } from "react-redux";
import { selectUserById as selectUserByIdFromUsers } from "../store/slices/userSlice";
import { decideRedirect } from "../features/users/authRedirect";

export const useAuthGuard = () => {
  const { token, hydrated, user: authUser } = useAuth();
  const pathname = usePathname();
  const segments = useSegments();
  const router = useRouter();

  // El usuario local (SQLite) manda sobre el remoto para decidir si el perfil
  // esta completo: puede haberse completado sin conexion.
  const localUser = useSelector((s) =>
    authUser?.userID ? selectUserByIdFromUsers(s, authUser.userID) : null
  );

  const effectiveUser = useMemo(
    () => (authUser || localUser ? { ...(authUser || {}), ...(localUser || {}) } : null),
    [authUser, localUser]
  );

  useEffect(() => {
    const destino = decideRedirect({
      hydrated,
      token,
      user: effectiveUser,
      pathname,
      segments,
    });
    if (destino) router.replace(destino);
  }, [hydrated, token, effectiveUser, pathname, segments, router]);
};
