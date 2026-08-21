import { Platform } from "react-native";
import { configureStore } from "@reduxjs/toolkit";
import eventUsersReducer, {
  fetchEventsByUser,
  fetchUsersByEvent,
  addEventUser,
} from "../../src/store/slices/eventUsersSlice";
import * as eventUsersDB from "../../src/db/eventUsers";

jest.mock("../../src/db/eventUsers");

const isWeb = Platform.OS === "web";
const makeStore = () =>
  configureStore({ reducer: { eventUsers: eventUsersReducer } });

beforeEach(() => {
  jest.clearAllMocks();
  eventUsersDB.getEventsByUser.mockResolvedValue([
    { eventID: "recE1" },
    { eventID: "recE2" },
  ]);
  eventUsersDB.getUsersByEvent.mockResolvedValue([{ userID: "recU1" }]);
  eventUsersDB.insertEventUser.mockResolvedValue();
});

describe(`eventUsersSlice en ${Platform.OS}`, () => {
  it("indexa los eventos bajo el userID, no bajo el primer evento", async () => {
    const store = makeStore();
    await store.dispatch(fetchEventsByUser("recU1"));

    const { eventsByUser } = store.getState().eventUsers;
    expect(Object.keys(eventsByUser)).toEqual(["recU1"]);
    expect(eventsByUser.recU1).toEqual(isWeb ? [] : [{ eventID: "recE1" }, { eventID: "recE2" }]);
  });

  it("indexa los usuarios bajo el eventID", async () => {
    const store = makeStore();
    await store.dispatch(fetchUsersByEvent("recE1"));

    const { usersByEvent } = store.getState().eventUsers;
    expect(Object.keys(usersByEvent)).toEqual(["recE1"]);
    expect(usersByEvent.recE1).toEqual(isWeb ? [] : [{ userID: "recU1" }]);
  });

  it("no crea una clave basura cuando lo despachan sin id", async () => {
    // store/rehydration.js despacha fetchEventsByUser() sin argumento.
    const store = makeStore();
    const res = await store.dispatch(fetchEventsByUser());

    expect(res.type).toBe("eventUsers/fetchEventsByUser/fulfilled");
    expect(store.getState().eventUsers.eventsByUser).toEqual({});
  });

  it("addEventUser inserta con los argumentos posicionales correctos", async () => {
    const store = makeStore();
    await store.dispatch(
      addEventUser({ eventID: "recE1", userID: "recU1", role: "asistente" })
    );

    if (isWeb) {
      expect(eventUsersDB.insertEventUser).not.toHaveBeenCalled();
    } else {
      // insertEventUser(eventID, userID, role) — no recibe un objeto
      expect(eventUsersDB.insertEventUser).toHaveBeenCalledWith(
        "recE1",
        "recU1",
        "asistente"
      );
    }
    expect(store.getState().eventUsers.list).toContainEqual({
      eventID: "recE1",
      userID: "recU1",
      role: "asistente",
    });
  });

  it("addEventUser admite role opcional", async () => {
    const store = makeStore();
    await store.dispatch(addEventUser({ eventID: "recE1", userID: "recU1" }));

    if (!isWeb) {
      expect(eventUsersDB.insertEventUser).toHaveBeenCalledWith("recE1", "recU1", null);
    }
  });
});
