import { api } from './api';
import {
  sanitizeUser, sanitizeVenue, sanitizeEvent, sanitizeSchedule,
  partition,
} from './syncTransforms';

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
import { getUnsyncedEventUsers } from '../db/eventUsers';


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

// airtable.crud.createRecord devuelve un ARRAY de fields, no un objeto.
const extractCreatedId = (resp, idKey) => {
  const data = resp?.data;
  const rec = Array.isArray(data) ? data[0] : data;
  if (!rec) return null;
  return rec[idKey] || rec.id || rec.airtableId || null;
};

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
  updateMethod = 'put',
  // Envoltorios por defecto segun los schemas del backend:
  // POST /recurso        -> [{ fields }]
  // PUT  /recurso/:id    -> fields plano
  buildCreateRequest = (base, fields) => ({ url: base, body: [{ fields }] }),
  buildUpdateRequest = (base, id, fields) => ({
    url: `${base}/${encodeURIComponent(id)}`,
    body: fields,
  }),
}) {
  const rows = await getUnsynced();
  if (!rows.length) {
    return { created: 0, updated: 0, deleted: 0, failed: 0 };
  }

  const { toCreate, toUpdate, toDelete } = partition(rows, idKey);
  const ok = [];
  const failed = [];

  // CREATE: POST sin id
  for (const r of toCreate) {
    const body = sanitize(r);
    try {
      const req = buildCreateRequest(endpoints.base, body);
      const resp = await withRetry(() => api.post(req.url, req.body));
      const newId = extractCreatedId(resp, idKey);
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
      const req = buildUpdateRequest(endpoints.base, id, body);
      await withRetry(() => api[updateMethod](req.url, req.body));
      ok.push(id);
    } catch (e) {
      if (e.response?.status === 404) {
        // Curar desalineaciones: intenta crear
        try {
          const req = buildCreateRequest(endpoints.base, body);
          const resp = await withRetry(() => api.post(req.url, req.body));
          const newId = extractCreatedId(resp, idKey);
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
    const id = idKey ? r[idKey] : undefined;
    if (id === undefined || id === null || `${id}`.trim() === '') {
      // p.ej. event_users: clave compuesta, no hay ruta DELETE /:id que construir.
      console.warn(`⚠️ Delete ${name} omitido: la fila no tiene ${idKey || 'id'}`);
      failed.push(id);
      continue;
    }
    try {
      await withRetry(() => api.delete(`${endpoints.base}/${encodeURIComponent(id)}`));
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
    updateMethod: 'put',
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
    endpoints: { base: 'venues-schedule' },
    // PUT /venues-schedule (sin :id): el backend actualiza por lote y espera
    // [{ id, fields }]. Mandamos un lote de uno para conservar el conteo por fila.
    buildUpdateRequest: (base, id, fields) => ({ url: base, body: [{ id, fields }] }),
  });
}

export async function pushEventUsersChanges() {
  // El backend no expone /event-users todavia (no hay router ni schema).
  // Hasta que exista, no tiene sentido emitir peticiones que solo pueden
  // fallar: dejamos las filas pendientes con isSynced = 0.
  const rows = await getUnsyncedEventUsers();
  if (rows.length) {
    console.warn(
      `⚠️ ${rows.length} event_users pendientes: el backend no expone /event-users`
    );
  }
  return { created: 0, updated: 0, deleted: 0, failed: rows.length };
}

// Nota: para event_users el comportamiento típico es:
// - CREATE (local): tiene eventID y userID (ambos reales ya), así que es PATCH/PUT/POST con ambos.
//   Si alguno era local y cambió, tus remap* arriba ya actualizaron event_users y no hay que remapear aquí.

// -------------------------
// Sync maestro (llámalo en tu servicio de sync)
// -------------------------
export async function pushAllChanges() {
  const res = {};

  res.users = await pushUsersChanges();
  res.venues = await pushVenuesChanges();
  res.events = await pushEventsChanges();
  res.schedules = await pushSchedulesChanges();
  res.eventUsers = await pushEventUsersChanges();

  return res;
}
