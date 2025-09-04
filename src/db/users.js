import { getDatabase } from "./config";
import { sanitizeJsonField } from "./dbUtils";
import { initEventsTable } from "./events";
import { initEventUsersTable } from "./eventUsers";
import { initSchedulesTable } from "./schedules";
import { initVenuesTable } from "./venues";

export const initUsersTable = async () => {
  const db = getDatabase();
  await db.execAsync(`CREATE TABLE IF NOT EXISTS users (
        userID TEXT PRIMARY KEY NOT NULL,
        firstName TEXT,
        lastName TEXT,
        userEmail TEXT,
        countryOfOrigin TEXT,
        dateOfBirth TEXT,
        reasonForTravel TEXT,
        userRole TEXT,
        googleAccount INTEGER,
        updated_at INTEGER NOT NULL,
        deleted INTEGER NOT NULL DEFAULT 0,
        isSynced INTEGER DEFAULT 0
      );`);
};

/** Utility: map incoming API record to DB fields consistently */
const mapUserFromAPI = (user) => {
  const updated_at = (() => {
    const t = new Date(
      user.lastModified ?? user.updated_at ?? Date.now()
    ).getTime();
    return Number.isFinite(t) ? t : Date.now();
  })();

  const reasonForTravel = Array.isArray(user.reasonForTravel)
    ? user.reasonForTravel.join(", ")
    : user.reasonForTravel ?? "";

  return {
    userID: user.userID,
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    userEmail: user.userEmail ?? "",
    countryOfOrigin: user.countryOfOrigin ?? "",
    dateOfBirth: user.dateOfBirth ?? "",
    reasonForTravel,
    userRole: user.userRole ?? "",
    googleAccount: user.googleAccount ? 1 : 0,
    updated_at,
    deleted: user.deleted ? 1 : 0,
  };
};

/**
 * API → SQLite upsert with last-writer-wins by updated_at
 * - Marks isSynced=1 for rows applied from remote.
 * - Preserves newer local copies when remote is stale.
 */
export const upsertUsersFromAPI = async (users = []) => {
  const db = getDatabase();
  await db.runAsync(`DROP TABLE IF EXISTS users;`);
  await initUsersTable();

  await db.runAsync(`DROP TABLE IF EXISTS venues;`);
  await initVenuesTable();

  await db.runAsync(`DROP TABLE IF EXISTS events;`);
  await initEventsTable();

  await db.runAsync(`DROP TABLE IF EXISTS eventUsers;`);
  await initEventUsersTable();

  try {
    await db.execAsync("BEGIN TRANSACTION");

    for (const raw of users) {
      const user = mapUserFromAPI(raw); // or null-out if not needed locally

      await db.runAsync(
        `
        INSERT INTO users (
          userID, firstName, lastName, userEmail, countryOfOrigin, dateOfBirth,
          reasonForTravel, userRole, googleAccount, updated_at, deleted, isSynced
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        ON CONFLICT(userID) DO UPDATE SET
          firstName = excluded.firstName,
          lastName = excluded.lastName,
          userEmail = excluded.userEmail,
          countryOfOrigin = excluded.countryOfOrigin,
          dateOfBirth = excluded.dateOfBirth,
          reasonForTravel = excluded.reasonForTravel,
          userRole = excluded.userRole,
          googleAccount = excluded.googleAccount,
          updated_at = excluded.updated_at,
          deleted = excluded.deleted,
          isSynced = 1
        WHERE excluded.updated_at >= users.updated_at
        `,
        [
          user.userID,
          user.firstName,
          user.lastName,
          user.userEmail,
          user.countryOfOrigin,
          user.dateOfBirth,
          user.reasonForTravel,
          user.userRole,
          user.googleAccount,
          user.updated_at,
          user.deleted,
        ]
      );
    }

    await db.execAsync("COMMIT");
  } catch (e) {
    await db.execAsync("ROLLBACK");
    console.error("❌ upsertUsersFromAPI failed:", e);
    throw e;
  }
};

