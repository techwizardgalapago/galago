import {
  WEEKDAYS,
  buildDefaultSchedules,
  sortSegments,
  groupVenueSchedules,
  buildCreatePayload,
  buildUpdatePayload,
  buildDeleteIds,
  flattenOriginal,
  validateDaySegments,
} from "../../src/features/venues/schedules";

const seg = (openingTime_, closingTime_, scheduleID) => ({
  scheduleID,
  openingTime_,
  closingTime_,
});

describe("buildDefaultSchedules", () => {
  it("crea los 7 dias apagados con una franja por defecto", () => {
    const days = buildDefaultSchedules();
    expect(days.map((d) => d.weekDay)).toEqual(WEEKDAYS);
    expect(days.every((d) => d.enabled === false)).toBe(true);
    expect(days[0].segments).toEqual([
      { scheduleID: undefined, openingTime_: "08:00", closingTime_: "22:00" },
    ]);
  });
});

describe("sortSegments", () => {
  it("ordena por hora de apertura sin mutar la entrada", () => {
    const input = [seg("14:00", "18:00"), seg("08:00", "12:00")];
    const out = sortSegments(input);

    expect(out.map((s) => s.openingTime_)).toEqual(["08:00", "14:00"]);
    expect(input[0].openingTime_).toBe("14:00"); // original intacto
  });
});

describe("validateDaySegments", () => {
  it("acepta franjas validas y sin solape", () => {
    expect(
      validateDaySegments([seg("08:00", "12:00"), seg("14:00", "18:00")])
    ).toBeNull();
  });

  it("rechaza horas fuera de la lista permitida", () => {
    expect(validateDaySegments([seg("08:17", "12:00")])).toMatch(
      /tiempos válidos/i
    );
  });

  it("rechaza apertura posterior o igual al cierre", () => {
    expect(validateDaySegments([seg("18:00", "12:00")])).toMatch(
      /apertura debe ser menor/i
    );
    expect(validateDaySegments([seg("12:00", "12:00")])).toMatch(
      /apertura debe ser menor/i
    );
  });

  it("detecta solapamientos entre franjas del mismo dia", () => {
    expect(
      validateDaySegments([seg("08:00", "14:00"), seg("12:00", "18:00")])
    ).toMatch(/solapamientos/i);
  });

  it("permite franjas que se tocan en el limite", () => {
    // 08:00-12:00 y 12:00-18:00 no se solapan
    expect(
      validateDaySegments([seg("08:00", "12:00"), seg("12:00", "18:00")])
    ).toBeNull();
  });

  it("considera valido un dia sin franjas", () => {
    expect(validateDaySegments([])).toBeNull();
  });
});

describe("groupVenueSchedules", () => {
  it("agrupa por dia, ordena y marca enabled solo los dias con datos", () => {
    const remote = [
      { scheduleID: "s2", weekDay: "Lunes", openingTime_: "14:00", closingTime_: "18:00" },
      { scheduleID: "s1", weekDay: "Lunes", openingTime_: "08:00", closingTime_: "12:00" },
    ];

    const grouped = groupVenueSchedules(remote);
    const lunes = grouped.find((d) => d.weekDay === "Lunes");
    const martes = grouped.find((d) => d.weekDay === "Martes");

    expect(lunes.enabled).toBe(true);
    expect(lunes.segments.map((s) => s.scheduleID)).toEqual(["s1", "s2"]);
    expect(martes.enabled).toBe(false);
  });

  it("acepta el formato con 'fields' del backend", () => {
    const remote = [
      { scheduleID: "s1", fields: { weekDay: "Martes", openingTime_: "09:00", closingTime_: "17:00" } },
    ];
    const martes = groupVenueSchedules(remote).find((d) => d.weekDay === "Martes");

    expect(martes.enabled).toBe(true);
    expect(martes.segments[0]).toEqual({
      scheduleID: "s1",
      openingTime_: "09:00",
      closingTime_: "17:00",
    });
  });

  it("normaliza horas invalidas al rango por defecto", () => {
    const remote = [
      { scheduleID: "s1", weekDay: "Lunes", openingTime_: "07:13", closingTime_: "no-hora" },
    ];
    const lunes = groupVenueSchedules(remote).find((d) => d.weekDay === "Lunes");

    expect(lunes.segments[0].openingTime_).toBe("08:00");
    expect(lunes.segments[0].closingTime_).toBe("22:00");
  });

  it("ignora dias desconocidos", () => {
    const grouped = groupVenueSchedules([
      { scheduleID: "s1", weekDay: "Funday", openingTime_: "08:00", closingTime_: "12:00" },
    ]);
    expect(grouped.every((d) => d.enabled === false)).toBe(true);
  });
});

