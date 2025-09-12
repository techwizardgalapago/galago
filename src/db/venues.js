import { getDatabase } from "./config";

export const initVenuesTable = async () => {
  const db = getDatabase();
  await db.runAsync(`CREATE TABLE IF NOT EXISTS venues (
        venueID TEXT PRIMARY KEY NOT NULL,
        venueName TEXT,
        venueImage TEXT,
        venueDescription TEXT,
        venueCategory TEXT,
        venueLocation TEXT,
        venueAddress TEXT,
        venueContact TEXT,
        latitude REAL,
        longitud REAL,
        negocio INTEGER,
        userID TEXT,
        updated_at INTEGER NOT NULL,     
        deleted INTEGER NOT NULL DEFAULT 0,
        isSynced INTEGER DEFAULT 0,
        FOREIGN KEY (userID) REFERENCES users(userID) ON DELETE CASCADE
      );`);
};

export const insertVenue = async (venue) => {
  const db = getDatabase();

  const now = Date.now();
  await db.runAsync(
    `INSERT INTO venues (
      venueID, venueName, venueImage, venueDescription, venueCategory, venueLocation,
      venueAddress, venueContact, latitude, longitud, negocio, userID,
      updated_at, deleted, isSynced
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,

    [
      venue.venueID,
      venue.venueName ?? "",
      // store JSON as string if you really need to; otherwise keep as TEXT/URL
      Array.isArray(venue.venueImage)
        ? JSON.stringify(venue.venueImage)
        : venue.venueImage ?? "",
      venue.venueDescription,
      venue.venueCategory,
      venue.venueLocation,
      venue.venueAddress,
      venue.venueContact,
      venue.latitude,
      venue.longitud,
      venue.negocio ? 1 : 0,
      Array.isArray(venue.userID) ? venue.userID[0] : venue.userID ?? null,
      now,
    ]
  );
};

export const insertVenuesFromAPI = async (venues) => {
  const db = getDatabase();

  try {
    await db.execAsync("BEGIN TRANSACTION");

    for (const venue of venues) {
      await db.runAsync(
        `INSERT INTO venues (
          venueID, venueName, venueImage, venueDescription, venueCategory, venueLocation, 
          venueAddress, venueContact, latitude, 
          longitud, negocio, userID, isSynced
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          venue.venueID,
          JSON.stringify(venue.venueName ?? ""),
          JSON.stringify(venue.venueImage ?? []), // sanitize array if present
          venue.venueDescription ?? "",
          venue.venueCategory ?? "",
          venue.venueLocation ?? "",
          venue.venueAddress ?? "",
          venue.venueContact ?? "",
          venue.latitude ?? 0,
          venue.longitud ?? 0,
          venue.negocio ? 1 : 0,
          Array.isArray(venue.userID) ? venue.userID[0] : venue.userID, // foreign key must match
          1, // ✅ mark as synced
        ]
      );
    }

    await db.execAsync("COMMIT");
    console.log("✅ Venues inserted successfully");
  } catch (error) {
    await db.execAsync("ROLLBACK");
    console.error("❌ Failed to insert venues from API:", error);
    throw error;
  }
};
// Sanitize one venue coming from the API/Airtable
const mapVenueFromAPI = (venue) => {
  const updated_at = (() => {
    const t = new Date(
      venue.lastModified ?? venue.updated_at ?? Date.now()
    ).getTime();
    return Number.isFinite(t) ? t : Date.now();
  })();
  return {
    venueID: venue.venueID,
    venueName:
      typeof venue.venueName === "string"
        ? venue.venueName
        : Array.isArray(venue.venueName)
        ? venue.venueName.join(", ")
        : "",
    // if venueImage can be array, stringify consistently; otherwise keep URL string
    venueImage: Array.isArray(venue.venueImage)
      ? JSON.stringify(venue.venueImage)
      : venue.venueImage ?? "",
    venueDescription: venue.venueDescription ?? "",
    venueCategory: venue.venueCategory ?? "",
    venueLocation: venue.venueLocation ?? "",
    venueAddress: venue.venueAddress ?? "",
    venueContact: venue.venueContact ?? "",
    latitude: Number.isFinite(venue.latitude) ? venue.latitude : 0,
    longitud: Number.isFinite(venue.longitud) ? venue.longitud : 0,
    negocio: venue.negocio ? 1 : 0,
    userID: Array.isArray(venue.userID)
      ? venue.userID[0]
      : venue.userID ?? null,
    updated_at,
    deleted: venue.deleted ? 1 : 0,
  };
};

// Move all references from oldId -> newId in venues + events(eventVenueID)
export const remapVenueId = async (oldVenueID, newVenueID) => {
  if (!oldVenueID || !newVenueID || oldVenueID === newVenueID) return;
  const db = getDatabase();
  try {
    await db.execAsync('BEGIN');
    await db.runAsync('PRAGMA foreign_keys = OFF');

    // 1) Actualizar referencias en events.eventVenueID
    //    - Para evitar duplicados lógicos, si ya hay eventos con newVenueID, simplemente reasignamos.
    await db.runAsync(
      `UPDATE events SET eventVenueID = ?
       WHERE eventVenueID = ?`,
      [newVenueID, oldVenueID]
    );

    // 2) Clonar/crear el venue nuevo si no existe, copiando columnas conocidas
    await db.runAsync(
      `INSERT OR IGNORE INTO venues (
        venueID, venueName, venueImage, venueDescription, venueCategory, venueLocation,
        venueAddress, venueContact, latitude, longitud, negocio, userID, updated_at, deleted, isSynced
      )
      SELECT
        ?, venueName, venueImage, venueDescription, venueCategory, venueLocation,
        venueAddress, venueContact, latitude, longitud, negocio, userID, updated_at, deleted, 1
      FROM venues WHERE venueID = ?`,
      [newVenueID, oldVenueID]
    );

    // 3) Eliminar el viejo
    await db.runAsync(`DELETE FROM venues WHERE venueID = ?`, [oldVenueID]);

    await db.runAsync('PRAGMA foreign_keys = ON');
    await db.execAsync('COMMIT');
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }
};


