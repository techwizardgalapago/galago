import { Platform } from "react-native";
import { initializeDatabase as initDBConnection } from './config';
import { initUsersTable } from './users';
import { initVenuesTable } from './venues';
import { initSchedulesTable } from './schedules';
import { initEventsTable } from './events';

export const initializeDatabase = async () => {
    // Skip on web completely
  if (Platform.OS === "web") {
    console.log("🌐 Web build detected — skipping SQLite initialization.");
    return;
  }
  
  // Native (iOS/Android): open DB and init tables
  await initDBConnection(); // open db + enable foreign keys

  // Initialize all tables
  await initUsersTable();
  await initVenuesTable();
  await initSchedulesTable();
  await initEventsTable();

  console.log('✅ All tables initialized');
};
