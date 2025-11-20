// src/app/auth/callback.js
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { router } from "expo-router";
import { authStorage } from "../../utils/authStorage";
import { setAuthHeader } from "../../services/api";
import { setToken } from "../../store/slices/authSlice";

export default function AuthCallback() {
  const dispatch = useDispatch();
  const reduxToken = useSelector((state) => state?.auth?.token);
  const hydrated = useSelector((state) => state?.auth?.hydrated);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    const token = params.get("token");

    // Debug logs
    console.log("[callback] url:", typeof window !== "undefined" ? window.location.href : "");
    console.log("[callback] token from hash:", token ? token.slice(0, 12) + "…" : "(none)");
    console.log("[callback] reduxToken BEFORE:", reduxToken, "hydrated:", hydrated);

    (async () => {
      if (!token) {
        console.log("[callback] No token found — redirecting to login");
        router.replace("/login"); // or "/(auth)/login" if that's your actual path
        return;
      }

      try {
        await authStorage.setToken(token);
        setAuthHeader(token);
        dispatch(setToken(token));
        console.log("[callback] ✅ Token saved & Redux updated, going home");
        router.replace("/perfil");
      } catch (err) {
        console.error("[callback] ❌ Error handling token:", err);
        router.replace("/login");
      }
    })();
  }, []);

  return null;
}