export const upsertVenuesFromAPI = async (venues = []) => {
  const db = getDatabase();

  try {
    await db.execAsync("BEGIN TRANSACTION");

    for (const raw of venues) {
      const v = mapVenueFromAPI(raw);
      await db.runAsync(
        `
            INSERT INTO venues (
              venueID, venueName, venueImage, venueDescription, venueCategory, venueLocation,
              venueAddress, venueContact, latitude, longitud, negocio, userID,
              updated_at, deleted, isSynced
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            ON CONFLICT(venueID) DO UPDATE SET
              venueName       = excluded.venueName,
              venueImage      = excluded.venueImage,
              venueDescription= excluded.venueDescription,
              venueCategory   = excluded.venueCategory,
              venueLocation   = excluded.venueLocation,
              venueAddress    = excluded.venueAddress,
              venueContact    = excluded.venueContact,
              latitude        = excluded.latitude,
              longitud        = excluded.longitud,
              negocio         = excluded.negocio,
              userID          = excluded.userID,
              updated_at      = excluded.updated_at,
              deleted         = excluded.deleted,
              isSynced        = 1
            WHERE excluded.updated_at >= venues.updated_at
            `,
        [
          v.venueID,
          v.venueName,
          v.venueImage,
          v.venueDescription,
          v.venueCategory,
          v.venueLocation,
          v.venueAddress,
          v.venueContact,
          v.latitude,
          v.longitud,
          v.negocio,
          v.userID,
          v.updated_at,
          v.deleted,
        ]
      );
    }

    await db.execAsync("COMMIT");

    console.log("✅ Venues upserted successfully");
  } catch (error) {
    await db.execAsync("ROLLBACK");

    console.error("❌ Failed to upsert venues from API:", error);
    throw error;
  }
};

/** Soft-delete a venue */
export const softDeleteVenue = async (venueID, when = Date.now()) => {
  const db = getDatabase();
  await db.runAsync(
    `UPDATE venues SET deleted = 1, updated_at = ?, isSynced = 0 WHERE venueID = ?`,
    [when, venueID]
  );
};

/** Local partial update (bumps freshness, marks unsynced) */
export const updateVenueLocal = async (patch) => {
  const db = getDatabase();
  const now = Date.now();
  await db.runAsync(
    `UPDATE venues SET
  venueName = COALESCE(?, venueName),
  venueImage = COALESCE(?, venueImage),
  venueDescription = COALESCE(?, venueDescription),
  venueCategory = COALESCE(?, venueCategory),
  venueLocation = COALESCE(?, venueLocation),
  venueAddress = COALESCE(?, venueAddress),
  venueContact = COALESCE(?, venueContact),
  latitude = COALESCE(?, latitude),
  longitud = COALESCE(?, longitud),
  negocio = COALESCE(?, negocio),
  userID = COALESCE(?, userID),
  updated_at = ?,
  isSynced = 0
  WHERE venueID = ? AND deleted = 0`,
    [
      patch.venueName,
      Array.isArray(patch.venueImage)
        ? JSON.stringify(patch.venueImage)
        : patch.venueImage,
      patch.venueDescription,
      patch.venueCategory,
      patch.venueLocation,
      patch.venueAddress,
      patch.venueContact,
      patch.latitude,
      patch.longitud,
      patch.negocio != null ? (patch.negocio ? 1 : 0) : undefined,
      Array.isArray(patch.userID) ? patch.userID[0] : patch.userID,
      now,
      patch.venueID,
    ]
  );
};

/** Reads (respect soft-delete) */
export const getVenuesByUser = async (userID) => {
  const db = getDatabase();
  return db.getAllAsync(
    `SELECT * FROM venues WHERE userID = ? AND deleted = 0 ORDER BY venueName ASC`,
    [userID]
  );
};

export const selectAllVenues = async () => {
  const db = getDatabase();
  return db.getAllAsync(
    `SELECT * FROM venues WHERE deleted = 0 ORDER BY updated_at DESC`
  );
};

/** Sync helpers */
export const getUnsyncedVenues = async () => {
  const db = getDatabase();
  return db.getAllAsync(
    `SELECT * FROM venues WHERE isSynced = 0 AND deleted = 0`
  );
};

export const updateVenueSynced = async (venueID) => {
  const db = getDatabase();
  await db.runAsync(`UPDATE venues SET isSynced = 1 WHERE venueID = ?`, [
    venueID,
  ]);
};

export const markVenuesSynced = async (ids = []) => {
  if (!ids.length) return;
  const db = getDatabase();
  try {
    await db.execAsync("BEGIN TRANSACTION");
    for (const id of ids) {
      await db.runAsync(`UPDATE venues SET isSynced = 1 WHERE venueID = ?`, [
        id,
      ]);
    }
    await db.execAsync("COMMIT");
  } catch (e) {
    await db.execAsync("ROLLBACK");
    throw e;
  }
};
