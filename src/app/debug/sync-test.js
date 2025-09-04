// 📁 app/debug/sync-test.js
import { View, Text, Button, ScrollView } from "react-native";
import { useState, useEffect } from "react";
import { syncAllOfflineData } from "../../services/syncService";
import { getUnsyncedRecords } from "../../db/dbUtils";
import { testFetchAndInsertUser } from "../../debug/testInsertUser";
import { testFetchAndInsertVenue } from "../../debug/testInsertVenue";
import { testInsertEvents } from "../../debug/testInsertEvents"; // Ensure this import is correct
import { clearAllData } from "../../db/clearAllData";
import { selectAllUsers } from "../../db/users";
import { testInsertSchedules } from "../../debug/testInsertSchedules"; // Ensure this import is correct
import * as db from "../../db";

export default function SyncTestScreen() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const syncData = async () => {
      try {
        await testFetchAndInsertUser(); // 1️⃣ Insert user first
        console.log("✅ User inserted successfully");
        await testFetchAndInsertVenue(); // 2️⃣ Then insert venue (foreign key will be valid)
        console.log("✅ Venue inserted successfully");
        await testInsertSchedules(); // 3️⃣ Insert schedules
        console.log("✅ Schedules inserted successfully");
        await testInsertEvents(); // 4️⃣ Finally insert events
        console.log("✅ Events inserted successfully");
      } catch (error) {
        console.error("❌ Sync failed:", error);
      }
    };

    syncData();
  }, []);

  const appendLog = (msg) => setLogs((prev) => [msg, ...prev]);

  const handleSync = async () => {
    appendLog("🟡 Starting sync...");
    try {
      await syncAllOfflineData();
      appendLog("✅ Sync complete");
    } catch (err) {
      appendLog(`❌ Sync failed: ${err.message}`);
    }
  };

  const handleCheckUnsynced = async () => {
    const tables = ["users", "venues", "events", "schedules", "eventUsers"];
    for (const table of tables) {
      const rows = await getUnsyncedRecords(table);
      appendLog(`📋 ${table}: ${rows.length} unsynced`);
    }
  };

  const handleDumpTableData = async () => {
    const tables = ["users", "venues", "events", "schedules", "eventUsers"];
    for (const table of tables) {
      const records = await db.selectAll(table);
      appendLog(`📄 ${table}:
${JSON.stringify(records, null, 2)}`);
    }
  };

  const handleClearAllData = async () => {
    appendLog("⚠️ Clearing all tables...");
    try {
      await clearAllData();
      appendLog("✅ All tables cleared");
    } catch (err) {
      appendLog(`❌ Clear failed: ${err.message}`);
    }
  };

  const handleGetAllUsers = async () => {
    appendLog("🔍 Fetching all users...");
    try {
      const users = await selectAllUsers();
      appendLog(`👥 Found ${users.length} users`);
      users.forEach((user) => {
        console.log(`-users`, user);
      });
    } catch (err) {
      appendLog(`❌ Fetch failed: ${err.message}`);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 10 }}>
        🔧 Sync Debug Screen
      </Text>

      <Button title='🔄 Manual Sync' onPress={handleSync} />
      <View style={{ height: 10 }} />
      <Button title='🧪 Check Unsynced Records' onPress={handleCheckUnsynced} />
      <View style={{ height: 10 }} />
      <Button title='📂 Dump Table Data' onPress={handleDumpTableData} />

      <View style={{ marginTop: 20 }}>
        {logs.map((log, i) => (
          <Text key={i} style={{ fontSize: 14, marginVertical: 2 }}>
            {log}
          </Text>
        ))}
      </View>
      <Button title='🧼 Clear All Tables' onPress={handleClearAllData} />
      <View style={{ height: 10 }} />
      <Button title='🧪 get All users' onPress={handleGetAllUsers} />
      <View style={{ height: 10 }} />
    </ScrollView>
  );
}
