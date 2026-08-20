import {
  pushVenuesChanges,
  pushUsersChanges,
  pushSchedulesChanges,
  pushEventUsersChanges,
  pushAllChanges,
} from "../../src/services/syncService";
import { api } from "../../src/services/api";
import * as venuesDB from "../../src/db/venues";
import * as usersDB from "../../src/db/users";
import * as eventsDB from "../../src/db/events";
import * as schedulesDB from "../../src/db/schedules";
import * as eventUsersDB from "../../src/db/eventUsers";

jest.mock("../../src/services/api", () => ({
  api: {
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  API_URL: "https://api.galago.ec/api/v1/",
  buildApiUrl: (p = "") => `https://api.galago.ec/api/v1/${p}`,
  setAuthHeader: jest.fn(),
  setUnauthorizedHandler: jest.fn(),
}));
jest.mock("../../src/db/config", () => ({ getDatabase: jest.fn(() => ({})) }));
jest.mock("../../src/db/venues");
jest.mock("../../src/db/users");
jest.mock("../../src/db/events");
jest.mock("../../src/db/schedules");
jest.mock("../../src/db/eventUsers");

const httpError = (status) => Object.assign(new Error(`HTTP ${status}`), {
  response: { status },
});

// withRetry espera 400/800/1200ms entre intentos: adelantamos el reloj.
const runSync = async (fn) => {
  const promise = fn();
  await jest.advanceTimersByTimeAsync(10000);
  return promise;
};

const venueRow = (over = {}) => ({
  venueID: "v_local1",
  venueName: "La Nube",
  deleted: 0,
  updated_at: 1700000000000,
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();

  venuesDB.getUnsyncedVenues.mockResolvedValue([]);
  venuesDB.markVenuesSynced.mockResolvedValue();
  venuesDB.remapVenueId.mockResolvedValue();
  usersDB.getUnsyncedUsers.mockResolvedValue([]);
  usersDB.markUsersSynced.mockResolvedValue();
  usersDB.remapUserId.mockResolvedValue();
  eventsDB.getUnsyncedEvents.mockResolvedValue([]);
  schedulesDB.getUnsyncedSchedules.mockResolvedValue([]);
  eventUsersDB.getUnsyncedEventUsers.mockResolvedValue([]);
  eventUsersDB.markEventUsersSynced.mockResolvedValue();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("syncCollection: altas", () => {
  it("remapea el id local al real y lo marca como sincronizado", async () => {
    venuesDB.getUnsyncedVenues.mockResolvedValue([venueRow()]);
    api.post.mockResolvedValue({ data: [{ venueID: "recNuevo00000001" }] });

    const res = await runSync(pushVenuesChanges);

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(venuesDB.remapVenueId).toHaveBeenCalledWith("v_local1", "recNuevo00000001");
    expect(venuesDB.markVenuesSynced).toHaveBeenCalledWith(["recNuevo00000001"]);
    expect(res).toMatchObject({ created: 1, failed: 0 });
  });

  it("no marca como sincronizada un alta cuya respuesta no trae id", async () => {
    venuesDB.getUnsyncedVenues.mockResolvedValue([venueRow()]);
    api.post.mockResolvedValue({ data: { mensaje: "ok pero sin id" } });

    const res = await runSync(pushVenuesChanges);

    // Debe quedar pendiente para reintentar en el proximo sync.
    expect(venuesDB.remapVenueId).not.toHaveBeenCalled();
    expect(venuesDB.markVenuesSynced).not.toHaveBeenCalled();
    expect(res.failed).toBe(1);
  });

  it("deja la fila pendiente si el alta falla", async () => {
    venuesDB.getUnsyncedVenues.mockResolvedValue([venueRow()]);
    api.post.mockRejectedValue(httpError(500));

    const res = await runSync(pushVenuesChanges);

    expect(venuesDB.markVenuesSynced).not.toHaveBeenCalled();
    expect(res.failed).toBe(1);
  });
});

describe("syncCollection: reintentos", () => {
  it("reintenta 3 veces antes de rendirse", async () => {
    venuesDB.getUnsyncedVenues.mockResolvedValue([venueRow()]);
    api.post.mockRejectedValue(httpError(503));

    await runSync(pushVenuesChanges);

    expect(api.post).toHaveBeenCalledTimes(3);
  });

  it("se queda con el primer intento que funcione", async () => {
    venuesDB.getUnsyncedVenues.mockResolvedValue([venueRow()]);
    api.post
      .mockRejectedValueOnce(httpError(503))
      .mockResolvedValueOnce({ data: [{ venueID: "recNuevo00000001" }] });

    const res = await runSync(pushVenuesChanges);

    expect(api.post).toHaveBeenCalledTimes(2);
    expect(res).toMatchObject({ created: 1, failed: 0 });
  });
});

describe("syncCollection: updates", () => {
  it("convierte en alta un update que responde 404 y remapea si cambia el id", async () => {
    venuesDB.getUnsyncedVenues.mockResolvedValue([venueRow({ venueID: "recViejo00000001" })]);
    api.put.mockRejectedValue(httpError(404));
    api.post.mockResolvedValue({ data: [{ venueID: "recNuevo00000001" }] });

    const res = await runSync(pushVenuesChanges);

    expect(api.post).toHaveBeenCalled();
    expect(venuesDB.remapVenueId).toHaveBeenCalledWith(
      "recViejo00000001",
      "recNuevo00000001"
    );
    expect(venuesDB.markVenuesSynced).toHaveBeenCalledWith(["recNuevo00000001"]);
    expect(res).toMatchObject({ updated: 1, failed: 0 });
  });

  it("deja pendiente el update si tambien falla el alta de rescate", async () => {
    venuesDB.getUnsyncedVenues.mockResolvedValue([venueRow({ venueID: "recViejo00000001" })]);
    api.put.mockRejectedValue(httpError(404));
    api.post.mockRejectedValue(httpError(500));

    const res = await runSync(pushVenuesChanges);

    expect(venuesDB.markVenuesSynced).not.toHaveBeenCalled();
    expect(res.failed).toBe(1);
  });

  it("no intenta crear cuando el error no es 404", async () => {
    venuesDB.getUnsyncedVenues.mockResolvedValue([venueRow({ venueID: "recViejo00000001" })]);
    api.put.mockRejectedValue(httpError(500));

    const res = await runSync(pushVenuesChanges);

    expect(api.post).not.toHaveBeenCalled();
    expect(res.failed).toBe(1);
  });

  it("actualiza con PUT: el backend no tiene rutas PATCH", async () => {
    usersDB.getUnsyncedUsers.mockResolvedValue([
      { userID: "recUser000000001", firstName: "Ana", deleted: 0 },
    ]);
    api.put.mockResolvedValue({ data: {} });

    await runSync(pushUsersChanges);

    expect(api.put).toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
  });
});

describe("syncCollection: borrados", () => {
  it("trata un 404 al borrar como exito", async () => {
    venuesDB.getUnsyncedVenues.mockResolvedValue([
      venueRow({ venueID: "recBorrado000001", deleted: 1 }),
    ]);
    api.delete.mockRejectedValue(httpError(404));

    const res = await runSync(pushVenuesChanges);

    // Ya no existe en el servidor: no hay nada que reintentar.
    expect(venuesDB.markVenuesSynced).toHaveBeenCalledWith(["recBorrado000001"]);
    expect(res.failed).toBe(0);
  });

  it("no construye una URL de borrado sin id", async () => {
    eventUsersDB.getUnsyncedEventUsers.mockResolvedValue([
      { eventID: "recE1", userID: "recU1", deleted: 1 },
    ]);

    const res = await runSync(pushEventUsersChanges);

    expect(api.delete).not.toHaveBeenCalled();
    expect(res.failed).toBe(1);
  });
});

describe("syncCollection: garantia de isSynced", () => {
  it("marca solo las filas que el servidor acepto", async () => {
    venuesDB.getUnsyncedVenues.mockResolvedValue([
      venueRow({ venueID: "v_ok" }),
      venueRow({ venueID: "v_falla" }),
    ]);
    api.post
      .mockResolvedValueOnce({ data: [{ venueID: "recOk00000000001" }] })
      .mockRejectedValue(httpError(500));

    await runSync(pushVenuesChanges);

    const marcados = venuesDB.markVenuesSynced.mock.calls[0][0];
    expect(marcados).toEqual(["recOk00000000001"]);
    expect(marcados).not.toContain("v_falla");
  });

  it("no llama a markSynced si no hubo ningun exito", async () => {
    venuesDB.getUnsyncedVenues.mockResolvedValue([venueRow()]);
    api.post.mockRejectedValue(httpError(500));

    await runSync(pushVenuesChanges);

    expect(venuesDB.markVenuesSynced).not.toHaveBeenCalled();
  });

  it("no toca la red si no hay nada pendiente", async () => {
    const res = await runSync(pushVenuesChanges);

    expect(api.post).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
    expect(venuesDB.markVenuesSynced).not.toHaveBeenCalled();
    expect(res).toEqual({ created: 0, updated: 0, deleted: 0, failed: 0 });
  });
});

describe("pushAllChanges", () => {
  it("sincroniza los padres antes que los hijos", async () => {
    const orden = [];
    usersDB.getUnsyncedUsers.mockImplementation(async () => (orden.push("users"), []));
    venuesDB.getUnsyncedVenues.mockImplementation(async () => (orden.push("venues"), []));
    eventsDB.getUnsyncedEvents.mockImplementation(async () => (orden.push("events"), []));
    schedulesDB.getUnsyncedSchedules.mockImplementation(async () => (orden.push("schedules"), []));
    eventUsersDB.getUnsyncedEventUsers.mockImplementation(async () => (orden.push("eventUsers"), []));

    await runSync(pushAllChanges);

    // El remapeo de ids de padres debe ocurrir antes de enviar a los hijos.
    expect(orden).toEqual(["users", "venues", "events", "schedules", "eventUsers"]);
  });

  it("devuelve el resumen por coleccion", async () => {
    const res = await runSync(pushAllChanges);

    expect(Object.keys(res)).toEqual([
      "users",
      "venues",
      "events",
      "schedules",
      "eventUsers",
    ]);
  });
});

describe("contrato con el backend", () => {
  it("envuelve el alta como [{ fields }]", async () => {
    venuesDB.getUnsyncedVenues.mockResolvedValue([
      venueRow({ venueName: "La Nube", venueDescription: "Bar" }),
    ]);
    api.post.mockResolvedValue({ data: [{ venueID: "recNuevo00000001" }] });

    await runSync(pushVenuesChanges);

    const [url, body] = api.post.mock.calls[0];
    expect(url).toBe("venues");
    expect(Array.isArray(body)).toBe(true);
    expect(body[0]).toHaveProperty("fields");
    expect(body[0].fields).toMatchObject({ venueName: "La Nube" });
  });

  it("manda el update plano, sin envoltorio", async () => {
    venuesDB.getUnsyncedVenues.mockResolvedValue([
      venueRow({ venueID: "recViejo00000001", venueName: "La Nube" }),
    ]);
    api.put.mockResolvedValue({ data: {} });

    await runSync(pushVenuesChanges);

    const [url, body] = api.put.mock.calls[0];
    expect(url).toBe("venues/recViejo00000001");
    expect(Array.isArray(body)).toBe(false);
    expect(body).toMatchObject({ venueName: "La Nube" });
    expect(body).not.toHaveProperty("fields");
  });

  it("lee el id del alta desde la respuesta en array de Airtable", async () => {
    venuesDB.getUnsyncedVenues.mockResolvedValue([venueRow()]);
    // airtable.crud.createRecord devuelve [fields], no { id }
    api.post.mockResolvedValue({
      data: [{ venueID: "recDesdeArray001", venueName: "La Nube" }],
    });

    await runSync(pushVenuesChanges);

    expect(venuesDB.remapVenueId).toHaveBeenCalledWith("v_local1", "recDesdeArray001");
  });

  it("los horarios van a /venues-schedule y se actualizan por lote", async () => {
    schedulesDB.getUnsyncedSchedules.mockResolvedValue([
      {
        scheduleID: "recSched00000001",
        venueID: "recVenue00000001",
        dayOfWeek: "Lunes",
        openTime: "08:00",
        closeTime: "22:00",
        deleted: 0,
      },
    ]);
    schedulesDB.markSchedulesSynced.mockResolvedValue();
    schedulesDB.remapScheduleId.mockResolvedValue();
    api.put.mockResolvedValue({ data: {} });

    await runSync(pushSchedulesChanges);

    const [url, body] = api.put.mock.calls[0];
    // PUT /venues-schedule sin :id, con [{ id, fields }]
    expect(url).toBe("venues-schedule");
    expect(body).toEqual([
      {
        id: "recSched00000001",
        fields: {
          linkedVenue: ["recVenue00000001"],
          weekDay: "Lunes",
          openingTime_: "08:00",
          closingTime_: "22:00",
        },
      },
    ]);
  });

  it("no emite peticiones de event_users mientras el recurso no exista", async () => {
    eventUsersDB.getUnsyncedEventUsers.mockResolvedValue([
      { eventID: "recE1", userID: "recU1", deleted: 0 },
    ]);

    const res = await runSync(pushEventUsersChanges);

    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
    // Quedan pendientes, no se marcan como sincronizadas.
    expect(eventUsersDB.markEventUsersSynced).not.toHaveBeenCalled();
    expect(res.failed).toBe(1);
  });
});
