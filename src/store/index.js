import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import usersReducer from "./slices/userSlice";
import venuesReducer from "./slices/venueSlice";
import schedulesReducer from "./slices/schedulesSlice";
import schedulesByVenueReducer from "./slices/schedulesByVenueSlice";
import eventsReducer from "./slices/eventsSlice";
import eventUsersReducer from "./slices/eventUsersSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: usersReducer,
    venues: venuesReducer,
    schedules: schedulesReducer,
    schedulesByVenue: schedulesByVenueReducer,
    events: eventsReducer,
    eventUsers: eventUsersReducer,
  },
});
