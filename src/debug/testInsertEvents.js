import { initializeDatabase } from "../db";
import { upsertEventsFromAirtableGroups, selectAllEvents } from "../db/events";

const API_URL = "http://18.119.60.28/api/v1/events"; // 🔁 Replace with your actual API URL

export const testInsertEvents = async () => {
  try {
    await initializeDatabase();

    // 1️⃣ Fetch events from API
    const response = await fetch(API_URL);
    const events = await response.json();

    // 2️⃣ Validate format
    if (!Array.isArray(events)) {
      throw new Error("Expected an array of events from the API");
    }

    // 3️⃣ Insert into SQLite
    await upsertEventsFromAirtableGroups(events);

    const selectedEvents = await selectAllEvents(); // Assuming you have a function to select all events

    console.log("✅ testInsertEvents: Events inserted successfully");

    console.log("✅ Events in local DB:", selectedEvents);
  } catch (error) {
    console.error("❌ testInsertEvents failed:", error);
  }
};
