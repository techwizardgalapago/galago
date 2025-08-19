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
        password TEXT,
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

export const upsertUsersFromAPI = async (users = []) => {
  const db = getDatabase();
  await db.runAsync(`DROP TABLE IF EXISTS users;`);
  await initUsersTable();

  await db.runAsync(`DROP TABLE IF EXISTS venues;`);
  await initVenuesTable();

  await db.runAsync(`DROP TABLE IF EXISTS events;`);
  await initEventsTable();

  await db.runAsync(`DROP TABLE IF EXISTS event_users;`);
  await initEventUsersTable();

  try {
    await db.execAsync("BEGIN TRANSACTION");

    for (const user of users) {
      // sanitize & map
      const updated_at = Number.isFinite(new Date(user.lastModified).getTime())
        ? new Date(user.lastModified).getTime()
        : Date.now();
      const reasonForTravel = Array.isArray(user.reasonForTravel)
        ? user.reasonForTravel.join(", ")
        : user.reasonForTravel ?? "";
      const googleAccount = user.googleAccount ? 1 : 0;
      const deleted = user.deleted ? 1 : 0; // if your API ever flags deletes

      // never store secrets
      const password = user.password ?? null;
      const safePassword = password; // or null-out if not needed locally

      await db.runAsync(
        `
        INSERT INTO users (
          userID, firstName, lastName, userEmail, password, countryOfOrigin, dateOfBirth,
          reasonForTravel, userRole, googleAccount, updated_at, deleted, isSynced
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        ON CONFLICT(userID) DO UPDATE SET
          firstName      = excluded.firstName,
          lastName       = excluded.lastName,
          userEmail      = excluded.userEmail,
          password       = excluded.password,
          countryOfOrigin= excluded.countryOfOrigin,
          dateOfBirth    = excluded.dateOfBirth,
          reasonForTravel= excluded.reasonForTravel,
          userRole       = excluded.userRole,
          googleAccount  = excluded.googleAccount,
          updated_at     = excluded.updated_at,
          deleted        = excluded.deleted,
          isSynced       = 1
        WHERE excluded.updated_at >= users.updated_at
        `,
        [
          user.userID,
          user.firstName ?? "",
          user.lastName ?? "",
          user.userEmail ?? "",
          safePassword,
          user.countryOfOrigin ?? "",
          user.dateOfBirth ?? "",
          reasonForTravel,
          user.userRole ?? "",
          googleAccount,
          updated_at,
          deleted,
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

  await db.runAsync(`DROP TABLE IF EXISTS event_users;`);
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
          userID, firstName, lastName, userEmail, password, countryOfOrigin, dateOfBirth,
          reasonForTravel, userRole, googleAccount, updated_at, deleted, isSynced
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sanitizedUser.userID,
          sanitizedUser.firstName,
          sanitizedUser.lastName,
          sanitizedUser.userEmail,
          sanitizedUser.password,
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

export const insertUser = async (user) => {
  const db = getDatabase();

  await db.runAsync(`DROP TABLE IF EXISTS users;`);
  await initUsersTable();

  await db.runAsync(`DROP TABLE IF EXISTS venues;`);
  await initVenuesTable();

  await db.runAsync(`DROP TABLE IF EXISTS events;`);
  await initEventsTable();

  await db.runAsync(`DROP TABLE IF EXISTS event_users;`);
  await initEventUsersTable();

  const result = await db.getAllAsync("PRAGMA table_info(users);");
  console.log(result);

  const sanitizedUser = {
    ...user,
    reasonForTravel: Array.isArray(user.reasonForTravel)
      ? user.reasonForTravel.join(", ")
      : user.reasonForTravel ?? "",
    googleAccount: user.googleAccount ? 1 : 0,
  };

  delete sanitizedUser.recoveryToken; // remove recoveryToken if it exists

  console.log("Inserting user:", sanitizedUser);

  await db.runAsync(
    `INSERT INTO users (
      userID, firstName, lastName, userEmail, password, countryOfOrigin, dateOfBirth,
      reasonForTravel, userRole, googleAccount, isSynced
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sanitizedUser.userID,
      sanitizedUser.firstName,
      sanitizedUser.lastName,
      sanitizedUser.userEmail,
      sanitizedUser.password,
      sanitizedUser.countryOfOrigin,
      sanitizedUser.dateOfBirth,
      sanitizedUser.reasonForTravel,
      sanitizedUser.userRole,
      sanitizedUser.googleAccount,
      0, // isSynced default to 0s
    ]
  );
};

// When selecting users, parse the JSON fields so they become arrays again:
export const selectAllUsers = async () => {
  const db = getDatabase();
  const rows = await db.getAllAsync("SELECT * FROM users");

  return rows.map((user) => ({
    ...user,
    reasonForTravel: user.reasonForTravel ? [user.reasonForTravel] : [],
  }));
};

export const getUnsyncedUsers = async () => {
  const db = getDatabase();
  const rows = await db.getAllAsync("SELECT * FROM users WHERE isSynced = 0");
  //return for airtable
  return rows.map((user) => ({
    fields: {
      ...user,
      reasonForTravel: user.reasonForTravel ? [user.reasonForTravel] : [],
    },
  }));
};

export const updateUserSynced = async (userID) => {
  const db = getDatabase();
  await db.runAsync("UPDATE users SET isSynced = 1 WHERE userID = ?", [userID]);
};
