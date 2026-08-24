import { Platform } from "react-native";
import { configureStore } from "@reduxjs/toolkit";

import schedulesByVenueReducer, {
  fetchSchedulesByVenue,
} from "../../src/store/slices/schedulesByVenueSlice";
import schedulesReducer, {
  fetchSchedules,
} from "../../src/store/slices/schedulesSlice";
import * as schedulesDB from "../../src/db/schedules";

jest.mock("../../src/db/schedules");

const isWeb = Platform.OS === "web";

const makeStore = () =>
  configureStore({
    reducer: {
      schedulesByVenue: schedulesByVenueReducer,
      schedules: schedulesReducer,
    },
  });

beforeEach(() => {
  jest.clearAllMocks();
});

describe(`guards de SQLite en ${Platform.OS}`, () => {
  it("fetchSchedulesByVenue no toca SQLite en web y si lo hace en nativo", async () => {
    schedulesDB.getSchedulesByVenue.mockResolvedValue([
      { scheduleID: "s1", weekDay: "Lunes" },
    ]);

    const store = makeStore();
    const result = await store.dispatch(fetchSchedulesByVenue("v1"));

    // Nunca debe rechazarse: en web eso daba "Database not initialized"
    expect(result.type).toBe("schedules/fetchByVenue/fulfilled");

    if (isWeb) {
      expect(schedulesDB.getSchedulesByVenue).not.toHaveBeenCalled();
      expect(store.getState().schedulesByVenue.schedulesByVenueID.v1).toEqual([]);
    } else {
      expect(schedulesDB.getSchedulesByVenue).toHaveBeenCalledWith("v1");
      expect(store.getState().schedulesByVenue.schedulesByVenueID.v1).toHaveLength(1);
    }
  });

  it("fetchSchedules resuelve en ambas plataformas", async () => {
    schedulesDB.selectAllSchedules.mockResolvedValue([{ scheduleID: "s1" }]);

    const store = makeStore();
    const result = await store.dispatch(fetchSchedules());

    expect(result.type).toBe("schedules/fetchSchedules/fulfilled");
    if (isWeb) {
      expect(schedulesDB.selectAllSchedules).not.toHaveBeenCalled();
      expect(store.getState().schedules.list).toEqual([]);
    } else {
      expect(schedulesDB.selectAllSchedules).toHaveBeenCalled();
    }
  });

});
