// -------------------------------------------------
// src/store/slices/authSlice.js
// -------------------------------------------------
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authStorage } from '../../utils/authStorage';
import { setAuthHeader } from '../../services/api';
import { loginService, registerService, fetchMeService } from '../../services/authService';
import { patchUserProfile } from '../../services/usersService';
import { upsertVenueLocal } from './venueSlice';

const initialState = {
  user: null,
  token: null,
  status: 'idle',
  error: null,
  hydrated: false, // to know when we've loaded token from storage
};

export const hydrateAuth = createAsyncThunk('auth/hydrate', async () => {
  const token = await authStorage.getToken();
  if (token) setAuthHeader(token);
  // El perfil guardado permite pintar la pantalla de perfil sin conexion,
  // mientras fetchMe lo refresca si hay red.
  const user = token ? await authStorage.getUser() : null;
  return { token, user };
});

export const login = createAsyncThunk('auth/login', async ({ email, password }) => {
  const { token, fields } = await loginService({ email, password });
  const user = fields[0];
  // El header se arma AQUI, antes de que el token llegue al estado. En cuanto
  // se guarda en Redux, useAuth reacciona y pide /auth/me: si el header se
  // pusiera despues (al volver de unwrap), esa peticion saldria sin
  // Authorization, el backend responderia 401 y el interceptor cerraria la
  // sesion recien abierta.
  if (token) setAuthHeader(token);
  return { token, user };
});

export const register = createAsyncThunk('auth/register', async (payload) => {
  const res = await registerService(payload);
  // /auth/sign-up responde con la misma forma que /auth/login: { fields, token }.
  // Se normaliza aqui igual que en login; el reducer esperaba `user` y recibia
  // undefined, asi que la sesion quedaba con token pero sin usuario y
  // useAuthGuard se quedaba esperando sin redirigir a ningun sitio.
  const user = Array.isArray(res?.fields) ? res.fields[0] : res?.user ?? null;
  if (res?.token) setAuthHeader(res.token); // mismo motivo que en login
  return { ...res, user };
});

export const fetchMe = createAsyncThunk('auth/fetchMe', async () => {
  const user = await fetchMeService()
  return { user: user.user};
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // 🔹 NEW: set token directly (used by Google callback)
    setToken(state, action) {
      state.token = action.payload || null;
      state.error = null;
    },
    // 🔹 Optional helpers (handy in some flows)
    setUser(state, action) {
      state.user = action.payload || null;
      authStorage.setUser(state.user);
    },
    setHydrated(state, action) {
      state.hydrated = action.payload ?? true;
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.status = 'idle';
      state.error = null;
      authStorage.clearUser();
    },
    setAuthUserPatch(state, action) {
      const patch = action.payload || {};
      if (!state.user) state.user = {};
      state.user = { ...state.user, ...patch };
      // Incluye los favoritos: sin esto, marcar uno y abrir la app sin
      // conexion mostraria el estado anterior.
      authStorage.setUser(state.user);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(hydrateAuth.fulfilled, (state, action) => {
        state.hydrated = true;
        if (action.payload?.token) state.token = action.payload.token;
        if (action.payload?.user) state.user = action.payload.user;
      })
      .addCase(hydrateAuth.rejected, (state) => { state.hydrated = true; })

      .addCase(login.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.token = action.payload.token;
        state.user = action.payload.user;
        authStorage.setUser(action.payload.user);
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error?.message || 'Login failed';
      })

      .addCase(register.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(register.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (action.payload?.token) {
          state.token = action.payload.token;
          state.user = action.payload.user || null;
          authStorage.setUser(state.user);
        }
      })
      .addCase(register.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error?.response?.data || action.error?.message || 'Register failed';
      })

      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload.user;
        authStorage.setUser(action.payload.user);
      })
      .addCase(fetchMe.rejected, () => { /* el interceptor 401 en api.js cierra la sesion */ });
  }
});

// ⬅️ Export the new actions
export const { setToken, setUser, setHydrated, logout, setAuthUserPatch } = authSlice.actions;

export const toggleFavorite = createAsyncThunk(
  'auth/toggleFavorite',
  async ({ type, id, data }, { getState, dispatch }) => {
    const user = getState().auth.user;
    if (!user?.userID) return;
    const key = type === 'event' ? 'favoriteEvents' : type === 'site' ? 'favoriteSites' : 'favoriteVenues';
    const current = user[key] || [];
    const isAdding = !current.includes(id);
    const updated = isAdding
      ? [...current, id]
      : current.filter((x) => x !== id);
    dispatch(authSlice.actions.setAuthUserPatch({ [key]: updated }));
    if (isAdding && type === 'venue' && data) {
      dispatch(upsertVenueLocal(data));
    }
    await patchUserProfile(user.userID, { [key]: updated });
    return { type, updated };
  }
);

export default authSlice.reducer;
