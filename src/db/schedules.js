import { getDatabase } from "./config";

/**
 * SCHEDULES TABLE
 * - PK: scheduleID (TEXT)
 * - FK: venueID → venues(venueID)
 * - Freshness: updated_at (epoch ms)
 * - Soft-delete: deleted (0/1)
 * - Sync flag: isSynced (0/1)
 */
export const initSchedulesTable = async () => {
  const db = getDatabase();
  await db.execAsync(`CREATE TABLE IF NOT EXISTS schedules (
    scheduleID TEXT PRIMARY KEY NOT NULL,
    dayOfWeek TEXT,
    openTime TEXT,
    closeTime TEXT,
    venueID TEXT,
    updated_at INTEGER NOT NULL,
    deleted INTEGER NOT NULL DEFAULT 0,
    isSynced INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (venueID) REFERENCES venues(venueID) ON DELETE CASCADE
  );`);

  // Helpful indexes
  await db.runAsync(
    `CREATE INDEX IF NOT EXISTS idx_schedules_venue   ON schedules(venueID);`
  );
  await db.runAsync(
    `CREATE INDEX IF NOT EXISTS idx_schedules_updated ON schedules(updated_at);`
  );
};

/** Map schedule record from API → DB shape */
const mapScheduleFromAPI = (s) => {
  const updated_at = (() => {
    const t = new Date(s.lastModified ?? s.updated_at ?? Date.now()).getTime();
    return Number.isFinite(t) ? t : Date.now();
  })();

  return {
    scheduleID: s.scheduleID,
    dayOfWeek: s.dayOfWeek ?? "",
    openTime: s.openTime ?? "",
    closeTime: s.closeTime ?? "",
    venueID: s.venueID ?? null,
    updated_at,
    deleted: s.deleted ? 1 : 0,
  };
};

/** Local insert */
export const insertSchedule = async (schedule) => {
  const db = getDatabase();
  const now = Date.now();

  await db.runAsync(
    `INSERT INTO schedules (
      scheduleID, dayOfWeek, openTime, closeTime, venueID,
      updated_at, deleted, isSynced
    ) VALUES (?, ?, ?, ?, ?, ?, 0, 0)`,
    [
      schedule.scheduleID,
      schedule.dayOfWeek ?? "",
      schedule.openTime ?? "",
      schedule.closeTime ?? "",
      schedule.venueID ?? null,
      now,
    ]
  );
};

/** API → SQLite upsert */
export const upsertSchedulesFromAPI = async (rows = []) => {
  const db = getDatabase();
  try {
    await db.execAsync("BEGIN TRANSACTION");

    for (const raw of rows) {
      const s = mapScheduleFromAPI(raw);
      await db.runAsync(
        `INSERT INTO schedules (
          scheduleID, dayOfWeek, openTime, closeTime, venueID, updated_at, deleted, isSynced
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        ON CONFLICT(scheduleID) DO UPDATE SET
          dayOfWeek  = excluded.dayOfWeek,
          openTime   = excluded.openTime,
          closeTime  = excluded.closeTime,
          venueID    = excluded.venueID,
          updated_at = excluded.updated_at,
          deleted    = excluded.deleted,
          isSynced   = 1
        WHERE excluded.updated_at >= schedules.updated_at
        `,
        [
          s.scheduleID,
          s.dayOfWeek,
          s.openTime,
          s.closeTime,
          s.venueID,
          s.updated_at,
          s.deleted,
        ]
      );
    }

    await db.execAsync("COMMIT");
  } catch (e) {
    await db.execAsync("ROLLBACK");
    console.error("❌ upsertSchedulesFromAPI failed:", e);
    throw e;
  }
};

/** Soft delete */
export const softDeleteSchedule = async (scheduleID, when = Date.now()) => {
  const db = getDatabase();
  await db.runAsync(
    `UPDATE schedules SET deleted = 1, updated_at = ?, isSynced = 0 WHERE scheduleID = ?`,
    [when, scheduleID]
  );
};

/** Local partial update */
export const updateScheduleLocal = async (patch) => {
  const db = getDatabase();
  const now = Date.now();
  await db.runAsync(
    `UPDATE schedules SET
      dayOfWeek  = COALESCE(?, dayOfWeek),
      openTime   = COALESCE(?, openTime),
      closeTime  = COALESCE(?, closeTime),
      venueID    = COALESCE(?, venueID),
      updated_at = ?,
      isSynced   = 0
    WHERE scheduleID = ? AND deleted = 0`,
    [
      patch.dayOfWeek,
      patch.openTime,
      patch.closeTime,
      patch.venueID,
      now,
      patch.scheduleID,
    ]
  );
};

/** Reads */
export const getSchedulesByVenue = async (venueID) => {
  const db = getDatabase();
  return db.getAllAsync(
    `SELECT * FROM schedules WHERE venueID = ? AND deleted = 0 ORDER BY dayOfWeek ASC`,
    [venueID]
  );
};

export const selectAllSchedules = async () => {
  const db = getDatabase();
  return db.getAllAsync(
    `SELECT * FROM schedules WHERE deleted = 0 ORDER BY updated_at DESC`
  );
};

/** Sync helpers */
export const getUnsyncedSchedules = async () => {
  const db = getDatabase();
  return db.getAllAsync(
    `SELECT * FROM schedules WHERE isSynced = 0 AND deleted = 0`
  );
};

export const updateScheduleSynced = async (scheduleID) => {
  const db = getDatabase();
  await db.runAsync(`UPDATE schedules SET isSynced = 1 WHERE scheduleID = ?`, [
    scheduleID,
  ]);
};

export const markSchedulesSynced = async (ids = []) => {
  if (!ids.length) return;
  const db = getDatabase();
  try {
    await db.execAsync("BEGIN TRANSACTION");
    for (const id of ids) {
      await db.runAsync(
        `UPDATE schedules SET isSynced = 1 WHERE scheduleID = ?`,
        [id]
      );
    }
    await db.execAsync("COMMIT");
  } catch (e) {
    await db.execAsync("ROLLBACK");
    throw e;
  }
};
