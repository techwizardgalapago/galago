import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { Platform } from "react-native";
import {
  getEventsByUser,
  getUsersByEvent,
  insertEventUser,
} from "../../db/eventUsers";

const isWeb = Platform.OS === "web";

export const fetchEventsByUser = createAsyncThunk(
  "eventUsers/fetchEventsByUser",
  async (userID) => {
    if (isWeb || !userID) return { userID, events: [] };
    return { userID, events: (await getEventsByUser(userID)) || [] };
  }
);

export const fetchUsersByEvent = createAsyncThunk(
  "eventUsers/fetchUsersByEvent",
  async (eventID) => {
    if (isWeb || !eventID) return { eventID, users: [] };
    return { eventID, users: (await getUsersByEvent(eventID)) || [] };
  }
);
export const addEventUser = createAsyncThunk(
  "eventUsers/addEventUser",
  async ({ eventID, userID, role = null }) => {
    if (!isWeb) await insertEventUser(eventID, userID, role);
    return { eventID, userID, role };
  }
);

const eventUsersSlice = createSlice({
  name: "eventUsers",
  initialState: {
    list: [],
    eventsByUser: {},
    usersByEvent: {},
    status: "idle",
    error: null,
    rehydrated: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEventsByUser.fulfilled, (state, action) => {
        const { userID, events } = action.payload || {};
        if (!userID) return; // rehydration lo despacha sin id: no hay nada que indexar
        state.eventsByUser[userID] = events || [];
      })
      .addCase(fetchEventsByUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(fetchUsersByEvent.fulfilled, (state, action) => {
        const { eventID, users } = action.payload || {};
        if (!eventID) return;
        state.usersByEvent[eventID] = users || [];
      })
      .addCase(fetchUsersByEvent.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(addEventUser.fulfilled, (state, action) => {
        state.list.push(action.payload);
      });
  },
});

export default eventUsersSlice.reducer;
