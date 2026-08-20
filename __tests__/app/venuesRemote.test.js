import { Platform } from "react-native";
import { configureStore } from "@reduxjs/toolkit";
import venuesReducer, {
  fetchAllVenuesRemote,
} from "../../src/store/slices/venueSlice";
import * as venuesService from "../../src/services/venuesService";
import * as venuesDB from "../../src/db/venues";
import * as schedulesDB from "../../src/db/schedules";

jest.mock("../../src/services/venuesService");
jest.mock("../../src/db/venues");
jest.mock("../../src/db/schedules");

const isWeb = Platform.OS === "web";

const airtableVenue = {
  id: "recV1",
  fields: {
    venueName: "La Nube",
    venueCategory: "Gastronomia",
    VenueSchedules: [
      {
        scheduleID: "s1",
        fields: { weekDay: "Lunes", openingTime_: "08:00", closingTime_: "12:00" },
      },
    ],
  },
};

const makeStore = () =>
  configureStore({ reducer: { venues: venuesReducer } });

beforeEach(() => {
  jest.clearAllMocks();
  venuesDB.upsertVenuesFromAPI.mockResolvedValue();
  venuesDB.selectAllVenues.mockResolvedValue([
    { venueID: "recV1", venueName: "La Nube (desde SQLite)" },
  ]);
  schedulesDB.upsertSchedulesFromAPI.mockResolvedValue();
});

describe(`fetchAllVenuesRemote en ${Platform.OS}`, () => {
  it("aplana la forma { id, fields } de Airtable a venueID", async () => {
    venuesService.getVenues.mockResolvedValue([airtableVenue]);

    const store = makeStore();
    await store.dispatch(fetchAllVenuesRemote());

    const { list, status } = store.getState().venues;
    expect(status).toBe("succeeded");
    expect(list).toHaveLength(1);
    expect(list[0].venueID).toBe("recV1");
  });

  it("en web usa la respuesta remota y no toca SQLite", async () => {
    venuesService.getVenues.mockResolvedValue([airtableVenue]);

    const store = makeStore();
    await store.dispatch(fetchAllVenuesRemote());

    if (isWeb) {
      expect(venuesDB.upsertVenuesFromAPI).not.toHaveBeenCalled();
      expect(venuesDB.selectAllVenues).not.toHaveBeenCalled();
      expect(store.getState().venues.list[0].venueName).toBe("La Nube");
    } else {
      // En nativo SQLite es la fuente de verdad tras persistir.
      expect(venuesDB.upsertVenuesFromAPI).toHaveBeenCalled();
      expect(store.getState().venues.list[0].venueName).toBe(
        "La Nube (desde SQLite)"
      );
    }
  });

  it("persiste los horarios embebidos solo en nativo", async () => {
    venuesService.getVenues.mockResolvedValue([airtableVenue]);

    const store = makeStore();
    await store.dispatch(fetchAllVenuesRemote());

    if (isWeb) {
      expect(schedulesDB.upsertSchedulesFromAPI).not.toHaveBeenCalled();
    } else {
      expect(schedulesDB.upsertSchedulesFromAPI).toHaveBeenCalledWith([
        expect.objectContaining({
          scheduleID: "s1",
          venueID: "recV1",
          dayOfWeek: "Lunes",
          openTime: "08:00",
          closeTime: "12:00",
        }),
      ]);
    }
  });

  it.each([
    ["array plano", [{ venueID: "recV1", venueName: "La Nube" }]],
    ["{ records }", { records: [{ venueID: "recV1", venueName: "La Nube" }] }],
    ["{ data }", { data: [{ venueID: "recV1", venueName: "La Nube" }] }],
  ])("acepta la respuesta en forma de %s", async (_nombre, respuesta) => {
    venuesService.getVenues.mockResolvedValue(respuesta);

    const store = makeStore();
    await store.dispatch(fetchAllVenuesRemote());

    expect(store.getState().venues.list).toHaveLength(1);
  });

  it("fusiona en vez de duplicar cuando el venue ya estaba", async () => {
    venuesService.getVenues.mockResolvedValue([
      { venueID: "recV1", venueName: "La Nube", venueCategory: "Gastronomia" },
    ]);
    venuesDB.selectAllVenues.mockResolvedValue([
      { venueID: "recV1", venueName: "La Nube", venueCategory: "Gastronomia" },
    ]);

    const store = makeStore();
    await store.dispatch(fetchAllVenuesRemote());
    await store.dispatch(fetchAllVenuesRemote());

    expect(store.getState().venues.list).toHaveLength(1);
  });

  it("no rompe el estado si la API falla", async () => {
    venuesService.getVenues.mockRejectedValue(new Error("500"));

    const store = makeStore();
    const result = await store.dispatch(fetchAllVenuesRemote());

    expect(result.type).toBe("venues/fetchAllRemote/rejected");
    expect(store.getState().venues.list).toEqual([]);
  });

  it("descarta registros nulos de la respuesta", async () => {
    venuesService.getVenues.mockResolvedValue([null, undefined, airtableVenue]);
    venuesDB.selectAllVenues.mockResolvedValue([{ venueID: "recV1" }]);

    const store = makeStore();
    await store.dispatch(fetchAllVenuesRemote());

    expect(store.getState().venues.list).toHaveLength(1);
  });
});
