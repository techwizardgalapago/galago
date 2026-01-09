// 📁 src/store/slices/eventsSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { Platform } from "react-native";
import {
  selectAllEvents,
  insertEvent,
  upsertEventsFromAPI as dbUpsertEventsFromAPI,
} from "../../db/events";
import { getEvents } from "../../services/eventsService";

const isWeb = Platform.OS === "web";
const ignoreDBIfWeb = async (fn, fallback) => {
  if (isWeb) return fallback ?? null;
  try {
    return await fn();
  } catch (e) {
    if (/Database not initialized/i.test(e?.message)) {
      return fallback ?? null;
    }
    throw e;
  }
};

const mapRemoteEvent = (record) => {
  if (!record) return null;
  if (record.fields && record.id) {
    return { eventID: record.id, ...record.fields };
  }
  if (record.eventID) return record;
  if (record.id) return { eventID: record.id, ...record };
  return null;
};

export const fetchEvents = createAsyncThunk("events/fetchEvents", async () => {
  return await ignoreDBIfWeb(() => selectAllEvents(), []);
});

export const addEvent = createAsyncThunk("events/addEvent", async (event) => {
  await insertEvent(event);
  return event;
});

export const fetchEventsRemote = createAsyncThunk(
  "events/fetchEventsRemote",
  async () => {
    const remote = await getEvents();
    const list = Array.isArray(remote)
      ? remote
      : remote?.records || remote?.data || [];
    let flatList = list;

    if (Array.isArray(list) && list[0]?.eventos) {
      flatList = list.flatMap((group) => {
        const date = group?.fecha || group?.date || null;
        const events = Array.isArray(group?.eventos) ? group.eventos : [];
        return events.map((ev) => ({ ...ev, fecha: date }));
      });
    }

    const mapped = (flatList || []).map(mapRemoteEvent).filter(Boolean);
    if (!mapped.length) {
      console.log("fetchEventsRemote - empty result", {
        rawCount: list?.length || 0,
        sample: list?.[0] || null,
        sampleEvent: list?.[0]?.eventos?.[0] || null,
      });
    }
    if (isWeb) return mapped;
    await dbUpsertEventsFromAPI(mapped);
    const rows = await selectAllEvents();
    return rows || [];
  }
);

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
      .addCase(fetchEventsRemote.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchEventsRemote.fulfilled, (state, action) => {
        if (!action.payload) return;
        state.list = action.payload;
        state.status = "succeeded";
        state.rehydrated = true;
      })
      .addCase(fetchEventsRemote.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error?.message;
      })
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
