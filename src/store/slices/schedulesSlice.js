import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { selectAllSchedules, insertSchedule } from "../../db/schedules";

export const fetchSchedules = createAsyncThunk("schedules/fetchSchedules", async () => {
  return await selectAllSchedules();
});

export const addSchedule = createAsyncThunk("schedules/addSchedule", async (schedule) => {
  await insertSchedule(schedule);
  return schedule;
});

const schedulesSlice = createSlice({
  name: "schedules",
  initialState: {
    list: [],
    status: "idle",
    error: null,
    rehydrated: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSchedules.fulfilled, (state, action) => {
        state.list = action.payload;
        state.status = "succeeded";
        state.rehydrated = true;
      })
      .addCase(fetchSchedules.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(addSchedule.fulfilled, (state, action) => {
        state.list.push(action.payload);
      });
  },
});

export default schedulesSlice.reducer;
