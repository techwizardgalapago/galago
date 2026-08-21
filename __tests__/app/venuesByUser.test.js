import { Platform } from "react-native";
import { configureStore } from "@reduxjs/toolkit";
import venuesReducer, {
  fetchUserVenuesByUserId,
} from "../../src/store/slices/venueSlice";
import { getVenuesByUserId } from "../../src/services/venuesService";
import { api } from "../../src/services/api";
import * as venuesDB from "../../src/db/venues";
import * as schedulesDB from "../../src/db/schedules";

jest.mock("../../src/services/api", () => ({
  api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
  API_URL: "https://api.galago.ec/api/v1/",
  buildApiUrl: (p = "") => `https://api.galago.ec/api/v1/${p}`,
  setAuthHeader: jest.fn(),
  setUnauthorizedHandler: jest.fn(),
}));
jest.mock("../../src/db/venues");
jest.mock("../../src/db/schedules");

const isWeb = Platform.OS === "web";
const MI_ID = "recKq3eH2bmXwvUZm";
const OTRO_ID = "recOtroUsuario001";

const venue = (venueID, ownerID) => ({
  venueID,
  venueName: `Local ${venueID}`,
  userID: [ownerID],
});

beforeEach(() => {
  jest.clearAllMocks();
  venuesDB.upsertVenuesFromAPI.mockResolvedValue();
  venuesDB.selectAllVenues.mockResolvedValue([]);
  schedulesDB.upsertSchedulesFromAPI.mockResolvedValue();
});

describe("getVenuesByUserId", () => {
  it("no manda ?userID=: el backend lo rechaza con 500", async () => {
    // queryVenueSchema solo acepta limit, offset, filterField y filterValue.
    api.get.mockResolvedValue({ data: [] });

    await getVenuesByUserId(MI_ID);

    expect(api.get).toHaveBeenCalledTimes(1);
    const [url, config] = api.get.mock.calls[0];
    expect(url).toBe("/venues");
    expect(config?.params ?? {}).not.toHaveProperty("userID");
  });

  it("no llama a la API sin userID", async () => {
    await expect(getVenuesByUserId(undefined)).resolves.toEqual([]);
    expect(api.get).not.toHaveBeenCalled();
  });
});

describe(`fetchUserVenuesByUserId en ${Platform.OS}`, () => {
  it("se queda solo con los locales del usuario", async () => {
    api.get.mockResolvedValue({
      data: [venue("recV1", MI_ID), venue("recV2", OTRO_ID), venue("recV3", MI_ID)],
    });
    venuesDB.selectAllVenues.mockResolvedValue([
      venue("recV1", MI_ID),
      venue("recV3", MI_ID),
    ]);

    const store = configureStore({ reducer: { venues: venuesReducer } });
    await store.dispatch(fetchUserVenuesByUserId(MI_ID));

    const ids = store.getState().venues.list.map((v) => v.venueID);
    expect(ids).toEqual(["recV1", "recV3"]);
    expect(ids).not.toContain("recV2");
  });

  it("acepta userID como string suelto, no solo como array", async () => {
    api.get.mockResolvedValue({
      data: [{ venueID: "recV1", venueName: "Local", userID: MI_ID }],
    });
    venuesDB.selectAllVenues.mockResolvedValue([
      { venueID: "recV1", venueName: "Local", userID: MI_ID },
    ]);

    const store = configureStore({ reducer: { venues: venuesReducer } });
    await store.dispatch(fetchUserVenuesByUserId(MI_ID));

    expect(store.getState().venues.list).toHaveLength(1);
  });

  it("devuelve vacio sin tocar la red si no hay userID", async () => {
    const store = configureStore({ reducer: { venues: venuesReducer } });
    const res = await store.dispatch(fetchUserVenuesByUserId(undefined));

    expect(res.type).toBe("venues/fetchUserVenuesByUserId/fulfilled");
    expect(api.get).not.toHaveBeenCalled();
  });

  it("solo persiste en SQLite los locales ya filtrados", async () => {
    api.get.mockResolvedValue({
      data: [venue("recV1", MI_ID), venue("recV2", OTRO_ID)],
    });

    const store = configureStore({ reducer: { venues: venuesReducer } });
    await store.dispatch(fetchUserVenuesByUserId(MI_ID));

    if (isWeb) {
      expect(venuesDB.upsertVenuesFromAPI).not.toHaveBeenCalled();
    } else {
      const persistidos = venuesDB.upsertVenuesFromAPI.mock.calls[0][0];
      expect(persistidos.map((v) => v.venueID)).toEqual(["recV1"]);
    }
  });
});
