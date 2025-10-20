// -------------------------------------------------
// src/store/slices/authSlice.js
// -------------------------------------------------
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authStorage } from '../../utils/authStorage';
import { setAuthHeader } from '../../services/api';
import { loginService, registerService, fetchMeService } from '../../services/authService';

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
  return { token };
});

export const login = createAsyncThunk('auth/login', async ({ email, password }) => {
  const { token, fields } = await loginService({ email, password });
  const user = fields[0];
  console.log("loginService response:", { token, user });
  return { token, user };
});

export const register = createAsyncThunk('auth/register', async (payload) => {
  // payload could include: firstName,lastName,email,password, etc.
  const res = await registerService(payload);
  // If your backend also returns a token here, return it; otherwise you may redirect to login.
  return res; // normalize in reducer below
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
    },
    setHydrated(state, action) {
      state.hydrated = action.payload ?? true;
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.status = 'idle';
      state.error = null;
    },
    setAuthUserPatch(state, action) {
      const patch = action.payload || {};
      if (!state.user) state.user = {};
      state.user = { ...state.user, ...patch };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(hydrateAuth.fulfilled, (state, action) => {
        state.hydrated = true;
        if (action.payload?.token) state.token = action.payload.token;
      })
      .addCase(hydrateAuth.rejected, (state) => { state.hydrated = true; })

      .addCase(login.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error?.message || 'Login failed';
      })

      .addCase(register.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(register.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Some APIs return {token,user}, others just the created user
        if (action.payload?.token) {
          state.token = action.payload.token;
          state.user = action.payload.user;
        }
      })
      .addCase(register.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error?.response?.data || action.error?.message || 'Register failed';
      })

      .addCase(fetchMe.fulfilled, (state, action) => { state.user = action.payload.user; })
      .addCase(fetchMe.rejected, (state) => { /* if 401, will be handled in hook */ });
  }
});

// ⬅️ Export the new actions
export const { setToken, setUser, setHydrated, logout, setAuthUserPatch } = authSlice.actions;
export default authSlice.reducer;
