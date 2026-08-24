/**
 * Verifica el contrato del push offline contra un backend REAL.
 *
 *   GALAGO_API_URL=https://... GALAGO_TOKEN=... npm run test:contract
 *
 * Sin esas variables se salta entero, y nunca corre con `npm test`.
 *
 * Usa los sanitizadores reales de src/services/syncTransforms.js, para que lo
 * que se verifique sea exactamente lo que la app envia, no una copia.
 *
 * Crea un local de prueba y lo borra al final, incluso si algo falla.
 */
import axios from "axios";
import {
  sanitizeVenue,
  sanitizeSchedule,
} from "../../src/services/syncTransforms";

const API_URL = process.env.GALAGO_API_URL;
const TOKEN = process.env.GALAGO_TOKEN;
const HABILITADO = Boolean(API_URL && TOKEN);

const SELLO = `ZZ-TEST-${Date.now()}`;

// Fila tal como vive en SQLite, con los nombres de columna de src/db/venues.js
const filaLocal = {
  venueID: "v_contract_test",
  venueName: `${SELLO} Local de prueba`,
  venueDescription: "Registro temporal creado por test:contract. Borrable.",
  venueCategory: "Restaurante",
  venueLocation: "Isla Santa Cruz",
  venueAddress: "Av. Charles Darwin s/n",
  venueContact: "0999999999",
  latitude: -0.7435,
  longitude: -90.3139,
  negocio: 1,
  deleted: 0,
  updated_at: Date.now(),
};

const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {},
  validateStatus: () => true, // queremos inspeccionar el status, no que lance
});

// Envoltorio: un fallo de red haria que axios lance un error que arrastra
// `config`, y ahi viaja la cabecera Authorization. Lo convertimos en una
// respuesta sintetica para que el token no pueda acabar impreso.
const seguro = async (fn) => {
  try {
    return await fn();
  } catch (e) {
    return { status: 0, data: `FALLO DE RED: ${e.code || e.message}` };
  }
};

const paso = (nombre, res) => {
  const cuerpo =
    typeof res.data === "string" ? res.data.slice(0, 300) : JSON.stringify(res.data)?.slice(0, 300);
  console.log(`\n[${nombre}] HTTP ${res.status}\n  ${cuerpo}`);
  return res;
};

const extraerId = (res, idKey) => {
  const data = res?.data;
  const rec = Array.isArray(data) ? data[0] : data;
  return rec?.[idKey] || rec?.id || null;
};

const d = HABILITADO ? describe : describe.skip;

d("contrato del push offline", () => {
  let venueID = null;
  let scheduleID = null;

  afterAll(async () => {
    // Limpieza incondicional: no dejar basura en la base.
    if (scheduleID) {
      const r = await seguro(() => api.delete(`venues-schedule/${encodeURIComponent(scheduleID)}`));
      console.log(`\n[limpieza horario ${scheduleID}] HTTP ${r.status}`);
    }
    if (venueID) {
      const r = await seguro(() => api.delete(`venues/${encodeURIComponent(venueID)}`));
      console.log(`[limpieza local ${venueID}] HTTP ${r.status}`);
    }
  });

  it("POST /venues acepta el envoltorio [{ fields }] que manda syncCollection", async () => {
    const fields = sanitizeVenue(filaLocal);
    const res = paso("POST /venues", await seguro(() => api.post("venues", [{ fields }])));

    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);

    venueID = extraerId(res, "venueID");
    // Si esto falla, syncCollection marcaria el alta como fallida aunque el
    // registro exista: es el caso 'create returned no id'.
    expect(venueID).toMatch(/^rec/);
  });

  it("GET /venues/:id devuelve los campos que se enviaron", async () => {
    expect(venueID).toBeTruthy();
    const res = paso(`GET /venues/${venueID}`, await seguro(() => api.get(`venues/${venueID}`)));

    expect(res.status).toBe(200);
    const rec = res.data?.fields || res.data;
    expect(rec.venueName).toBe(filaLocal.venueName);
    expect(Number(rec.latitude)).toBeCloseTo(filaLocal.latitude, 4);
    // El bug que arreglamos: la longitud llegaba siempre null.
    expect(Number(rec.longitude)).toBeCloseTo(filaLocal.longitude, 4);
  });

  it("PUT /venues/:id acepta el objeto plano (no PATCH, no envoltorio)", async () => {
    expect(venueID).toBeTruthy();
    const fields = sanitizeVenue({ ...filaLocal, venueName: `${SELLO} Renombrado` });
    const res = paso(`PUT /venues/${venueID}`, await seguro(() => api.put(`venues/${venueID}`, fields)));

    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
  });

  it("PATCH /venues/:id NO existe: por eso el default estaba mal", async () => {
    expect(venueID).toBeTruthy();
    const res = paso(`PATCH /venues/${venueID}`, await seguro(() => api.patch(`venues/${venueID}`, {})));

    // Documenta por que syncCollection usa PUT. Un 404/405 aqui es lo esperado.
    expect([404, 405]).toContain(res.status);
  });

  it("la lectura refleja el cambio de inmediato (invalidacion de cache)", async () => {
    expect(venueID).toBeTruthy();
    const res = paso(`GET /venues/${venueID} tras PUT`, await seguro(() => api.get(`venues/${venueID}`)));

    const rec = res.data?.fields || res.data;
    // Si esto falla, la clave venues:${id} no se esta invalidando al escribir.
    expect(rec.venueName).toBe(`${SELLO} Renombrado`);
  });

  it("POST /venues-schedule acepta lo que produce sanitizeSchedule", async () => {
    expect(venueID).toBeTruthy();
    const fields = sanitizeSchedule({
      venueID,
      dayOfWeek: "Lunes",
      openTime: "08:00",
      closeTime: "22:00",
    });
    const res = paso("POST /venues-schedule", await seguro(() => api.post("venues-schedule", [{ fields }])));

    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    scheduleID = extraerId(res, "scheduleID");
  });

  it("PUT /venues-schedule actualiza por lote, sin :id", async () => {
    if (!scheduleID) {
      console.log("\n[PUT /venues-schedule] omitido: el POST no devolvio scheduleID");
      return;
    }
    const fields = sanitizeSchedule({
      venueID,
      dayOfWeek: "Lunes",
      openTime: "09:00",
      closeTime: "21:00",
    });
    const res = paso(
      "PUT /venues-schedule",
      await seguro(() => api.put("venues-schedule", [{ id: scheduleID, fields }]))
    );

    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
  });

  it("un parametro desconocido responde 400, no 500", async () => {
    const res = paso("GET /venues?userID=", await seguro(() => api.get("venues", { params: { userID: "recX" } })));

    // Antes del error handler esto era un 500 con stack trace.
    expect(res.status).toBe(400);
  });
});

if (!HABILITADO) {
  describe("contrato del push offline", () => {
    it("omitido: faltan GALAGO_API_URL y GALAGO_TOKEN", () => {
      expect(true).toBe(true);
    });
  });
}
