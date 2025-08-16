// 📁 src/store/slices/eventsSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { selectAllEvents, insertEvent } from "../../db/events";

export const fetchEvents = createAsyncThunk("events/fetchEvents", async () => {
  return await selectAllEvents();
});

export const addEvent = createAsyncThunk("events/addEvent", async (event) => {
  await insertEvent(event);
  return event;
});

const eventsSlice = createSlice({
  name: "events",
  initialState: {
    list: [],
    status: "idle",
    error: null,
    rehydrated: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.list = action.payload;
        state.status = "succeeded";
        state.rehydrated = true;
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(addEvent.fulfilled, (state, action) => {
        state.list.push(action.payload);
      });
  },
});

export default eventsSlice.reducer;
