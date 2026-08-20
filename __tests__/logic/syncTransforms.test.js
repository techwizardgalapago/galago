import {
  isLocalId,
  toArrayOrEmpty,
  toISO,
  sanitizeUser,
  sanitizeVenue,
  sanitizeEvent,
  sanitizeSchedule,
  stripEmpty,
  partition,
} from "../../src/services/syncTransforms";

describe("isLocalId", () => {
  it("reconoce los prefijos locales", () => {
    ["u_1", "e_1", "v_1", "s_1", "tmp_1"].forEach((id) =>
      expect(isLocalId(id)).toBe(true)
    );
  });

  it("trata los ids de Airtable como remotos", () => {
    expect(isLocalId("recZIbq07g9c3uIqX")).toBe(false);
    expect(isLocalId(undefined)).toBe(false);
  });
});

describe("toArrayOrEmpty", () => {
  it("parte strings separados por coma", () => {
    expect(toArrayOrEmpty("Turismo, Estudio")).toEqual(["Turismo", "Estudio"]);
  });

  it("normaliza vacios a []", () => {
    expect(toArrayOrEmpty("")).toEqual([]);
    expect(toArrayOrEmpty(null)).toEqual([]);
    expect(toArrayOrEmpty(undefined)).toEqual([]);
  });
});

describe("toISO", () => {
  it("convierte timestamps de SQLite a ISO", () => {
    expect(toISO(0)).toBeNull(); // falsy: la fila no tiene fecha
    expect(toISO(1700000000000)).toBe("2023-11-14T22:13:20.000Z");
  });

  it("devuelve null ante fechas invalidas", () => {
    expect(toISO("no-es-fecha")).toBeNull();
  });
});

// Los nombres de campo salen de galapago_backend/schemas/**: si el backend
// cambia un nombre, estos tests deben romperse.
describe("sanitizeUser", () => {
  it("usa los nombres de updateUserSchema", () => {
    const out = sanitizeUser({
      firstName: "Ana",
      lastName: "Perez",
      userEmail: "ana@example.com",
      userRole: "turista",
      countryOfOrigin: "Ecuador",
      reasonForTravel: "Turismo",
      genero: "femenino",
    });

    expect(out).toEqual({
      firstName: "Ana",
      lastName: "Perez",
      userEmail: "ana@example.com",
      userRole: "turista",
      countryOfOrigin: "Ecuador",
      reasonForTravel: ["Turismo"],
      genero: "femenino",
    });
  });

  it("omite los campos vacios en vez de mandar null", () => {
    // Joi rechaza null: un update parcial no debe pisar lo que no cambio.
    const out = sanitizeUser({ firstName: "Ana" });

    expect(out).toEqual({ firstName: "Ana" });
    expect(Object.values(out)).not.toContain(null);
  });
});

describe("sanitizeVenue", () => {
  const row = {
    venueName: "La Nube",
    venueDescription: "Bar",
    venueCategory: "Gastronomia",
    venueLocation: "Santa Cruz",
    venueAddress: "Av. Charles Darwin",
    venueContact: "+593999999999",
    venueImage: "https://cdn/x.png",
    latitude: -0.7435,
    longitude: -90.3139,
    negocio: 1,
    userID: "recUser000000001",
    deleted: 0,
    updated_at: 1700000000000,
  };

  it("usa los nombres de updateVenueSchema", () => {
    expect(sanitizeVenue(row)).toEqual({
      venueName: "La Nube",
      venueDescription: "Bar",
      venueCategory: "Gastronomia",
      venueLocation: "Santa Cruz",
      venueAddress: "Av. Charles Darwin",
      venueContact: "+593999999999",
      latitude: -0.7435,
      longitude: -90.3139,
      negocio: true,
      userID: ["recUser000000001"],
    });
  });

  it("conserva latitud y longitud", () => {
    // La columna en SQLite es 'longitude' (ver src/db/venues.js)
    expect(sanitizeVenue(row).longitude).toBe(-90.3139);
    expect(sanitizeVenue(row).latitude).toBe(-0.7435);
  });

  it("no manda campos que el schema no conoce", () => {
    const out = sanitizeVenue(row);
    ["deleted", "updatedAt", "updated_at", "isSynced", "venueID"].forEach((k) =>
      expect(out).not.toHaveProperty(k)
    );
  });

  it("omite venueImage: viaja por /venues-img con otra forma", () => {
    expect(sanitizeVenue(row)).not.toHaveProperty("venueImage");
  });

  it("manda userID como array de ids rec, descartando lo demas", () => {
    expect(sanitizeVenue({ ...row, userID: ["recUser000000001"] }).userID).toEqual([
      "recUser000000001",
    ]);
    expect(sanitizeVenue({ ...row, userID: "u_local" })).not.toHaveProperty("userID");
  });
});

