import axios from 'axios';
import { getDatabase } from '../db/config';

import {
  getUnsyncedUsers, markUsersSynced, remapUserId,
} from '../db/users';

import {
  getUnsyncedEvents, markEventsSynced, remapEventId,
} from '../db/events';

import {
  getUnsyncedVenues, markVenuesSynced, remapVenueId,
} from '../db/venues';

import {
  getUnsyncedSchedules, markSchedulesSynced, remapScheduleId,
} from '../db/schedules';

// Usa event_users (snake) como tabla canónica
import {
  getUnsyncedEventUsers, markEventUsersSynced, remapEventUserKeys,
} from '../db/eventUsers'; // remapEventUserKeys({ oldEventID, newEventID, oldUserID, newUserID })

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://18.119.60.28/api/v1/';

// -------------------------
// Helpers básicos
// -------------------------
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
async function withRetry(fn, { retries = 2, baseDelay = 400 } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try { return await fn(); } catch (e) { lastErr = e; }
    await delay(baseDelay * (i + 1));
  }
  throw lastErr;
}

const isLocalId = (id) =>
  typeof id === 'string' && /^(u_|e_|v_|s_|tmp_)/i.test(id);

// Normalizar falsy → null, booleanos, fechas ISO.
const toNull = (v) => (v === '' || v === undefined ? null : v);
const toBool = (v) => (v === 1 || v === true);
const toISO = (msOrIso) => {
  if (!msOrIso) return null;
  if (typeof msOrIso === 'number') return new Date(msOrIso).toISOString();
  const t = new Date(msOrIso).getTime();
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
};
const firstOrNull = (v) => Array.isArray(v) ? (v.length ? v[0] : null) : (v ?? null);
const joinOrNull = (v) => Array.isArray(v) ? (v.length ? v.join(', ') : null) : toNull(v);

// -------------------------
// Sanitizadores por entidad
// (ajústalos a lo que espera tu backend)
// -------------------------
function sanitizeUser(u) {
  return {
    // NO mandes userID en POST (server crea ID)
    firstName: toNull(u.firstName),
    lastName: toNull(u.lastName),
    email: toNull(u.userEmail),
    countryOfOrigin: toNull(u.countryOfOrigin),
    dateOfBirth: toNull(u.dateOfBirth), // o ISO si backend lo requiere estricto
    reasonForTravel: toNull(u.reasonForTravel), // si backend espera array: split por coma
    role: toNull(u.userRole),
    googleAccount: toBool(u.googleAccount),
    deleted: u.deleted === 1,
    updatedAt: toISO(u.updated_at),
  };
}

function sanitizeVenue(v) {
  return {
    name: toNull(v.venueName),
    image: toNull(v.venueImage),               // si necesitas array/obj, ajusta
    description: toNull(v.venueDescription),
    category: toNull(v.venueCategory),
    location: toNull(v.venueLocation),
    address: toNull(v.venueAddress),
    contact: toNull(v.venueContact),
    latitude: v.latitude ?? null,
    longitude: v.longitud ?? null,
    negocio: toBool(v.negocio),
    ownerUserId: toNull(v.userID),
    deleted: v.deleted === 1,
    updatedAt: toISO(v.updated_at),
  };
}