export const insertUsersFromAPI = async (users) => {
  const db = getDatabase();

  await db.runAsync(`DROP TABLE IF EXISTS users;`);
  await initUsersTable();

  await db.runAsync(`DROP TABLE IF EXISTS venues;`);
  await initVenuesTable();

  await db.runAsync(`DROP TABLE IF EXISTS schedules;`);
  await initSchedulesTable();

  await db.runAsync(`DROP TABLE IF EXISTS events;`);
  await initEventsTable();

  await db.runAsync(`DROP TABLE IF EXISTS eventUsers;`);
  await initEventUsersTable();

  try {
    await db.execAsync("BEGIN TRANSACTION");

    for (const user of users) {
      const sanitizedUser = {
        ...user,
        reasonForTravel: Array.isArray(user.reasonForTravel)
          ? user.reasonForTravel.join(", ")
          : user.reasonForTravel ?? "",
        googleAccount: user.googleAccount ? 1 : 0,
        updated_at: new Date(user.lastModified).getTime(),
        deleted: 0,
      };

      delete sanitizedUser.recoveryToken;

      await db.runAsync(
        `INSERT INTO users (
          userID, firstName, lastName, userEmail, countryOfOrigin, dateOfBirth,
          reasonForTravel, userRole, googleAccount, updated_at, deleted, isSynced
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sanitizedUser.userID,
          sanitizedUser.firstName,
          sanitizedUser.lastName,
          sanitizedUser.userEmail,
          sanitizedUser.countryOfOrigin,
          sanitizedUser.dateOfBirth,
          sanitizedUser.reasonForTravel,
          sanitizedUser.userRole,
          sanitizedUser.googleAccount,
          sanitizedUser.updated_at,
          sanitizedUser.deleted,
          1, // ✅ mark as synced
        ]
      );
    }

    await db.execAsync("COMMIT");
  } catch (error) {
    await db.execAsync("ROLLBACK");
    console.error("❌ Failed to insert users from API:", error);
    throw error;
  }
};

/** Soft delete a user (mark deleted=1 and bump freshness) */
export const softDeleteUser = async (userID, when = Date.now()) => {
  const db = getDatabase();
  await db.runAsync(
    `UPDATE users SET deleted = 1, updated_at = ?, isSynced = 0 WHERE userID = ?`,
    [when, userID]
  );
};

/** Update an existing user locally (guard optional; always bumps updated_at) */
export const updateUserLocal = async (patch) => {
  const db = getDatabase();
  const reasonForTravel = Array.isArray(patch.reasonForTravel)
    ? patch.reasonForTravel.join(", ")
    : patch.reasonForTravel ?? undefined;

  const now = Date.now();

  await db.runAsync(
    `UPDATE users SET
      firstName = COALESCE(?, firstName),
      lastName = COALESCE(?, lastName),
      userEmail = COALESCE(?, userEmail),
      countryOfOrigin = COALESCE(?, countryOfOrigin),
      dateOfBirth = COALESCE(?, dateOfBirth),
      reasonForTravel = COALESCE(?, reasonForTravel),
      userRole = COALESCE(?, userRole),
      googleAccount = COALESCE(?, googleAccount),
      updated_at = ?,
      isSynced = 0
    WHERE userID = ? AND deleted = 0`,
    [
      patch.firstName,
      patch.lastName,
      patch.userEmail,
      patch.countryOfOrigin,
      patch.dateOfBirth,
      reasonForTravel,
      patch.userRole,
      patch.googleAccount != null ? (patch.googleAccount ? 1 : 0) : undefined,
      now,
      patch.userID,
    ]
  );
};

/**
 * Local create (from UI). New rows are unsynced and not deleted.
 */
export const insertUser = async (user) => {
  const db = getDatabase();

  const reasonForTravel = Array.isArray(user.reasonForTravel)
    ? user.reasonForTravel.join(", ")
    : user.reasonForTravel ?? "";

  const now = Date.now();

  await db.runAsync(
    `INSERT INTO users (
  userID, firstName, lastName, userEmail, countryOfOrigin, dateOfBirth,
  reasonForTravel, userRole, googleAccount, updated_at, deleted, isSynced
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
    [
      user.userID,
      user.firstName ?? "",
      user.lastName ?? "",
      user.userEmail ?? "",
      user.countryOfOrigin ?? "",
      user.dateOfBirth ?? "",
      reasonForTravel,
      user.userRole ?? "",
      user.googleAccount ? 1 : 0,
      now,
    ]
  );
};

/** Reads (respect soft-delete) */
export const selectAllUsers = async () => {
  const db = getDatabase();
  return db.getAllAsync(
    `SELECT * FROM users WHERE deleted = 0 ORDER BY firstName, lastName`
  );
};

export const selectUserById = async (userID) => {
  const db = getDatabase();
  const rows = await db.getAllAsync(
    `SELECT * FROM users WHERE userID = ? AND deleted = 0`,
    [userID]
  );
  return rows?.[0] ?? null;
};

/** Sync helpers */
export const getUnsyncedUsers = async () => {
  const db = getDatabase();
  return db.getAllAsync(
    `SELECT * FROM users WHERE isSynced = 0 AND deleted = 0`
  );
};

export const updateUserSynced = async (userID) => {
  const db = getDatabase();
  await db.runAsync(`UPDATE users SET isSynced = 1 WHERE userID = ?`, [userID]);
};

/** Optional: bulk mark synced by IDs */
export const markUsersSynced = async (ids = []) => {
  if (!ids.length) return;
  const db = getDatabase();
  try {
    await db.execAsync("BEGIN TRANSACTION");
    for (const id of ids) {
      await db.runAsync(`UPDATE users SET isSynced = 1 WHERE userID = ?`, [id]);
    }
    await db.execAsync("COMMIT");
  } catch (e) {
    await db.execAsync("ROLLBACK");
    throw e;
  }
};
