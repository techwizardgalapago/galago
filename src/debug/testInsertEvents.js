import { initializeDatabase } from "../db";
import { insertEventsFromAPI, selectAllEvents } from "../db/events";
import { selectAllEventUsers } from "../db/eventUsers";

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
    await insertEventsFromAPI(events);

    const selectedEvents = await selectAllEvents(); // Assuming you have a function to select all events

    console.log("✅ testInsertEvents: Events inserted successfully");

    const eventUsers = await selectAllEventUsers(); // Assuming you have a function to select all event users
    console.log("✅ Event users in local DB:", eventUsers);

    console.log("✅ Events in local DB:", selectedEvents);
  } catch (error) {
    console.error("❌ testInsertEvents failed:", error);
  }
};
