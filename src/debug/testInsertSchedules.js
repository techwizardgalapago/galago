import { initializeDatabase } from "../db";
import { insertSchedulesFromAPI, selectAllSchedules } from "../db/schedules";

const API_URL = "http://18.119.60.28/api/v1/venues-schedule/"; // Replace if needed

export const testInsertSchedules = async () => {
  try {
    console.log("📦 Initializing DB...");
    await initializeDatabase();

    console.log("🌐 Fetching schedules from API...");
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error("Failed to fetch schedules");
    const schedules = await response.json();

    console.log("📥 Inserting schedules into SQLite...");
    await insertSchedulesFromAPI(schedules);

    console.log("✅ testInsertSchedules complete. Inserted:", schedules.length);

    const allSchedules = await selectAllSchedules();
    console.log("📊 All schedules in local DB:", allSchedules);
  } catch (error) {
    console.error("❌ testInsertSchedules failed:", error);
  }
};
