import { initializeDatabase as initDBConnection } from './config';
import { initUsersTable } from './users';
import { initVenuesTable } from './venues';
import { initSchedulesTable } from './schedules';
import { initEventsTable } from './events';
import { initEventUsersTable } from './eventUsers';

export const initializeDatabase = async () => {
  await initDBConnection(); // open db + enable foreign keys

  // Initialize all tables
  await initUsersTable();
  await initVenuesTable();
  await initSchedulesTable();
  await initEventsTable();
  await initEventUsersTable();

  console.log('✅ All tables initialized');
};
