// src/store/slices/usersSlice.js
import { createSlice, createEntityAdapter, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { Platform } from 'react-native';
import {
  selectAllUsers as dbSelectAllUsers,
  insertUser as dbInsertUser,
  updateUserLocal as dbUpdateUserLocal,
  softDeleteUser as dbSoftDeleteUser,
  upsertUsersFromAPI as dbUpsertUsersFromAPI,
  getUnsyncedUsers as dbGetUnsyncedUsers, // (kept import; OK if unused)
  markUsersSynced as dbMarkUsersSynced,
} from '../../db/users';

// ---- Platform guards (no DB on web / uninitialized DB) ----
const isWeb = Platform.OS === 'web';
const ignoreDBIfWeb = async (fn, fallback) => {
  if (isWeb) return fallback ?? null;
  try {
    return await fn();
  } catch (e) {
    if (/Database not initialized/i.test(e?.message)) {
      // behave like web: skip but let Redux proceed
      return fallback ?? null;
    }
    throw e;
  }
};

// --- Adapter
const usersAdapter = createEntityAdapter({
  selectId: (u) => u.userID, // PK
  sortComparer: (a, b) => b.updated_at - a.updated_at, // newest first
});

// --- Extra state
const initialState = usersAdapter.getInitialState({
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  lastLoadedAt: 0,
});

// --- Thunks

// Load from SQLite
export const fetchUsers = createAsyncThunk('users/fetchAll', async () => {
  const rows = await ignoreDBIfWeb(() => dbSelectAllUsers(), []);
  return rows || [];
});

// Create local (optimistic)
export const addUser = createAsyncThunk('users/addUser', async (user) => {
  await ignoreDBIfWeb(() => dbInsertUser(user));
  return user; // optimistic into Redux
});

// Update local (optimistic)
export const updateUser = createAsyncThunk('users/updateUser', async (patch) => {
  await ignoreDBIfWeb(() => dbUpdateUserLocal(patch));
  return patch; // contains userID + updated fields
});

// Soft-delete (optimistic)
export const removeUser = createAsyncThunk('users/removeUser', async ({ userID }) => {
  await ignoreDBIfWeb(() => dbSoftDeleteUser(userID));
  return { userID };
});

// Upsert from API (fresh read)
export const upsertUsersFromAPI = createAsyncThunk('users/upsertFromAPI', async (users) => {
  await ignoreDBIfWeb(() => dbUpsertUsersFromAPI(users));
  const rows = await ignoreDBIfWeb(() => dbSelectAllUsers(), []);
  return rows || [];
});

// (Optional) mark synced
export const markUsersSynced = createAsyncThunk('users/markSynced', async (userIDs) => {
  await ignoreDBIfWeb(() => dbMarkUsersSynced(userIDs));
  return userIDs;
});

// --- Slice
const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    // add custom reducers if needed
  },
  extraReducers: (builder) => {
    builder
      // fetch
      .addCase(fetchUsers.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        usersAdapter.setAll(state, action.payload);
        state.lastLoadedAt = Date.now();
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error?.message || 'Failed to fetch users';
      })

      // add
      .addCase(addUser.fulfilled, (state, action) => {
        usersAdapter.upsertOne(state, action.payload);
      })
      .addCase(addUser.rejected, (state, action) => {
        state.error = action.error?.message || 'Failed to add user';
      })

      // update
      .addCase(updateUser.fulfilled, (state, action) => {
        const { userID, ...changes } = action.payload;
        const existing = state.entities[userID] || { userID };
        // upsert ensures we create the user if it isn't in the slice yet (common on web)
        usersAdapter.upsertOne(state, { ...existing, ...changes });
      })

      // remove
      .addCase(removeUser.fulfilled, (state, action) => {
        const { userID } = action.payload;
        usersAdapter.removeOne(state, userID);
      })

      // upsertFromAPI
      .addCase(upsertUsersFromAPI.fulfilled, (state, action) => {
        usersAdapter.setAll(state, action.payload);
      })
      .addCase(upsertUsersFromAPI.rejected, (state, action) => {
        state.error = action.error?.message || 'Failed to upsert from API';
      })

      // mark synced
      .addCase(markUsersSynced.fulfilled, (state, action) => {
        const ids = action.payload || [];
        ids.forEach((id) => {
          const entity = state.entities[id];
          if (entity) entity.isSynced = 1;
        });
      });
  },
});

export default usersSlice.reducer;

// --- Selectors
export const {
  selectAll: selectAllUsers,
  selectById: selectUserById,
  selectIds: selectUserIds,
} = usersAdapter.getSelectors((state) => state.users);

// Memoized examples
export const selectUsersByName = (nameSubstr) =>
  createSelector([selectAllUsers], (users) =>
    users.filter((u) =>
      `${u.firstName ?? ''} ${u.lastName ?? ''}`
        .toLowerCase()
        .includes((nameSubstr || '').toLowerCase())
    )
  );

export const selectUnsyncedUserIds = createSelector(
  [selectAllUsers],
  (users) => users
    .filter((u) => u.isSynced === 0 && u.deleted === 0)
    .map((u) => u.userID)
);
