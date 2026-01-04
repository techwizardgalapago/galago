import { fetchUsers } from "./slices/userSlice";
import { fetchVenues } from "./slices/venueSlice";
import { fetchSchedules } from "./slices/schedulesSlice";
import { fetchEvents } from "./slices/eventsSlice";
import { fetchEventsByUser } from "./slices/eventUsersSlice";

export const rehydrateReduxFromSQLite = () => async (dispatch) => {
  try {
    await dispatch(fetchUsers());
    await dispatch(fetchVenues());
    await dispatch(fetchSchedules());
    await dispatch(fetchEvents());
    await dispatch(fetchEventsByUser());
  } catch (error) {
    console.error("❌ Failed to rehydrate Redux from SQLite:", error);
  }
};
