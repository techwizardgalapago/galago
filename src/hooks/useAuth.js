// -------------------------------------------------
// src/hooks/useAuth.js
// -------------------------------------------------
import { useDispatch, useSelector } from "react-redux";
import { useCallback, useEffect, useMemo } from "react";
import {
  hydrateAuth,
  login,
  logout,
  register,
  fetchMe,
} from "../store/slices/authSlice";
import { authStorage } from "../utils/authStorage";
import { setAuthHeader } from "../services/api";
import { loginWithGoogleService } from "../services/authService";

// Compartido entre todas las instancias del hook (ver el efecto de abajo).
let tokenYaRefrescado = null;

export const useAuth = () => {
  const dispatch = useDispatch();
  const { user, token, status, error, hydrated } = useSelector((s) => s.auth);

  // hydrate token from storage once
  useEffect(() => {
    if (!hydrated) dispatch(hydrateAuth());
  }, [hydrated, dispatch]);

  // Refresca el perfil desde el servidor una vez por token. Antes solo se
  // pedia si no habia usuario, pero hydrateAuth ahora restaura el guardado y
  // sin esto el perfil se quedaria congelado en la copia local.
  //
  // El control esta a nivel de modulo, no en un ref del hook: useAuth se usa
  // en varias pantallas a la vez y con un ref por instancia cada una lanzaba
  // su propia peticion a /auth/me.
  useEffect(() => {
    if (!hydrated || !token) return;
    if (tokenYaRefrescado === token) return;
    tokenYaRefrescado = token;
    dispatch(fetchMe()); // sin conexion falla en silencio y queda la copia local
  }, [hydrated, token, dispatch]);

  const doLogin = useCallback(
    async ({ email, password }) => {
      const res = await dispatch(login({ email, password })).unwrap();
      await authStorage.setToken(res.token);
      setAuthHeader(res.token);
      return res;
    },
    [dispatch]
  );

  const doRegister = useCallback(
    async (payload) => {
      const res = await dispatch(register(payload)).unwrap();
      if (res?.token) {
        await authStorage.setToken(res.token);
        setAuthHeader(res.token);
      }
      return res;
    },
    [dispatch]
  );

  // Google: exchange idToken with backend
  const doLoginWithGoogle = useCallback(async (idToken) => {
    const res = await loginWithGoogleService({ idToken });
    if (res?.token) {
      await authStorage.setToken(res.token);
      setAuthHeader(res.token);
    }
    return res;
  }, []);

  const doLogout = useCallback(async () => {
    tokenYaRefrescado = null;
    await authStorage.clearToken();
    setAuthHeader(null);
    dispatch(logout());
  }, [dispatch]);

  return useMemo(
    () => ({
      user,
      token,
      status,
      error,
      hydrated,
      doLogin,
      doRegister,
      doLoginWithGoogle,
      doLogout,
    }),
    [
      user,
      token,
      status,
      error,
      hydrated,
      doLogin,
      doRegister,
      doLoginWithGoogle,
      doLogout,
    ]
  );
};
