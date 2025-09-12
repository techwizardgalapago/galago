import { getDatabase } from "./config";

const coerceId = (v) => (typeof v === "string" ? v.trim() : v);
const firstOrNull = (v) =>
  Array.isArray(v) ? (v.length ? v[0] : null) : v ?? null;
const textOrJoined = (v) => (Array.isArray(v) ? v.join(", ") : v ?? "");
const toEpochMs = (iso) => {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : Date.now();
};
// Choose how you want to store eventImage: first URL or JSON string of array
const imageToText = (arr) => {
  if (!Array.isArray(arr) || !arr.length) return "";
  // Good option A: store first URL only
  const firstUrl = arr[0]?.url ?? "";
  return String(firstUrl);
  // Option B: store entire array as JSON
  // return JSON.stringify(arr);
};

export const initEventsTable = async () => {
  const db = getDatabase();
  await db.runAsync(`CREATE TABLE IF NOT EXISTS events (
        eventID TEXT PRIMARY KEY NOT NULL,
        eventName TEXT,
        eventImage TEXT,
        eventDescription TEXT,
        eventTags TEXT,
        telOrganizador TEXT,
        startTime TEXT,
        endTime TEXT,
        eventVenueID TEXT,
        eventVenueName TEXT,
        eventIslandLocation TEXT,
        direccionVenues TEXT,
        organizador TEXT,
        eventCapacity INTEGER,
        eventPrice REAL,
        updated_at INTEGER NOT NULL,
        deleted INTEGER NOT NULL DEFAULT 0,
        isSynced INTEGER DEFAULT 0,
        FOREIGN KEY (eventVenueID) REFERENCES venues(venueID) ON DELETE CASCADE
      );`);
};

/** Map an event from API → DB shape (handles Airtable lastModified) */
// const mapEventFromAPI = (evento) => {
//   const event = evento.eventos[0];
//   console.log(event.eventID);
//   console.log(event);
//   const updated_at = (() => {
//     const t = new Date(
//       event.lastModified ?? event.updated_at ?? Date.now()
//     ).getTime();
//     return Number.isFinite(t) ? t : Date.now();
//   })();

//   return {
//     eventID: event.eventID,
//     eventName: event.eventName ?? "",
//     eventImage: Array.isArray(event.eventImage)
//       ? JSON.stringify(event.eventImage)
//       : event.eventImage ?? "",
//     eventDescription: event.eventDescription ?? "",
//     eventTags: Array.isArray(event.eventTags)
//       ? event.eventTags.join(", ")
//       : event.eventTags ?? "",
//     telOrganizador: event.telOrganizador ?? "",
//     startTime: event.startTime ?? "",
//     endTime: event.endTime ?? "",
//     eventVenueID: event.eventVenueID ?? null,
//     eventVenueName: event.eventVenueName ?? "",
//     eventIslandLocation: event.eventIslandLocation ?? "",
//     direccionVenues: event.direccionVenues ?? "",
//     organizador: event.organizador ?? "",
//     eventCapacity: Number.isFinite(event.eventCapacity)
//       ? event.eventCapacity
//       : null,
//     eventPrice: Number.isFinite(event.eventPrice) ? event.eventPrice : null,
//     updated_at,
//     deleted: event.deleted ? 1 : 0,
//   };
// };

// maps one raw event object to your events table shape
const mapEventFromAPI = (ev) => {
  const eventID = coerceId(ev.eventID || ev.id || ev.fields?.eventID);
  if (!eventID) return { __invalid: true, reason: "missing eventID", raw: ev };

  const updated_at = toEpochMs(
    ev["Last Modified"] ?? ev.lastModified ?? ev.updated_at
  );

  return {
    eventID,
    eventName: ev.eventName ?? "",
    eventImage: imageToText(ev.eventImage),
    eventDescription: ev.eventDescription ?? "",
    eventTags: textOrJoined(ev.eventTags),
    telOrganizador: ev.telOrganizador ?? "",
    startTime: ev.startTime ?? "",
    endTime: ev.endTime ?? "",
    eventVenueID: firstOrNull(ev.eventVenueID), // IDs come as array → first
    eventVenueName: firstOrNull(ev.eventVenueName), // arrays → first
    eventIslandLocation: firstOrNull(ev.eventIslandLocation),
    direccionVenues: firstOrNull(ev.direccionVenues),
    organizador: ev.organizador ?? "",
    eventCapacity: Number.isFinite(ev.eventCapacity) ? ev.eventCapacity : null,
    eventPrice: Number.isFinite(ev.eventPrice) ? ev.eventPrice : null,
    updated_at,
    deleted: ev.deleted ? 1 : 0,
    // optionally pass through eventUsers [] (user IDs) to seed the join table
    _eventUsers: Array.isArray(ev.eventUsers) ? ev.eventUsers : [],
  };
};

