import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";

let db = null;

export const initializeDatabase = async () => {
  if (Platform.OS === "web") return null;

  db = await SQLite.openDatabaseAsync("app.db");
  await db.runAsync("PRAGMA journal_mode = WAL");
  // Use runAsync for PRAGMA statements
  await db.runAsync("PRAGMA foreign_keys = ON");

  return db;
};

export const getDatabase = () => {
  if (!db) {
    throw new Error(
      "Database not initialized. Call initializeDatabase() first."
    );
  }
  return db;
};
