import { use } from "react";
import { initializeDatabase } from "../db";
import { insertVenue, selectAllVenues } from "../db/venues";
import { sanitizeJsonField } from "../db/dbUtils";
import { insertVenuesFromAPI } from "../db/venues";

const API_URL = "http://18.119.60.28/api/v1/venues/recZIbq07g9c3uIqX"; // Replace with your actual API

export const testFetchAndInsertVenue = async () => {
  try {
    await initializeDatabase();

    // 1️⃣ Fetch venue from backend
    const response = await fetch(API_URL);
    const venue = await response.json();

    // 2️⃣ Prepare venue data for SQLite
    const localVenue = {
      venueID: venue.venueID,
      venueName: venue.venueName,
      venueCategory: venue.venueCategory,
      venueLocation: venue.venueLocation,
      venueAddress: venue.venueAddress,
      venueContact: venue.venueContact,
      venueDescription: venue.venueDescription,
      venueImage: JSON.stringify(venue.venueImage ?? []),
      latitude: venue.latitude,
      longitude: venue.longitude,
      negocio: venue.negocio ? 1 : 0,
      userID: venue.userID[0], // Replace with actual userID if available
    };

    // 3️⃣ Insert into SQLite
    // await insertVenue(localVenue);

    const response1 = await fetch("http://18.119.60.28/api/v1/venues");
    const venues = await response1.json();
    await insertVenuesFromAPI(venues);

    const venuesSelected = await selectAllVenues();

    console.log("✅ Venues in local DB:", venuesSelected);

    // console.log("✅ Venue inserted:", localVenue);
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
};
