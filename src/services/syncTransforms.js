// -------------------------------------------------
// src/services/syncTransforms.js
// Transformaciones puras usadas por syncService.
// Sin dependencias de SQLite ni de react-native: testeables en Node.
// -------------------------------------------------


export const isLocalId = (id) =>
  typeof id === 'string' && /^(u_|e_|v_|s_|tmp_)/i.test(id);

// Normalizar falsy → null, booleanos, fechas ISO.
export const toNull = (v) => (v === '' || v === undefined ? null : v);
export const toBool = (v) => (v === 1 || v === true);
export const toISO = (msOrIso) => {
  if (!msOrIso) return null;
  if (typeof msOrIso === 'number') return new Date(msOrIso).toISOString();
  const t = new Date(msOrIso).getTime();
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
};
export const firstOrNull = (v) => Array.isArray(v) ? (v.length ? v[0] : null) : (v ?? null);
export const joinOrNull = (v) => Array.isArray(v) ? (v.length ? v.join(', ') : null) : toNull(v);
export const toArrayOrEmpty = (v) => {
  if (Array.isArray(v)) return v.filter((item) => item !== null && item !== undefined && `${item}`.trim());
  if (v === null || v === undefined) return [];
  const asString = `${v}`.trim();
  if (!asString) return [];
  return asString
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

// -------------------------
// Sanitizadores por entidad
// (ajústalos a lo que espera tu backend)
// -------------------------
// -------------------------
// Sanitizadores por entidad
//
// Cada uno devuelve el objeto PLANO de campos tal como lo nombra el backend
// (ver galapago_backend/schemas/**). syncService lo envuelve como
// [{ fields }] para POST y lo manda plano para PUT.
//
// Las claves con valor null/undefined se omiten: los schemas de Joi no
// aceptan null y un update parcial no debe pisar campos que no cambiaron.
// -------------------------

export const stripEmpty = (obj) => {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
};

const asRecordIds = (v) => {
  const list = Array.isArray(v) ? v : v ? [v] : [];
  return list.filter((id) => typeof id === 'string' && id.startsWith('rec'));
};

export function sanitizeUser(u) {
  return stripEmpty({
    firstName: toNull(u.firstName),
    lastName: toNull(u.lastName),
    userEmail: toNull(u.userEmail),
    userRole: toNull(u.userRole),
    countryOfOrigin: toNull(u.countryOfOrigin),
    dateOfBirth: toNull(u.dateOfBirth),
    reasonForTravel: toArrayOrEmpty(u.reasonForTravel),
    genero: toNull(u.genero),
  });
}

export function sanitizeVenue(v) {
  // venueImage se omite a proposito: el backend espera [{ url }] y las
  // imagenes viajan por su propia ruta (/venues-img).
  return stripEmpty({
    venueName: toNull(v.venueName),
    venueDescription: toNull(v.venueDescription),
    venueCategory: toNull(v.venueCategory),
    venueLocation: toNull(v.venueLocation),
    venueAddress: toNull(v.venueAddress),
    venueContact: toNull(v.venueContact),
    latitude: v.latitude ?? null,
    longitude: v.longitude ?? v.longitud ?? null,
    negocio: v.negocio === undefined || v.negocio === null ? null : toBool(v.negocio),
    userID: asRecordIds(v.userID),
  });
}

export function sanitizeEvent(e) {
  return stripEmpty({
    eventName: toNull(e.eventName),
    eventDescription: toNull(e.eventDescription),
    eventTags: toArrayOrEmpty(e.eventTags),
    TelOrganizador: toNull(e.telOrganizador ?? e.TelOrganizador),
    startTime: toNull(e.startTime),
    endTime: toNull(e.endTime),
    eventVenueID: asRecordIds(e.eventVenueID),
    organizador: toNull(e.organizador),
    eventCapacity: e.eventCapacity ?? null,
    eventPrice: e.eventPrice ?? null,
  });
}

export function sanitizeSchedule(s) {
  return stripEmpty({
    linkedVenue: asRecordIds(s.venueID),
    weekDay: toNull(s.dayOfWeek ?? s.weekDay),
    openingTime_: toNull(s.openTime ?? s.openingTime_),
    closingTime_: toNull(s.closeTime ?? s.closingTime_),
  });
}

// event_users no tiene recurso en el backend todavia.
export function sanitizeEventUser(eu) {
  return stripEmpty({
    eventId: toNull(eu.eventID),
    userId: toNull(eu.userID),
    role: toNull(eu.role),
  });
}

// -------------------------
// Particionar: create/update/delete
// - create: id local (u_/e_/v_/s_/tmp_...) o sin id real
// - update: id real y deleted=0
// - delete: deleted=1 → usar DELETE
// -------------------------
export function partition(rows, idKey = 'id') {
  const toCreate = [];
  const toUpdate = [];
  const toDelete = [];

  for (const r of rows) {
    const id = idKey ? r[idKey] : undefined;
    const hasRemoteId = id !== undefined && id !== null && `${id}`.trim() !== '';
    if (r.deleted === 1) {
      toDelete.push(r);
    } else if (!hasRemoteId || isLocalId(id)) {
      toCreate.push(r);
    } else {
      toUpdate.push(r);
    }
  }
  return { toCreate, toUpdate, toDelete };
}