describe("sanitizeEvent", () => {
  it("usa los nombres de updateEventSchema", () => {
    const out = sanitizeEvent({
      eventName: "Festival",
      eventDescription: "En la playa",
      eventTags: ["Musica", "Arte"],
      telOrganizador: "+593999999999",
      startTime: "2026-10-14T18:00",
      endTime: "2026-10-14T23:00",
      eventVenueID: "recVenue00000001",
      organizador: "La Nube",
      eventCapacity: 100,
      eventPrice: 0,
    });

    expect(out).toEqual({
      eventName: "Festival",
      eventDescription: "En la playa",
      eventTags: ["Musica", "Arte"],
      TelOrganizador: "+593999999999", // el backend lo escribe con T mayuscula
      startTime: "2026-10-14T18:00",
      endTime: "2026-10-14T23:00",
      eventVenueID: ["recVenue00000001"],
      organizador: "La Nube",
      eventCapacity: 100,
      eventPrice: 0,
    });
  });

  it("manda los tags como array, no como string unido", () => {
    expect(sanitizeEvent({ eventTags: "Musica, Arte" }).eventTags).toEqual([
      "Musica",
      "Arte",
    ]);
  });
});

describe("sanitizeSchedule", () => {
  it("usa los nombres de createVenueScheduleSchema", () => {
    expect(
      sanitizeSchedule({
        venueID: "recVenue00000001",
        dayOfWeek: "Lunes",
        openTime: "08:00",
        closeTime: "22:00",
      })
    ).toEqual({
      linkedVenue: ["recVenue00000001"],
      weekDay: "Lunes",
      openingTime_: "08:00",
      closingTime_: "22:00",
    });
  });
});

describe("stripEmpty", () => {
  it("quita null, undefined y arrays vacios", () => {
    expect(
      stripEmpty({ a: 1, b: null, c: undefined, d: [], e: [1], f: 0, g: false, h: "" })
    ).toEqual({ a: 1, e: [1], f: 0, g: false, h: "" });
  });
});

describe("partition", () => {
  const rows = [
    { venueID: "v_local", deleted: 0 },
    { venueID: "recRemoto", deleted: 0 },
    { venueID: "recBorrado", deleted: 1 },
  ];

  it("separa create / update / delete por tipo de id", () => {
    const { toCreate, toUpdate, toDelete } = partition(rows, "venueID");
    expect(toCreate.map((r) => r.venueID)).toEqual(["v_local"]);
    expect(toUpdate.map((r) => r.venueID)).toEqual(["recRemoto"]);
    expect(toDelete.map((r) => r.venueID)).toEqual(["recBorrado"]);
  });

  it("no clasifica como update filas sin id", () => {
    // Sin id no se puede construir PATCH /recurso/:id — deben ser altas.
    const sinId = [{ eventID: "recE1", userID: "recU1", deleted: 0 }];
    const { toCreate, toUpdate } = partition(sinId, undefined);
    expect(toUpdate).toHaveLength(0);
    expect(toCreate).toHaveLength(1);
  });
});
