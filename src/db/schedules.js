import { getDatabase } from "./config";

export const initSchedulesTable = async () => {
  const db = getDatabase();
  await db.runAsync(`CREATE TABLE IF NOT EXISTS schedules (
        scheduleID TEXT PRIMARY KEY NOT NULL,
        linkedVenue TEXT,
        weekDay TEXT,
        openingTime TEXT,
        closingTime TEXT,
        isSynced INTEGER DEFAULT 0,
        FOREIGN KEY (linkedVenue) REFERENCES venues(venueID) ON DELETE CASCADE
      );`);
};

export const insertSchedule = async (schedule) => {
  const db = getDatabase();
  await db.runAsync(
    `INSERT INTO schedules (
      linkedVenue, weekDay, openingTime, closingTime, isSynced
    ) VALUES (?, ?, ?, ?, 0)`,
    [
      schedule.linkedVenue,
      schedule.weekDay,
      schedule.openingTime,
      schedule.closingTime,
    ]
  );
};

export const insertSchedulesFromAPI = async (schedules) => {
  const db = getDatabase();

  try {
    await db.execAsync("BEGIN TRANSACTION");

    for (const schedule of schedules) {
      const linkedVenueID = Array.isArray(schedule.linkedVenue)
        ? schedule.linkedVenue[0]
        : schedule.linkedVenue;

      await db.runAsync(
        `INSERT INTO schedules (
          scheduleID, linkedVenue, weekDay, openingTime, closingTime, isSynced
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          schedule.scheduleID,
          linkedVenueID,
          schedule.weekDay,
          schedule.openingTime_ ?? "", // fallback in case it's undefined
          schedule.closingTime_ ?? "",
          1, // ✅ mark as synced
        ]
      );
    }

    await db.execAsync("COMMIT");
    console.log("✅ Schedules inserted successfully");
  } catch (error) {
    await db.execAsync("ROLLBACK");
    console.error("❌ Failed to insert schedules from API:", error);
    throw error;
  }
};

export const getSchedulesByVenue = async (venueID) => {
  const db = getDatabase();
  return await db.getAllAsync(
    "SELECT * FROM schedules WHERE linkedVenue = ?",
    [venueID]
  );
};

export const selectAllSchedules = async () => {
  const db = getDatabase();
  return await db.getAllAsync("SELECT * FROM schedules");
};

export const getUnsyncedSchedules = async () => {
  const db = getDatabase();
  return await db.getAllAsync("SELECT * FROM schedules WHERE isSynced = 0");
};

export const updateScheduleSynced = async (scheduleID) => {
  const db = getDatabase();
  await db.runAsync("UPDATE schedules SET isSynced = 1 WHERE scheduleID = ?", [
    scheduleID,
  ]);
};
