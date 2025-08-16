import { getDatabase } from "./config";

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
        isSynced INTEGER DEFAULT 0,
        FOREIGN KEY (eventVenueID) REFERENCES venues(venueID) ON DELETE CASCADE
      );`);
};

export const insertEvent = async (event) => {
  const db = getDatabase();
  await db.runAsync(
    `INSERT INTO events (
      eventName, eventImage, eventDescription, eventTags, telOrganizador,
      startTime, endTime, eventVenueID, eventVenueName, eventIslandLocation,
      direccionVenues, organizador, eventCapacity, eventPrice, isSynced
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      event.eventName,
      event.eventImage,
      event.eventDescription,
      event.eventTags,
      event.telOrganizador,
      event.startTime,
      event.endTime,
      event.eventVenueID,
      event.eventVenueName,
      event.eventIslandLocation,
      event.direccionVenues,
      event.organizador,
      event.eventCapacity,
      event.eventPrice,
    ]
  );
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

        // 👇 Bulk insert into event_users if applicable
        if (!rawEvent.eventUsers || rawEvent.eventUsers.length === 0) {
          console.log("No event users found for event:", rawEvent.eventID);
          continue; // Skip if no users
        } else {
          if (Array.isArray(rawEvent.eventUsers)) {
            console.log("Inserting event users for event:", rawEvent.eventID);
            for (const userID of rawEvent.eventUsers) {
              console.log("is there event user?", userID);
              await db.runAsync(
                `INSERT OR IGNORE INTO event_users (eventID, userID, isSynced) VALUES (?, ?, ?)`,
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

export const getEventsByVenue = async (venueID) => {
  const db = getDatabase();
  return await db.getAllAsync("SELECT * FROM events WHERE eventVenueID = ?", [
    venueID,
  ]);
};

// Get all events for a specific user todavia tengo q probar
export const getEventsByUser = async (userID) => {
  const db = getDatabase();
  return await db.getAllAsync("SELECT * FROM events WHERE eventUsers LIKE ?", [
    `%${userID}%`,
  ]);
};

export const selectAllEvents = async () => {
  const db = getDatabase();
  return await db.getAllAsync("SELECT * FROM events");
};

export const getUnsyncedEvents = async () => {
  const db = getDatabase();
  return await db.getAllAsync("SELECT * FROM events WHERE isSynced = 0");
};

export const updateEventSynced = async (eventID) => {
  const db = getDatabase();
  await db.runAsync("UPDATE events SET isSynced = 1 WHERE eventID = ?", [
    eventID,
  ]);
};
