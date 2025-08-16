import { fetchUsers } from "./slices/userSlice";
import { fetchVenues } from "./slices/venueSlice";
import { fetchSchedules } from "./slices/schedulesSlice";
import { fetchEvents } from "./slices/eventsSlice";
import { fetchEventsByUser } from "./slices/eventUsersSlice";

export const rehydrateReduxFromSQLite = () => async (dispatch) => {
  try {
    // Dispatch each slice's fetch action in parallel
    await Promise.all([
      dispatch(fetchUsers()),
      dispatch(fetchVenues()),
      dispatch(fetchSchedules()),
      dispatch(fetchEvents()),
      dispatch(fetchEventsByUser()),
    ]);
    console.log("✅ Redux rehydrated from SQLite");
  } catch (error) {
    console.error("❌ Failed to rehydrate Redux from SQLite:", error);
  }
};
