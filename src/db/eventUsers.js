import { getDatabase } from "./config";

export const initEventUsersTable = async () => {
  const db = getDatabase();
  await db.runAsync(`CREATE TABLE IF NOT EXISTS event_users (
        id INTEGER PRIMARY KEY NOT NULL,
        userID TEXT,
        eventID TEXT,
        isSynced INTEGER DEFAULT 0,
        FOREIGN KEY (eventID) REFERENCES events(eventID) ON DELETE CASCADE,
        FOREIGN KEY (userID) REFERENCES users(userID) ON DELETE CASCADE
      );`);
};

export const insertEventUser = async ({ userID, eventID }) => {
  const db = getDatabase();
  await db.runAsync(
    `INSERT INTO event_users (userID, eventID, isSynced) VALUES (?, ?, 0)`,
    [userID, eventID]
  );
};

export const getEventsByUser = async (userID) => {
  const db = getDatabase();
  const query = `
    SELECT events.* FROM events
    JOIN event_users ON events.eventID = event_users.eventID
    WHERE event_users.userID = ?
  `;
  return await db.getAllAsync(query, [userID]);
};

export const getUsersByEvent = async (eventID) => {
  const db = getDatabase();
  const query = `
    SELECT users.* FROM users
    JOIN event_users ON users.userID = event_users.userID
    WHERE event_users.eventID = ?
  `;
  return await db.getAllAsync(query, [eventID]);
};

export const selectAllEventUsers = async () => {
  const db = getDatabase();
  return await db.getAllAsync("SELECT * FROM event_users");
};

export const getUnsyncedEventUsers = async () => {
  const db = getDatabase();
  return await db.getAllAsync("SELECT * FROM event_users WHERE isSynced = 0");
};

export const updateEventUserSynced = async (id) => {
  const db = getDatabase();
  await db.runAsync("UPDATE event_users SET isSynced = 1 WHERE id = ?", [id]);
};
