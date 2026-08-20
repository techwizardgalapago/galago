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
export function sanitizeUser(u) {
  return {
    // Solo campos permitidos por backend de users
    firstName: toNull(u.firstName),
    lastName: toNull(u.lastName),
    userEmail: toNull(u.userEmail),
    userRole: toNull(u.userRole),
    countryOfOrigin: toNull(u.countryOfOrigin),
    dateOfBirth: toNull(u.dateOfBirth),
    reasonForTravel: toArrayOrEmpty(u.reasonForTravel),
    genero: toNull(u.genero),
  };
}

export function sanitizeVenue(v) {
  return {
    name: toNull(v.venueName),
    image: toNull(v.venueImage),               // si necesitas array/obj, ajusta
    description: toNull(v.venueDescription),
    category: toNull(v.venueCategory),
    location: toNull(v.venueLocation),
    address: toNull(v.venueAddress),
    contact: toNull(v.venueContact),
    latitude: v.latitude ?? null,
    longitude: v.longitude ?? v.longitud ?? null,
    negocio: toBool(v.negocio),
    ownerUserId: toNull(v.userID),
    deleted: v.deleted === 1,
    updatedAt: toISO(v.updated_at),
  };
}

export function sanitizeEvent(e) {
  return {
    name: toNull(e.eventName),
    image: toNull(e.eventImage),               // si guardas JSON de array, envíalo como string o ajusta a array
    description: toNull(e.eventDescription),
    tags: joinOrNull(e.eventTags),             // ajusta a array si backend así lo pide
    telOrganizador: toNull(e.telOrganizador),
    startTime: toNull(e.startTime),
    endTime: toNull(e.endTime),
    venueId: toNull(e.eventVenueID),
    venueName: toNull(e.eventVenueName),
    islandLocation: toNull(e.eventIslandLocation),
    direccionVenues: toNull(e.direccionVenues),
    organizador: toNull(e.organizador),
    capacity: e.eventCapacity ?? null,
    price: e.eventPrice ?? null,
    deleted: e.deleted === 1,
    updatedAt: toISO(e.updated_at),
  };
}

export function sanitizeSchedule(s) {
  return {
    dayOfWeek: toNull(s.dayOfWeek),
    openTime: toNull(s.openTime),
    closeTime: toNull(s.closeTime),
    venueId: toNull(s.venueID),
    deleted: s.deleted === 1,
    updatedAt: toISO(s.updated_at),
  };
}

// event_users es la join table
export function sanitizeEventUser(eu) {
  return {
    eventId: toNull(eu.eventID),
    userId: toNull(eu.userID),
    role: toNull(eu.role),
    deleted: eu.deleted === 1,
    updatedAt: toISO(eu.updated_at),
  };
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

