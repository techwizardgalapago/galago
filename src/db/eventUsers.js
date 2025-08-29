import { getDatabase } from "./config";

/**
 * EVENTUSERS TABLE (join table)
 * - Composite PK: (eventID, userID)
 * - FKs: eventID → events(eventID), userID → users(userID)
 * - Freshness: updated_at (epoch ms)
 * - Soft-delete: deleted (0/1)
 * - Sync flag: isSynced (0/1)
 */
export const initEventUsersTable = async () => {
  const db = getDatabase();
  await db.execAsync(`CREATE TABLE IF NOT EXISTS eventUsers (
    eventID TEXT NOT NULL,
    userID TEXT NOT NULL,
    role TEXT,
    updated_at INTEGER NOT NULL,
    deleted INTEGER NOT NULL DEFAULT 0,
    isSynced INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (eventID, userID),
    FOREIGN KEY (eventID) REFERENCES events(eventID) ON DELETE CASCADE,
    FOREIGN KEY (userID) REFERENCES users(userID) ON DELETE CASCADE
  );`);

  // Helpful indexes
  await db.runAsync(`CREATE INDEX IF NOT EXISTS idx_eventUsers_event   ON eventUsers(eventID);`);
  await db.runAsync(`CREATE INDEX IF NOT EXISTS idx_eventUsers_user    ON eventUsers(userID);`);
  await db.runAsync(`CREATE INDEX IF NOT EXISTS idx_eventUsers_updated ON eventUsers(updated_at);`);
};

/** Map record from API → DB shape */
const mapEventUserFromAPI = (eu) => {
  const updated_at = (() => {
    const t = new Date(eu.lastModified ?? eu.updated_at ?? Date.now()).getTime();
    return Number.isFinite(t) ? t : Date.now();
  })();

  return {
    eventID: eu.eventID,
    userID: eu.userID,
    role: eu.role ?? null,
    updated_at,
    deleted: eu.deleted ? 1 : 0,
  };
};

/** Local insert */
export const insertEventUser = async (eventID, userID, role = null) => {
  const db = getDatabase();
  const now = Date.now();

  await db.runAsync(
    `INSERT INTO eventUsers (
      eventID, userID, role, updated_at, deleted, isSynced
    ) VALUES (?, ?, ?, ?, 0, 0)`,
    [eventID, userID, role, now]
  );
};

/** API → SQLite upsert */
export const upsertEventUsersFromAPI = async (rows = []) => {
  const db = getDatabase();
  try {
    await db.execAsync('BEGIN TRANSACTION');

    for (const raw of rows) {
      const eu = mapEventUserFromAPI(raw);
      await db.runAsync(
        `INSERT INTO eventUsers (
          eventID, userID, role, updated_at, deleted, isSynced
        ) VALUES (?, ?, ?, ?, ?, 1)
        ON CONFLICT(eventID, userID) DO UPDATE SET
          role       = excluded.role,
          updated_at = excluded.updated_at,
          deleted    = excluded.deleted,
          isSynced   = 1
        WHERE excluded.updated_at >= eventUsers.updated_at
        `,
        [eu.eventID, eu.userID, eu.role, eu.updated_at, eu.deleted]
      );
    }

    await db.execAsync('COMMIT');
  } catch (e) {
    await db.execAsync('ROLLBACK');
    console.error('❌ upsertEventUsersFromAPI failed:', e);
    throw e;
  }
};

/** Soft delete */
export const softDeleteEventUser = async (eventID, userID, when = Date.now()) => {
  const db = getDatabase();
  await db.runAsync(
    `UPDATE eventUsers SET deleted = 1, updated_at = ?, isSynced = 0 WHERE eventID = ? AND userID = ?`,
    [when, eventID, userID]
  );
};

/** Reads */
export const getUsersByEvent = async (eventID) => {
  const db = getDatabase();
  return db.getAllAsync(
    `SELECT u.* FROM users u
     JOIN eventUsers eu ON eu.userID = u.userID
     WHERE eu.eventID = ? AND eu.deleted = 0 AND u.deleted = 0`,
    [eventID]
  );
};

export const getEventsByUser = async (userID) => {
  const db = getDatabase();
  return db.getAllAsync(
    `SELECT e.* FROM events e
     JOIN eventUsers eu ON eu.eventID = e.eventID
     WHERE eu.userID = ? AND eu.deleted = 0 AND e.deleted = 0`,
    [userID]
  );
};

/** Sync helpers */
export const getUnsyncedEventUsers = async () => {
  const db = getDatabase();
  return db.getAllAsync(`SELECT * FROM eventUsers WHERE isSynced = 0 AND deleted = 0`);
};

export const updateEventUserSynced = async (eventID, userID) => {
  const db = getDatabase();
  await db.runAsync(`UPDATE eventUsers SET isSynced = 1 WHERE eventID = ? AND userID = ?`, [eventID, userID]);
};

export const markEventUsersSynced = async (pairs = []) => {
  if (!pairs.length) return;
  const db = getDatabase();
  try {
    await db.execAsync('BEGIN TRANSACTION');
    for (const { eventID, userID } of pairs) {
      await db.runAsync(`UPDATE eventUsers SET isSynced = 1 WHERE eventID = ? AND userID = ?`, [eventID, userID]);
    }
    await db.execAsync('COMMIT');
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }
};