function sanitizeEvent(e) {
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

function sanitizeSchedule(s) {
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
function sanitizeEventUser(eu) {
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
function partition(rows, idKey = 'id') {
  const toCreate = [];
  const toUpdate = [];
  const toDelete = [];

  for (const r of rows) {
    const id = r[idKey];
    if (r.deleted === 1) {
      toDelete.push(r);
    } else if (isLocalId(id)) {
      toCreate.push(r);
    } else {
      toUpdate.push(r);
    }
  }
  return { toCreate, toUpdate, toDelete };
}

// -------------------------
// Motor genérico de sync por colección
// -------------------------
async function syncCollection({
  name,                   // 'users' | 'events' | ...
  idKey,                  // 'userID' | 'eventID' | ...
  getUnsynced,            // () => Promise<rows[]>
  sanitize,               // (row) => body payload
  markSynced,             // (ids[]) => Promise<void>
  remapId,                // (oldId, newId) => Promise<void>
  endpoints,              // { base: '/users' }
}) {
  const rows = await getUnsynced();
  if (!rows.length) {
    console.log(`✅ No unsynced ${name} records.`);
    return { created: 0, updated: 0, deleted: 0, failed: 0 };
  }

  const { toCreate, toUpdate, toDelete } = partition(rows, idKey);
  const ok = [];
  const failed = [];

  // CREATE: POST sin id
  for (const r of toCreate) {
    const body = sanitize(r);
    try {
      const resp = await withRetry(() => axios.post(`${API_URL}${endpoints.base}`, body));
      const newId = resp?.data?.id || resp?.data?.[idKey] || resp?.data?.airtableId;
      if (!newId) {
        console.warn(`⚠️ ${name} create returned no id`, resp?.data);
        failed.push(r[idKey]); // no podemos marcar synced
        continue;
      }
      // Remapear ID local → real (y actualizar cualquier FK relacionada)
      await remapId(r[idKey], newId);
      ok.push(newId);
    } catch (e) {
      console.warn(`❌ Create ${name} failed`, r[idKey], e.response?.status, e.response?.data || e.message);
      failed.push(r[idKey]);
    }
  }

  // UPDATE: PATCH /:id
  for (const r of toUpdate) {
    const body = sanitize(r);
    const id = r[idKey];
    try {
      await withRetry(() => axios.patch(`${API_URL}${endpoints.base}/${encodeURIComponent(id)}`, body));
      ok.push(id);
    } catch (e) {
      if (e.response?.status === 404) {
        // Curar desalineaciones: intenta crear
        try {
          const resp = await withRetry(() => axios.post(`${API_URL}${endpoints.base}`, body));
          const newId = resp?.data?.id || resp?.data?.[idKey];
          if (newId && newId !== id) await remapId(id, newId);
          ok.push(newId || id);
        } catch (e2) {
          console.warn(`❌ Upsert ${name} after 404 failed`, id, e2.response?.status, e2.response?.data || e2.message);
          failed.push(id);
        }
      } else {
        console.warn(`❌ Update ${name} failed`, id, e.response?.status, e.response?.data || e.message);
        failed.push(id);
      }
    }
  }

  // DELETE: DELETE /:id
  for (const r of toDelete) {
    const id = r[idKey];
    try {
      await withRetry(() => axios.delete(`${API_URL}${endpoints.base}/${encodeURIComponent(id)}`));
      ok.push(id);
    } catch (e) {
      if (e.response?.status === 404) {
        // Ya no existe: márcalo como synced
        ok.push(id);
      } else {
        console.warn(`❌ Delete ${name} failed`, id, e.response?.status, e.response?.data || e.message);
        failed.push(id);
      }
    }
  }

  // Marcar como synced solo los OK
  if (ok.length) await markSynced(ok);

  const res = {
    created: toCreate.length,
    updated: toUpdate.length,
    deleted: toDelete.length,
    failed: failed.length,
  };
  console.log(`📤 ${name} sync result:`, res);
  return res;
}

// -------------------------
// Syncs concretos por tabla
// -------------------------
export async function pushUsersChanges() {
  return syncCollection({
    name: 'users',
    idKey: 'userID',
    getUnsynced: getUnsyncedUsers,
    sanitize: sanitizeUser,
    markSynced: markUsersSynced,
    remapId: async (oldId, newId) => {
      // remapea userID en users y event_users.userID
      await remapUserId(oldId, newId);
      // también puedes tocar otras tablas si referencian userID
    },
    endpoints: { base: 'users' }, // -> POST /users, PATCH /users/:id, DELETE /users/:id
  });
}

export async function pushVenuesChanges() {
  return syncCollection({
    name: 'venues',
    idKey: 'venueID',
    getUnsynced: getUnsyncedVenues,
    sanitize: sanitizeVenue,
    markSynced: markVenuesSynced,
    remapId: async (oldId, newId) => {
      // remapea venueID en venues y events.eventVenueID
      await remapVenueId(oldId, newId);
    },
    endpoints: { base: 'venues' },
  });
}

export async function pushEventsChanges() {
  return syncCollection({
    name: 'events',
    idKey: 'eventID',
    getUnsynced: getUnsyncedEvents,
    sanitize: sanitizeEvent,
    markSynced: markEventsSynced,
    remapId: async (oldId, newId) => {
      // remapea eventID en events y event_users.eventID
      await remapEventId(oldId, newId);
    },
    endpoints: { base: 'events' },
  });
}

export async function pushSchedulesChanges() {
  return syncCollection({
    name: 'schedules',
    idKey: 'scheduleID',
    getUnsynced: getUnsyncedSchedules,
    sanitize: sanitizeSchedule,
    markSynced: markSchedulesSynced,
    remapId: async (oldId, newId) => {
      // remapea scheduleID si fuese referenciado (actualmente no en joins)
      await remapScheduleId(oldId, newId);
    },
    endpoints: { base: 'schedules' },
  });
}

export async function pushEventUsersChanges() {
  return syncCollection({
    name: 'event_users',
    idKey: undefined, // composite key; no hay un id simple
    getUnsynced: getUnsyncedEventUsers,
    sanitize: sanitizeEventUser,
    markSynced: markEventUsersSynced,
    remapId: async (_old, _new) => {
      // para event_users no hacemos POST con id nuevo, así que no remapeamos aquí.
    },
    endpoints: { base: 'event-users' }, // ajusta a tu ruta real
  });
}

// Nota: para event_users el comportamiento típico es:
// - CREATE (local): tiene eventID y userID (ambos reales ya), así que es PATCH/PUT/POST con ambos.
//   Si alguno era local y cambió, tus remap* arriba ya actualizaron event_users y no hay que remapear aquí.

// -------------------------
// Sync maestro (llámalo en tu servicio de sync)
// -------------------------
export async function pushAllChanges() {
  const db = getDatabase(); // por si quieres usar transaccionalidad alrededor
  console.log('📡 Connection stable, syncing...');

  const res = {};

  res.users = await pushUsersChanges();
  res.venues = await pushVenuesChanges();
  res.events = await pushEventsChanges();
  res.schedules = await pushSchedulesChanges();
  res.eventUsers = await pushEventUsersChanges();

  return res;
}
