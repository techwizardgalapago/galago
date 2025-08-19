import { initializeDatabase } from "../db";
import { insertUser, selectAllUsers, insertUsersFromAPI, upsertUsersFromAPI } from "../db/users";

const API_URL = "http://18.119.60.28/api/v1/users/recA0pW4iCJwy6hpI";

export const testFetchAndInsertUser = async () => {
  try {
    await initializeDatabase();

    // 1️⃣ Fetch from backend

    const response = await fetch(API_URL);
    const user = await response.json();

    // 2️⃣ Format for local DB
    const localUser = {
      userID: user.userID,
      firstName: user.firstName,
      lastName: user.lastName ?? "",
      userEmail: user.userEmail,
      password: user.password ?? "",
      countryOfOrigin: user.countryOfOrigin ?? "",
      dateOfBirth: user.dateOfBirth ?? "",
      reasonForTravel: Array.isArray(user.reasonForTravel)
        ? user.reasonForTravel.join(", ")
        : user.reasonForTravel ?? "",
      userRole: user.userRole ?? "",
      googleAccount: false,
      recoveryToken: null,
    };

    // 3️⃣ Insert into SQLite
    // await insertUser(localUser);

    const response1 = await fetch("http://18.119.60.28/api/v1/users");
    const user1 = await response1.json();
    await upsertUsersFromAPI(user1);

    // 4️⃣ Confirm

    const users = await selectAllUsers();
    console.log("✅ Users in local DB:", users);
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
};
