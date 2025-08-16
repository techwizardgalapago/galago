import { getDatabase } from "./config";

export const getUnsyncedRecords = async (tableName) => {
  const db = getDatabase();
  return await db.getAllAsync(`SELECT * FROM ${tableName} WHERE isSynced = 0`);
};

export const sanitizeJsonField = (field) => {
    if (
      !field ||
      field === undefined ||
      (typeof field === "string" && field.trim() === "")
    ) {
      return "[]"; // empty JSON array string
    }
    if (typeof field === "string") {
      try {
        JSON.parse(field); // is valid JSON string?
        return field;
      } catch {
        return JSON.stringify(field);
      }
    }
    // if it's an array/object
    return JSON.stringify(field);
  };