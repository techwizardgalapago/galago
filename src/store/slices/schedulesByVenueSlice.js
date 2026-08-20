// 📁 src/store/slice/schedulesByVenueSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { Platform } from "react-native";
import { getSchedulesByVenue } from "../../db/schedules";

const isWeb = Platform.OS === "web";

// Thunk that checks the cache before fetching
export const fetchSchedulesByVenue = createAsyncThunk(
  "schedules/fetchByVenue",
  async (venueID, { getState }) => {
    const cached = getState().schedulesByVenue.schedulesByVenueID[venueID];
    if (cached) {
      return { venueID, schedules: cached }; // Already cached
    }
    // En web no hay SQLite: los horarios llegan del backend en la pantalla.
    if (isWeb) return { venueID, schedules: [] };
    const schedules = await getSchedulesByVenue(venueID);
    return { venueID, schedules };
  }
);

const schedulesByVenueSlice = createSlice({
  name: "schedulesByVenue",
  initialState: {
    schedulesByVenueID: {}, // { [venueID]: [schedule1, schedule2, ...] }
    status: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSchedulesByVenue.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchSchedulesByVenue.fulfilled, (state, action) => {
        const { venueID, schedules } = action.payload;
        state.schedulesByVenueID[venueID] = schedules;
        state.status = "succeeded";
      })
      .addCase(fetchSchedulesByVenue.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      });
  },
});

export default schedulesByVenueSlice.reducer;
