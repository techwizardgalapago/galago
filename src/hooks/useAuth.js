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

export const useAuth = () => {
  const dispatch = useDispatch();
  const { user, token, status, error, hydrated } = useSelector((s) => s.auth);

  // hydrate token from storage once
  useEffect(() => {
    if (!hydrated) dispatch(hydrateAuth());
  }, [hydrated, dispatch]);

  // if we have token but no user, try fetchMe
  useEffect(() => {
    if (hydrated && token && !user) dispatch(fetchMe());
  }, [hydrated, token, user, dispatch]);

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
