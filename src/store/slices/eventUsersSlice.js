import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getEventsByUser, getUsersByEvent } from "../../db/eventUsers";

export const fetchEventsByUser = createAsyncThunk(
  "eventUsers/fetchEventsByUser",
  async (userID) => {
    return await getEventsByUser(userID);
  }
);

export const fetchUsersByEvent = createAsyncThunk(
  "eventUsers/fetchUsersByEvent",
  async (eventID) => {
    return await getUsersByEvent(eventID);
  }
);
export const addEventUser = createAsyncThunk(
  "eventUsers/addEventUser",
  async (eventUser) => {
    await insertEventUser(eventUser);
    return eventUser;
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
        const [userID, events] = action.payload;
        state.eventsByUser[userID] = events;
      })
      .addCase(fetchEventsByUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(fetchUsersByEvent.fulfilled, (state, action) => {
        const [eventID, users] = action.payload;
        state.usersByEvent[eventID] = users;
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
