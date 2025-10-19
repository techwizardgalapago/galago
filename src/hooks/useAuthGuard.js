import { useEffect } from "react";
import { usePathname, useRouter, useSegments } from "expo-router";
import { useAuth } from "./useAuth";

const PUBLIC = new Set([
  "/login",
  "/auth/callback",
  "/(auth)/login",
  "/(auth)/callback",
]);

export const useAuthGuard = () => {
  const { token, hydrated } = useAuth();
  const pathname = usePathname();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;

    const inAuthGroup = segments[0] === "(auth)";
    const isPublic = PUBLIC.has(pathname);

    // Si ya tengo token y estoy en pantallas públicas → ir al home
    if (token && (isPublic || inAuthGroup)) {
      console.log("🔐 [guard] token presente → /");
      router.replace("/");
      return;
    }

    // Si NO tengo token y estoy en una ruta privada → ir al login
    if (!token && !isPublic && !inAuthGroup) {
      console.log("🔐 [guard] sin token y ruta privada → /(auth)/login");
      router.replace("/(auth)/login");
    }
  }, [hydrated, token, pathname, segments, router]);
};