// Move all references from oldId -> newId in events + event_users
export const remapEventId = async (oldEventID, newEventID) => {
  if (!oldEventID || !newEventID || oldEventID === newEventID) return;
  const db = getDatabase();
  try {
    await db.execAsync('BEGIN');
    await db.runAsync('PRAGMA foreign_keys = OFF');

    // 1) Mover join rows (event_users) evitando duplicados
    await db.runAsync(
      `INSERT OR IGNORE INTO eventUsers (eventID, userID, role, updated_at, deleted, isSynced)
       SELECT ?, userID, role, updated_at, deleted, isSynced
       FROM event_users
       WHERE eventID = ?`,
      [newEventID, oldEventID]
    );
    await db.runAsync(`DELETE FROM eventUsers WHERE eventID = ?`, [oldEventID]);

    // 2) Clonar/crear el evento nuevo si no existe, copiando columnas conocidas
    await db.runAsync(
      `INSERT OR IGNORE INTO events (
        eventID, eventName, eventImage, eventDescription, eventTags, telOrganizador,
        startTime, endTime, eventVenueID, eventVenueName, eventIslandLocation, direccionVenues,
        organizador, eventCapacity, eventPrice, updated_at, deleted, isSynced
      )
      SELECT
        ?, eventName, eventImage, eventDescription, eventTags, telOrganizador,
        startTime, endTime, eventVenueID, eventVenueName, eventIslandLocation, direccionVenues,
        organizador, eventCapacity, eventPrice, updated_at, deleted, 1
      FROM events WHERE eventID = ?`,
      [newEventID, oldEventID]
    );

    // 3) Eliminar el viejo
    await db.runAsync(`DELETE FROM events WHERE eventID = ?`, [oldEventID]);

    await db.runAsync('PRAGMA foreign_keys = ON');
    await db.execAsync('COMMIT');
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }
};