describe("buildCreatePayload", () => {
  it("solo manda franjas nuevas de dias habilitados", () => {
    const ui = [
      { weekDay: "Lunes", enabled: true, segments: [seg("08:00", "12:00"), seg("14:00", "18:00", "s1")] },
      { weekDay: "Martes", enabled: false, segments: [seg("08:00", "12:00")] },
    ];

    const payload = buildCreatePayload(ui, "v1");

    expect(payload).toEqual([
      {
        fields: {
          linkedVenue: ["v1"],
          weekDay: "Lunes",
          openingTime_: "08:00",
          closingTime_: "12:00",
        },
      },
    ]);
  });
});

describe("buildUpdatePayload", () => {
  const original = [
    { scheduleID: "s1", weekDay: "Lunes", openingTime_: "08:00", closingTime_: "12:00" },
  ];

  it("solo incluye franjas que realmente cambiaron", () => {
    const sinCambios = [
      { weekDay: "Lunes", enabled: true, segments: [seg("08:00", "12:00", "s1")] },
    ];
    expect(buildUpdatePayload(sinCambios, "v1", original)).toEqual([]);

    const conCambios = [
      { weekDay: "Lunes", enabled: true, segments: [seg("08:00", "13:00", "s1")] },
    ];
    expect(buildUpdatePayload(conCambios, "v1", original)).toEqual([
      {
        id: "s1",
        fields: {
          linkedVenue: ["v1"],
          weekDay: "Lunes",
          openingTime_: "08:00",
          closingTime_: "13:00",
        },
      },
    ]);
  });

  it("ignora ids que no existen en el original", () => {
    const ui = [
      { weekDay: "Lunes", enabled: true, segments: [seg("08:00", "12:00", "fantasma")] },
    ];
    expect(buildUpdatePayload(ui, "v1", original)).toEqual([]);
  });
});

describe("buildDeleteIds", () => {
  const original = [
    { scheduleID: "s1", weekDay: "Lunes" },
    { scheduleID: "s2", weekDay: "Martes" },
  ];

  it("borra las franjas que la UI ya no conserva", () => {
    const ui = [
      { weekDay: "Lunes", enabled: true, segments: [seg("08:00", "12:00", "s1")] },
      { weekDay: "Martes", enabled: true, segments: [] },
    ];
    expect(buildDeleteIds(ui, original)).toEqual(["s2"]);
  });

  it("borra las franjas de un dia que se deshabilita", () => {
    const ui = [
      { weekDay: "Lunes", enabled: false, segments: [seg("08:00", "12:00", "s1")] },
      { weekDay: "Martes", enabled: true, segments: [seg("08:00", "12:00", "s2")] },
    ];
    expect(buildDeleteIds(ui, original)).toEqual(["s1"]);
  });
});

describe("flattenOriginal", () => {
  it("aplana ambos formatos y descarta filas sin id", () => {
    const out = flattenOriginal([
      { scheduleID: "s1", weekDay: "Lunes", openingTime_: "08:00", closingTime_: "12:00" },
      { fields: { scheduleID: "s2", weekDay: "Martes", openingTime_: "09:00", closingTime_: "17:00" } },
      { weekDay: "Miércoles", openingTime_: "10:00", closingTime_: "20:00" },
    ]);

    expect(out.map((o) => o.scheduleID)).toEqual(["s1", "s2"]);
    expect(out[1].weekDay).toBe("Martes");
  });
});
