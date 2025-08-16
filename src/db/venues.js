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
        isSynced INTEGER DEFAULT 0,
        FOREIGN KEY (userID) REFERENCES users(userID) ON DELETE CASCADE
      );`);
};

export const insertVenue = async (venue) => {
  const db = getDatabase();
  await db.runAsync(`DROP TABLE IF EXISTS venues;`);
  await initVenuesTable();

  await db.runAsync(
    `INSERT INTO venues (
      venueID, venueName, venueImage, venueDescription, venueCategory, venueLocation, 
      venueAddress, venueContact, latitude, 
      longitud, negocio, userID, isSynced
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      venue.venueID,
      venue.venueName,
      venue.venueImage,
      venue.venueDescription,
      venue.venueCategory,
      venue.venueLocation,
      venue.venueAddress,
      venue.venueContact,
      venue.latitude,
      venue.longitud,
      venue.negocio ? 1 : 0,
      venue.userID,
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
          1 // ✅ mark as synced
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

export const getVenuesByUser = async (userID) => {
  const db = getDatabase();
  return await db.getAllAsync("SELECT * FROM venues WHERE userID = ?", [
    userID,
  ]);
};

export const selectAllVenues = async () => {
  const db = getDatabase();
  return await db.getAllAsync("SELECT * FROM venues");
};

export const getUnsyncedVenues = async () => {
  const db = getDatabase();
  return await db.getAllAsync("SELECT * FROM venues WHERE isSynced = 0");
};

export const updateVenueSynced = async (venueID) => {
  const db = getDatabase();
  await db.runAsync("UPDATE venues SET isSynced = 1 WHERE venueID = ?", [
    venueID,
  ]);
};
