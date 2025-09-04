// src/store/slices/usersSlice.js
import { createSlice, createEntityAdapter, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import {
  selectAllUsers as dbSelectAllUsers,
  insertUser as dbInsertUser,
  updateUserLocal as dbUpdateUserLocal,
  softDeleteUser as dbSoftDeleteUser,
  upsertUsersFromAPI as dbUpsertUsersFromAPI,
  getUnsyncedUsers as dbGetUnsyncedUsers,
  markUsersSynced as dbMarkUsersSynced,
} from '../../db/users';

// --- Adapter
const usersAdapter = createEntityAdapter({
  selectId: (u) => u.userID,           // 👈 tu PK
  sortComparer: (a, b) => b.updated_at - a.updated_at, // más reciente primero
});

// --- Estado extra
const initialState = usersAdapter.getInitialState({
  status: 'idle',      // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  lastLoadedAt: 0,
});

// --- Thunks

// Carga inicial desde SQLite
export const fetchUsers = createAsyncThunk('users/fetchAll', async () => {
  const rows = await dbSelectAllUsers();
  return rows;
});

// Crear local (optimista)
export const addUser = createAsyncThunk('users/addUser', async (user) => {
  await dbInsertUser(user); // setea isSynced=0 y updated_at=now en la capa DB
  return user;
});

// Update local (optimista)
export const updateUser = createAsyncThunk('users/updateUser', async (patch) => {
  await dbUpdateUserLocal(patch); // bump updated_at, isSynced=0
  return patch; // contiene userID y campos a actualizar
});

// Soft-delete (optimista)
export const removeUser = createAsyncThunk('users/removeUser', async ({ userID }) => {
  await dbSoftDeleteUser(userID); // deleted=1, isSynced=0, bump updated_at
  return { userID };
});

// Upsert masivo desde API (frescura)
export const upsertUsersFromAPI = createAsyncThunk('users/upsertFromAPI', async (users) => {
  await dbUpsertUsersFromAPI(users);
  // Tras upsert, volvemos a leer para tener la vista "verdad" de SQLite
  const rows = await dbSelectAllUsers();
  return rows;
});

// (Opcional) Sync push → marca como synced los registros que tu servicio haya enviado
export const markUsersSynced = createAsyncThunk('users/markSynced', async (userIDs) => {
  await dbMarkUsersSynced(userIDs);
  // reflejar inmediatamente en estado
  return userIDs;
});

// --- Slice
const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    // En caso de necesitar resets o flags adicionales, agrégalos aquí
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

      // add (optimista: insertamos directo al fulfilled)
      .addCase(addUser.pending, (state) => {
        // puedes setear un flag si quieres
      })
      .addCase(addUser.fulfilled, (state, action) => {
        usersAdapter.upsertOne(state, action.payload);
      })
      .addCase(addUser.rejected, (state, action) => {
        state.error = action.error?.message || 'Failed to add user';
      })

      // update (optimista)
      .addCase(updateUser.fulfilled, (state, action) => {
        const { userID, ...changes } = action.payload;
        usersAdapter.updateOne(state, { id: userID, changes });
      })

      // soft-delete (optimista)
      .addCase(removeUser.fulfilled, (state, action) => {
        const { userID } = action.payload;
        usersAdapter.removeOne(state, userID);
      })

      // upsertFromAPI (fresh read)
      .addCase(upsertUsersFromAPI.pending, (state) => {
        // opcional: state.status = 'loading';
      })
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

// Ejemplos de selectores memorizados:
export const selectUsersByName = (nameSubstr) =>
  createSelector([selectAllUsers], (users) =>
    users.filter((u) =>
      `${u.firstName ?? ''} ${u.lastName ?? ''}`.toLowerCase().includes((nameSubstr || '').toLowerCase())
    )
  );

export const selectUnsyncedUserIds = createSelector(
  [selectAllUsers],
  (users) => users.filter((u) => u.isSynced === 0 && u.deleted === 0).map((u) => u.userID)
);

