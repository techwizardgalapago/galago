import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { selectAllVenues, insertVenue } from "../../db/venues";

export const fetchVenues = createAsyncThunk("venues/fetchVenues", async () => {
  return await selectAllVenues();
});

export const addVenue = createAsyncThunk("venues/addVenue", async (venue) => {
  await insertVenue(venue);
  return venue;
});

const venuesSlice = createSlice({
  name: "venues",
  initialState: {
    list: [],
    status: "idle",
    error: null,
    rehydrated: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchVenues.fulfilled, (state, action) => {
        state.list = action.payload;
        state.status = "succeeded";
        state.rehydrated = true;
      })
      .addCase(fetchVenues.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(addVenue.fulfilled, (state, action) => {
        state.list.push(action.payload);
      });
  },
});

export default venuesSlice.reducer;
