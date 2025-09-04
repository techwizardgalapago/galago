import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";

let db = null;

export const initializeDatabase = async () => {
  if (Platform.OS === "web") return null;

  db = await SQLite.openDatabaseAsync("app.db");

  // Configuración de WAL (Write-Ahead Logging) para mayor consistencia
  await db.runAsync("PRAGMA journal_mode = WAL");
  // Use runAsync for PRAGMA statements
  await db.runAsync("PRAGMA foreign_keys = ON");

  // Aquí se agrega la gestión de versiones
  const versionQuery = await db.runAsync("PRAGMA user_version = 1");
  const currentVersion = versionQuery.user_version;

  // Comprobar la versión del esquema y realizar las migraciones si es necesario
  if (currentVersion === 0) {
    // Versión inicial: Realiza migraciones de la base de datos si es necesario.
    console.log("Migración de esquema de versión 0 a 1...");
    await migrateSchemaToVersion1(db);
    await db.runAsync("PRAGMA user_version = 1");
  }

  return db;
};

// Función de migración para la versión 1
const migrateSchemaToVersion1 = async (db) => {
  // Aquí agregamos cualquier migración que desees aplicar a la base de datos
  // En este caso, solo sería agregar el campo `updated_at` y `deleted` si no están presentes
  // Ejemplo de migración que ya debería haberse hecho: asegurar que los campos 'updated_at' y 'deleted' estén en todas las tablas
  // No es necesario si ya has agregado estos campos previamente en las tablas.
  // Si en el futuro necesitas más migraciones, puedes ir añadiendo funciones adicionales aquí.
};

export const getDatabase = () => {
  if (!db) {
    throw new Error(
      "Database not initialized. Call initializeDatabase() first."
    );
  }
  return db;
};
