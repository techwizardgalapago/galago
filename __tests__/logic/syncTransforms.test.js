import {
  isLocalId,
  toArrayOrEmpty,
  toISO,
  sanitizeUser,
  sanitizeVenue,
  sanitizeEvent,
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

describe("sanitizeUser", () => {
  it("siempre manda reasonForTravel como array", () => {
    expect(sanitizeUser({ reasonForTravel: "Turismo" }).reasonForTravel).toEqual([
      "Turismo",
    ]);
    expect(sanitizeUser({}).reasonForTravel).toEqual([]);
  });
});

describe("sanitizeVenue", () => {
  const row = {
    venueName: "La Nube",
    venueDescription: "Bar",
    venueCategory: "Gastronomia",
    latitude: -0.7435,
    longitude: -90.3139,
    negocio: 1,
    userID: "recUser1",
    deleted: 0,
    updated_at: 1700000000000,
  };

  it("mapea las columnas de SQLite a los campos del backend", () => {
    const out = sanitizeVenue(row);
    expect(out.name).toBe("La Nube");
    expect(out.description).toBe("Bar");
    expect(out.ownerUserId).toBe("recUser1");
    expect(out.negocio).toBe(true);
    expect(out.deleted).toBe(false);
  });

  it("conserva la longitud del local", () => {
    // La columna en SQLite es `longitude` (ver src/db/venues.js)
    expect(sanitizeVenue(row).longitude).toBe(-90.3139);
  });

  it("conserva la latitud del local", () => {
    expect(sanitizeVenue(row).latitude).toBe(-0.7435);
  });
});

describe("sanitizeEvent", () => {
  it("une los tags en un string", () => {
    expect(sanitizeEvent({ eventTags: ["Musica", "Arte"] }).tags).toBe(
      "Musica, Arte"
    );
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
