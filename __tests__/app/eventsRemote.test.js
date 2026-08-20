import { Platform } from "react-native";
import { configureStore } from "@reduxjs/toolkit";
import eventsReducer, {
  fetchEventsRemote,
} from "../../src/store/slices/eventsSlice";
import * as eventsService from "../../src/services/eventsService";
import * as eventsDB from "../../src/db/events";

jest.mock("../../src/services/eventsService");
jest.mock("../../src/db/events");

const isWeb = Platform.OS === "web";

const makeStore = () => configureStore({ reducer: { events: eventsReducer } });

beforeEach(() => {
  jest.clearAllMocks();
  eventsDB.upsertEventsFromAPI.mockResolvedValue();
  eventsDB.selectAllEvents.mockResolvedValue([
    { eventID: "recE1", eventName: "Festival (desde SQLite)" },
  ]);
});

describe(`fetchEventsRemote en ${Platform.OS}`, () => {
  it("aplana los eventos agrupados por fecha y propaga la fecha del grupo", async () => {
    eventsService.getEvents.mockResolvedValue([
      {
        fecha: "2026-10-14",
        eventos: [
          { eventID: "recE1", eventName: "Festival" },
          { eventID: "recE2", eventName: "Concierto" },
        ],
      },
      { fecha: "2026-10-15", eventos: [{ eventID: "recE3", eventName: "Feria" }] },
    ]);
    eventsDB.selectAllEvents.mockResolvedValue([
      { eventID: "recE1" },
      { eventID: "recE2" },
      { eventID: "recE3" },
    ]);

    const store = makeStore();
    await store.dispatch(fetchEventsRemote());

    const { list, status } = store.getState().events;
    expect(status).toBe("succeeded");
    expect(list).toHaveLength(3);

    if (isWeb) {
      // En web la lista es la respuesta mapeada, con la fecha del grupo pegada.
      expect(list[0]).toMatchObject({ eventID: "recE1", fecha: "2026-10-14" });
      expect(list[2]).toMatchObject({ eventID: "recE3", fecha: "2026-10-15" });
    }
  });

  it("acepta tambien una lista plana de eventos", async () => {
    eventsService.getEvents.mockResolvedValue([
      { eventID: "recE1", eventName: "Festival" },
    ]);

    const store = makeStore();
    await store.dispatch(fetchEventsRemote());

    expect(store.getState().events.list).toHaveLength(1);
  });

  it("aplana la forma { id, fields } de Airtable", async () => {
    eventsService.getEvents.mockResolvedValue([
      { id: "recE1", fields: { eventName: "Festival" } },
    ]);
    eventsDB.selectAllEvents.mockResolvedValue([{ eventID: "recE1" }]);

    const store = makeStore();
    await store.dispatch(fetchEventsRemote());

    const first = store.getState().events.list[0];
    expect(first.eventID).toBe("recE1");
    if (isWeb) expect(first.eventName).toBe("Festival");
  });

  it("solo persiste en SQLite en nativo", async () => {
    eventsService.getEvents.mockResolvedValue([{ eventID: "recE1" }]);

    const store = makeStore();
    await store.dispatch(fetchEventsRemote());

    if (isWeb) {
      expect(eventsDB.upsertEventsFromAPI).not.toHaveBeenCalled();
      expect(eventsDB.selectAllEvents).not.toHaveBeenCalled();
    } else {
      expect(eventsDB.upsertEventsFromAPI).toHaveBeenCalled();
      expect(eventsDB.selectAllEvents).toHaveBeenCalled();
    }
  });

  it("marca el estado como fallido si la API revienta", async () => {
    eventsService.getEvents.mockRejectedValue(new Error("timeout"));

    const store = makeStore();
    await store.dispatch(fetchEventsRemote());

    const { status, error, list } = store.getState().events;
    expect(status).toBe("failed");
    expect(error).toBe("timeout");
    expect(list).toEqual([]);
  });

  it("sobrevive a una respuesta vacia", async () => {
    eventsService.getEvents.mockResolvedValue([]);
    eventsDB.selectAllEvents.mockResolvedValue([]);

    const store = makeStore();
    await store.dispatch(fetchEventsRemote());

    expect(store.getState().events.status).toBe("succeeded");
    expect(store.getState().events.list).toEqual([]);
  });
});
