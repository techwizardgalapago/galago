// src/hooks/useUsers.js
import { useDispatch, useSelector } from "react-redux";
import { useCallback, useEffect, useMemo } from "react";
import {
  fetchUsers,
  addUser,
  updateUser,
  removeUser,
  upsertUsersFromAPI,
  selectAllUsers,
  selectUserById,
  selectUnsyncedUserIds,
} from "../store/slices/userSlice";

export const useUsers = () => {
  const dispatch = useDispatch();
  const users = useSelector(selectAllUsers);
  const status = useSelector((s) => s.users.status);
  const error = useSelector((s) => s.users.error);
  const unsyncedIds = useSelector(selectUnsyncedUserIds);

  // Carga inicial una sola vez (o cuando se vuelva a 'idle')
  useEffect(() => {
    if (status === "idle") dispatch(fetchUsers());
  }, [status, dispatch]);

  // CRUD optimista
  const createUser = useCallback(
    async (user) => {
      await dispatch(addUser(user));
      // Si quieres volver a leer desde DB, puedes:
      // await dispatch(fetchUsers());
    },
    [dispatch]
  );

  const patchUser = useCallback(
    async (patch) => {
      await dispatch(updateUser(patch));
      // opcional: await dispatch(fetchUsers());
    },
    [dispatch]
  );

  const deleteUser = useCallback(
    async (userID) => {
      await dispatch(removeUser({ userID }));
      // opcional: await dispatch(fetchUsers());
    },
    [dispatch]
  );

  // Upsert desde API (cuando tengas el payload)
  const upsertFromAPI = useCallback(
    async (apiUsers) => {
      await dispatch(upsertUsersFromAPI(apiUsers));
    },
    [dispatch]
  );

  // Refresh manual
  const refresh = useCallback(() => dispatch(fetchUsers()), [dispatch]);

  return useMemo(
    () => ({
      users,
      status,
      error,
      unsyncedIds,
      createUser,
      patchUser,
      deleteUser,
      upsertFromAPI,
      refresh,
    }),
    [
      users,
      status,
      error,
      unsyncedIds,
      createUser,
      patchUser,
      deleteUser,
      upsertFromAPI,
      refresh,
    ]
  );
};

// Selector por id (hook de conveniencia)
export const useUser = (userID) => {
  return useSelector((state) => selectUserById(state, userID));
};