/** Local create (from UI). Marks unsynced and sets freshness. */
export const insertEvent = async (event) => {
  const db = getDatabase();
  const now = Date.now();

  await db.runAsync(
    `INSERT INTO events (
  eventID, eventName, eventImage, eventDescription, eventTags, telOrganizador,
  startTime, endTime, eventVenueID, eventVenueName, eventIslandLocation, direccionVenues,
  organizador, eventCapacity, eventPrice, updated_at, deleted, isSynced
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
    [
      event.eventID,
      event.eventName ?? "",
      Array.isArray(event.eventImage)
        ? JSON.stringify(event.eventImage)
        : event.eventImage ?? "",
      event.eventDescription ?? "",
      Array.isArray(event.eventTags)
        ? event.eventTags.join(", ")
        : event.eventTags ?? "",
      event.telOrganizador ?? "",
      event.startTime ?? "",
      event.endTime ?? "",
      event.eventVenueID ?? null,
      event.eventVenueName ?? "",
      event.eventIslandLocation ?? "",
      event.direccionVenues ?? "",
      event.organizador ?? "",
      Number.isFinite(event.eventCapacity) ? event.eventCapacity : null,
      Number.isFinite(event.eventPrice) ? event.eventPrice : null,
      now,
    ]
  );
};

/** API → SQLite upsert (last-writer-wins by updated_at) */
// export const upsertEventsFromAPI = async (events = []) => {
//   console.log("upsert eventos", events);
//   const db = getDatabase();
//   try {
//     await db.execAsync("BEGIN TRANSACTION");

//     for (const raw of events) {
//       const e = mapEventFromAPI(raw);
//       await db.runAsync(
//         `
//         INSERT INTO events (
//           eventID, eventName, eventImage, eventDescription, eventTags, telOrganizador,
//           startTime, endTime, eventVenueID, eventVenueName, eventIslandLocation, direccionVenues,
//           organizador, eventCapacity, eventPrice, updated_at, deleted, isSynced
//         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
//         ON CONFLICT(eventID) DO UPDATE SET
//           eventName = excluded.eventName,
//           eventImage = excluded.eventImage,
//           eventDescription = excluded.eventDescription,
//           eventTags = excluded.eventTags,
//           telOrganizador = excluded.telOrganizador,
//           startTime = excluded.startTime,
//           endTime = excluded.endTime,
//           eventVenueID = excluded.eventVenueID,
//           eventVenueName = excluded.eventVenueName,
//           eventIslandLocation= excluded.eventIslandLocation,
//           direccionVenues = excluded.direccionVenues,
//           organizador = excluded.organizador,
//           eventCapacity = excluded.eventCapacity,
//           eventPrice = excluded.eventPrice,
//           updated_at = excluded.updated_at,
//           deleted = excluded.deleted,
//           isSynced = 1
//         WHERE excluded.updated_at >= events.updated_at
//         `,
//         [
//           e.eventID,
//           e.eventName,
//           e.eventImage,
//           e.eventDescription,
//           e.eventTags,
//           e.telOrganizador,
//           e.startTime,
//           e.endTime,
//           e.eventVenueID,
//           e.eventVenueName,
//           e.eventIslandLocation,
//           e.direccionVenues,
//           e.organizador,
//           e.eventCapacity,
//           e.eventPrice,
//           e.updated_at,
//           e.deleted,
//         ]
//       );
//     }

//     await db.execAsync("COMMIT");
//   } catch (e) {
//     await db.execAsync("ROLLBACK");
//     console.error("❌ upsertEventsFromAPI failed:", e);
//     throw e;
//   }
// };

// groups = the top-level array you posted (with fecha + eventos)
export const upsertEventsFromAirtableGroups = async (groups = []) => {
  const db = getDatabase();
  try {
    await db.execAsync("BEGIN");

    for (const group of groups) {
      const list = Array.isArray(group?.eventos) ? group.eventos : [];
      for (const raw of list) {
        const e = mapEventFromAPI(raw);
        if (e.__invalid) {
          console.warn(
            "⚠️ Skip event without eventID",
            e.reason,
            raw?.id ?? raw?.eventID ?? "(no id)"
          );
          continue;
        }

        // Per-row savepoint so one bad row doesn’t kill the batch
        await db.runAsync("SAVEPOINT sp_event");
        try {
          await db.runAsync(
            `
            INSERT INTO events (
              eventID, eventName, eventImage, eventDescription, eventTags, telOrganizador,
              startTime, endTime, eventVenueID, eventVenueName, eventIslandLocation, direccionVenues,
              organizador, eventCapacity, eventPrice, updated_at, deleted, isSynced
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            ON CONFLICT(eventID) DO UPDATE SET
              eventName           = excluded.eventName,
              eventImage          = excluded.eventImage,
              eventDescription    = excluded.eventDescription,
              eventTags           = excluded.eventTags,
              telOrganizador      = excluded.telOrganizador,
              startTime           = excluded.startTime,
              endTime             = excluded.endTime,
              eventVenueID        = excluded.eventVenueID,
              eventVenueName      = excluded.eventVenueName,
              eventIslandLocation = excluded.eventIslandLocation,
              direccionVenues     = excluded.direccionVenues,
              organizador         = excluded.organizador,
              eventCapacity       = excluded.eventCapacity,
              eventPrice          = excluded.eventPrice,
              updated_at          = excluded.updated_at,
              deleted             = excluded.deleted,
              isSynced            = 1
            WHERE excluded.updated_at >= events.updated_at
            `,
            [
              e.eventID,
              e.eventName,
              e.eventImage,
              e.eventDescription,
              e.eventTags,
              e.telOrganizador,
              e.startTime,
              e.endTime,
              e.eventVenueID,
              e.eventVenueName,
              e.eventIslandLocation,
              e.direccionVenues,
              e.organizador,
              e.eventCapacity,
              e.eventPrice,
              e.updated_at,
              e.deleted,
            ]
          );

          // OPTIONAL: seed eventUsers join rows if provided
          if (e._eventUsers?.length) {
            for (const uid of e._eventUsers) {
              const userID = coerceId(uid);
              if (!userID) continue;
              await db.runAsync(
                `
                INSERT INTO eventUsers (eventID, userID, updated_at, deleted, isSynced)
                VALUES (?, ?, ?, 0, 1)
                ON CONFLICT(eventID, userID) DO UPDATE SET
                  updated_at = excluded.updated_at,
                  deleted    = 0,
                  isSynced   = 1
                WHERE excluded.updated_at >= eventUsers.updated_at
                `,
                [e.eventID, userID, e.updated_at]
              );
            }
          }

          await db.runAsync("RELEASE sp_event");
        } catch (rowErr) {
          console.warn("⚠️ Skipping bad event row:", rowErr?.message);
          await db.runAsync("ROLLBACK TO sp_event");
          await db.runAsync("RELEASE sp_event");
        }
      }
    }

    await db.execAsync("COMMIT");
  } catch (err) {
    await db.execAsync("ROLLBACK");
    console.error("❌ upsertEventsFromAirtableGroups failed:", err);
    throw err;
  }
};

export const insertEventsFromAPI = async (events) => {
  const db = getDatabase();

  try {
    await db.execAsync("BEGIN TRANSACTION");

    for (const event of events) {
      for (const rawEvent of event.eventos) {
        await db.runAsync(
          `INSERT INTO events (
            eventID, eventName, eventImage, eventDescription, eventTags, telOrganizador,
          startTime, endTime, eventVenueID, eventVenueName, eventIslandLocation,
          direccionVenues, organizador, eventCapacity, eventPrice, isSynced
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            rawEvent.eventID, // Add this line assuming your events from API have a unique ID
            rawEvent.eventName ?? "",
            JSON.stringify(rawEvent.eventImage ?? []),
            rawEvent.eventDescription ?? "",
            Array.isArray(rawEvent.eventTags)
              ? rawEvent.eventTags.join(", ")
              : rawEvent.eventTags ?? "",
            rawEvent.telOrganizador ?? "",
            rawEvent.startTime ?? "",
            rawEvent.endTime ?? "",
            Array.isArray(rawEvent.eventVenueID)
              ? rawEvent.eventVenueID[0]
              : rawEvent.eventVenueID ?? "",
            Array.isArray(rawEvent.eventVenueName)
              ? rawEvent.eventVenueName.join(", ")
              : rawEvent.eventVenueName ?? "",
            Array.isArray(rawEvent.eventIslandLocation)
              ? rawEvent.eventIslandLocation.join(", ")
              : rawEvent.eventIslandLocation ?? "",
            Array.isArray(rawEvent.direccionVenues)
              ? rawEvent.direccionVenues.join(", ")
              : rawEvent.direccionVenues ?? "",
            rawEvent.organizador ?? "",
            rawEvent.eventCapacity ?? 0,
            rawEvent.eventPrice ?? 0,
            1, // ✅ mark as synced
          ]
        );

        // 👇 Bulk insert into eventUsers if applicable
        if (!rawEvent.eventUsers || rawEvent.eventUsers.length === 0) {
          console.log("No event users found for event:", rawEvent.eventID);
          continue; // Skip if no users
        } else {
          if (Array.isArray(rawEvent.eventUsers)) {
            console.log("Inserting event users for event:", rawEvent.eventID);
            for (const userID of rawEvent.eventUsers) {
              console.log("is there event user?", userID);
              await db.runAsync(
                `INSERT OR IGNORE INTO eventUsers (eventID, userID, isSynced) VALUES (?, ?, ?)`,
                [rawEvent.eventID, userID, 1]
              );
            }
          }
        }
      }
    }

    await db.execAsync("COMMIT");
    console.log("✅ Events inserted successfully");
  } catch (error) {
    await db.execAsync("ROLLBACK");
    console.error("❌ Failed to insert events from API:", error);
    throw error;
  }
};

/** Soft delete */
export const softDeleteEvent = async (eventID, when = Date.now()) => {
  const db = getDatabase();
  await db.runAsync(
    `UPDATE events SET deleted = 1, updated_at = ?, isSynced = 0 WHERE eventID = ?`,
    [when, eventID]
  );
};

/** Local partial update */
export const updateEventLocal = async (patch) => {
  const db = getDatabase();
  const now = Date.now();
  await db.runAsync(
    `UPDATE events SET
      eventName = COALESCE(?, eventName),
      eventImage = COALESCE(?, eventImage),
      eventDescription = COALESCE(?, eventDescription),
      eventTags = COALESCE(?, eventTags),
      telOrganizador = COALESCE(?, telOrganizador),
      startTime = COALESCE(?, startTime),
      endTime = COALESCE(?, endTime),
      eventVenueID = COALESCE(?, eventVenueID),
      eventVenueName = COALESCE(?, eventVenueName),
      eventIslandLocation = COALESCE(?, eventIslandLocation),
      direccionVenues = COALESCE(?, direccionVenues),
      organizador = COALESCE(?, organizador),
      eventCapacity = COALESCE(?, eventCapacity),
      eventPrice = COALESCE(?, eventPrice),
      updated_at = ?,
      isSynced = 0
    WHERE eventID = ? AND deleted = 0`,
    [
      patch.eventName,
      Array.isArray(patch.eventImage)
        ? JSON.stringify(patch.eventImage)
        : patch.eventImage,
      patch.eventDescription,
      Array.isArray(patch.eventTags)
        ? patch.eventTags.join(", ")
        : patch.eventTags,
      patch.telOrganizador,
      patch.startTime,
      patch.endTime,
      patch.eventVenueID,
      patch.eventVenueName,
      patch.eventIslandLocation,
      patch.direccionVenues,
      patch.organizador,
      patch.eventCapacity,
      patch.eventPrice,
      now,
      patch.eventID,
    ]
  );
};

/** Reads */
export const getEventsByVenue = async (eventVenueID) => {
  const db = getDatabase();
  return db.getAllAsync(
    `SELECT * FROM events
    WHERE eventVenueID = ? AND deleted = 0
    ORDER BY startTime ASC, endTime ASC`,
    [eventVenueID]
  );
};

export const getEventsByUser = async (userID) => {
  const db = getDatabase();
  // Join through eventUsers (composite relation). Adjust table/column names if your join table differs.
  return db.getAllAsync(
    `SELECT e.* FROM events e
    JOIN eventUsers eu ON eu.eventID = e.eventID
    WHERE eu.userID = ? AND e.deleted = 0 AND (eu.deleted IS NULL OR eu.deleted = 0)
    ORDER BY e.startTime ASC, e.endTime ASC`,
    [userID]
  );
};

/** Reads */
export const selectAllEvents = async () => {
  const db = getDatabase();
  return db.getAllAsync(
    `SELECT * FROM events WHERE deleted = 0 ORDER BY startTime DESC, endTime DESC`
  );
};

export const selectEventById = async (eventID) => {
  const db = getDatabase();
  const rows = await db.getAllAsync(
    `SELECT * FROM events WHERE eventID = ? AND deleted = 0`,
    [eventID]
  );
  return rows?.[0] ?? null;
};

/** Sync helpers */
export const getUnsyncedEvents = async () => {
  const db = getDatabase();
  return db.getAllAsync(
    `SELECT * FROM events WHERE isSynced = 0 AND deleted = 0`
  );
};

export const updateEventSynced = async (eventID) => {
  const db = getDatabase();
  await db.runAsync(`UPDATE events SET isSynced = 1 WHERE eventID = ?`, [
    eventID,
  ]);
};

export const markEventsSynced = async (ids = []) => {
  if (!ids.length) return;
  const db = getDatabase();
  try {
    await db.execAsync("BEGIN TRANSACTION");
    for (const id of ids) {
      await db.runAsync(`UPDATE events SET isSynced = 1 WHERE eventID = ?`, [
        id,
      ]);
    }
    await db.execAsync("COMMIT");
  } catch (e) {
    await db.execAsync("ROLLBACK");
    throw e;
  }
};
