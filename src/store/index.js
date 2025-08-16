import { configureStore } from "@reduxjs/toolkit";
import usersReducer from "./slices/userSlice";
import venuesReducer from "./slices/venueSlice";
import schedulesReducer from "./slices/schedulesSlice";
import eventsReducer from "./slices/eventsSlice";
import eventUsersReducer from "./slices/eventUsersSlice";

export const store = configureStore({
  reducer: {
    users: usersReducer,
    venues: venuesReducer,
    schedules: schedulesReducer,
    events: eventsReducer,
    eventUsers: eventUsersReducer,
  },
});
