import axios from "axios";
import debounce from "lodash.debounce";

import { getUnsyncedRecords } from "../db/dbUtils";
import { updateUserSynced } from "../db/users";
import { updateEventSynced } from "../db/events";
import { updateVenueSynced } from "../db/venues";
import { updateScheduleSynced } from "../db/schedules";
import { updateEventUserSynced } from "../db/eventUsers";

const API_URL = "https://your-api-url.com";

/**
 * Generic sync function for syncing any table
 */
const syncTable = async ({ name, getUnsynced, pushToBackend, markSynced }) => {
  try {
    const unsynced = await getUnsynced();

    if (unsynced.length === 0) {
      console.log(`✅ No unsynced ${name} records.`);
      return;
    }
    console.log(`synctable: `, unsynced)

    await Promise.all(
      unsynced.map(async (item) => {
        try {
          await pushToBackend(item);
          await markSynced(item);
          console.log(`✅ Synced ${name}:`, item);
        } catch (err) {
          console.warn(`❌ Failed to sync ${name} record`, item, err);
        }
      })
    );
  } catch (err) {
    console.error(`❌ Error syncing ${name}:`, err);
  }
};

// Debounce the entire syncAllOfflineData function (e.g., 3 seconds)
const debouncedSyncAll = debounce(async () => {
  try {
    await Promise.all([
      syncTable({
        name: "users",
        getUnsynced: () => getUnsyncedRecords("users"),
        pushToBackend: (user) => axios.post(`${API_URL}/users`, user),
        markSynced: (user) => updateUserSynced(user.userID),
      }),
      syncTable({
        name: "venues",
        getUnsynced: () => getUnsyncedRecords("venues"),
        pushToBackend: (venue) => axios.post(`${API_URL}/venues`, venue),
        markSynced: (venue) => updateVenueSynced(venue.venueID),
      }),
      syncTable({
        name: "events",
        getUnsynced: () => getUnsyncedRecords("events"),
        pushToBackend: (event) => axios.post(`${API_URL}/events`, event),
        markSynced: (event) => updateEventSynced(event.eventID),
      }),
      syncTable({
        name: "schedules",
        getUnsynced: () => getUnsyncedRecords("schedules"),
        pushToBackend: (schedule) => axios.post(`${API_URL}/schedules`, schedule),
        markSynced: (schedule) => updateScheduleSynced(schedule.scheduleID),
      }),
      syncTable({
        name: "event_users",
        getUnsynced: () => getUnsyncedRecords("event_users"),
        pushToBackend: (eventUser) => axios.post(`${API_URL}/event-users`, eventUser),
        markSynced: (eventUser) => updateEventUserSynced(eventUser.id),
      }),
    ]);
    console.log("✅ All offline data synced");
  } catch (error) {
    console.error("❌ Sync all offline data error:", error);
  }
}, 3000); // debounce 3 seconds

export const syncAllOfflineData = async () => {
  await debouncedSyncAll();
};
