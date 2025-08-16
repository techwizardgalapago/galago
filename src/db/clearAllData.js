// 📁 src/db/clearAllData.js
import { getDatabase } from "./config";

export const clearAllData = async () => {
  const db = getDatabase();

  const tables = ["users", "venues", "schedules", "events", "event_users"];

  for (const table of tables) {
    try {
      await db.runAsync(`DELETE FROM ${table}`);
      console.log(`🧹 Cleared table: ${table}`);
    } catch (error) {
      console.error(`❌ Failed to clear ${table}:`, error);
    }
  }
};
