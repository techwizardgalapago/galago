import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { selectAllUsers, insertUser } from "../../db/users";

export const fetchUsers = createAsyncThunk("users/fetchUsers", async () => {
  return await selectAllUsers();
});

export const addUser = createAsyncThunk("users/addUser", async (user) => {
  await insertUser(user);
  return user;
});

const usersSlice = createSlice({
  name: "users",
  initialState: {
    list: [],
    status: "idle",
    error: null,
    rehydrated: false,
  },
  reducers: {
    clearUserError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.list = action.payload;
        state.status = "succeeded";
        state.rehydrated = true;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(addUser.fulfilled, (state, action) => {
        state.list.push(action.payload);
      })
      .addCase(addUser.rejected, (state, action) => {
        state.error = action.error?.message || "Unknown error";
      });
  },
});

export const { clearUserError } = usersSlice.actions;
export default usersSlice.reducer;
