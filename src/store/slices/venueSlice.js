// src/store/slices/venuesSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { Platform } from "react-native";
import {
  selectAllVenues as dbSelectAllVenues,
  insertVenue as dbInsertVenue,
  updateVenueLocal as dbUpdateVenueLocal,
  upsertVenuesFromAPI as dbUpsertVenuesFromAPI,
} from "../../db/venues";
import { upsertSchedulesFromAPI as dbUpsertSchedulesFromAPI } from "../../db/schedules";
import { getVenuesByIds, getVenuesByUserId } from "../../services/venuesService";

// -------- Platform guards (como en usersSlice) --------
const isWeb = Platform.OS === "web";
const ignoreDBIfWeb = async (fn, fallback) => {
  if (isWeb) return fallback ?? null;
  try {
    return await fn();
  } catch (e) {
    if (/Database not initialized/i.test(e?.message)) {
      // comportarse como web: no DB
      return fallback ?? null;
    }
    throw e;
  }
};

// -------- Helpers --------
// Acepta { id, fields } (Airtable) o ya-flattened { venueID, ... }
const mapRemoteVenue = (r) => {
  if (!r) return null;
  if (r.fields && r.id) {
    // Airtable-ish
    return { venueID: r.id, ...r.fields };
  }
  // Si ya viene plano con venueID, úsalo tal cual
  if (r.venueID) return r;
  // Último recurso: si trae id pero no fields
  if (r.id) return { venueID: r.id, ...r };
  return null;
};

const extractSchedulesFromVenues = (venues = []) => {
  const schedules = [];
  (venues || []).forEach((venue) => {
    const list = venue?.VenueSchedules;
    if (!Array.isArray(list)) return;
    list.forEach((item) => {
      const fields = item?.fields ? item.fields : item;
      const scheduleID =
        item?.scheduleID ?? item?.id ?? fields?.scheduleID ?? fields?.id;
      const venueID =
        fields?.venueID ??
        (Array.isArray(fields?.linkedVenue) ? fields.linkedVenue[0] : null) ??
        venue?.venueID;
      if (!scheduleID || !venueID) return;
      schedules.push({
        scheduleID,
        venueID,
        dayOfWeek: fields?.dayOfWeek ?? fields?.weekDay ?? fields?.day ?? null,
        openTime:
          fields?.openTime ??
          fields?.openingTime_ ??
          fields?.openingTime ??
          null,
        closeTime:
          fields?.closeTime ??
          fields?.closingTime_ ??
          fields?.closingTime ??
          null,
        deleted: fields?.deleted ?? false,
        updated_at: fields?.updated_at ?? fields?.lastModified ?? null,
      });
    });
  });
  return schedules;
};

// -------- Thunks --------
export const fetchVenues = createAsyncThunk("venues/fetchVenues", async () => {
  // NOTE: return null when DB is unavailable/uninitialized (web)
  const rows = await ignoreDBIfWeb(() => dbSelectAllVenues(), null);
  return rows; // could be an array (native) or null (web)
});

export const addVenue = createAsyncThunk("venues/addVenue", async (venue) => {
  await ignoreDBIfWeb(() => dbInsertVenue(venue));
  return venue; // optimista a Redux (en web y nativo)
});

export const editVenueLocal = createAsyncThunk(
  "venues/editVenueLocal",
  async (patch) => {
    await ignoreDBIfWeb(() => dbUpdateVenueLocal(patch));
    return patch; // { venueID, ...fields } → optimista en Redux
  }
);

// Upsert desde API y luego leer de SQLite (si hay DB)
export const upsertVenuesFromAPIThunk = createAsyncThunk(
  "venues/upsertFromAPI",
  async (remoteVenues) => {
    // En web: no DB → solo mapea y devuelve al slice
    if (isWeb) {
      const mapped = (remoteVenues || [])
        .map(mapRemoteVenue)
        .filter(Boolean);
      return mapped;
    }
    // Native: persiste + lee verdad local
    const mapped = (remoteVenues || []).map(mapRemoteVenue).filter(Boolean);
    await dbUpsertVenuesFromAPI(mapped);
    const schedules = extractSchedulesFromVenues(mapped);
    if (schedules.length) {
      await dbUpsertSchedulesFromAPI(schedules);
    }
    const rows = await dbSelectAllVenues();
    return rows || [];
  }
);

// Trae del backend por IDs; en web no persiste, en native sí.
export const fetchUserVenuesRemote = createAsyncThunk(
  "venues/fetchUserVenuesRemote",
  async (ids = []) => {
    if (!ids?.length) return [];

    const remote = await getVenuesByIds(ids); // puede ser [{id, fields}] o ya plano
    const mapped = (remote || []).map(mapRemoteVenue).filter(Boolean);

    if (isWeb) {
      // Web: no DB; devuelve directo para Redux
      return mapped;
    }
    // Native: reflejar en SQLite y luego devolver verdad local
    await dbUpsertVenuesFromAPI(mapped);
    const schedules = extractSchedulesFromVenues(mapped);
    if (schedules.length) {
      await dbUpsertSchedulesFromAPI(schedules);
    }
    const all = await dbSelectAllVenues();
    return all || [];
  }
);

// Trae venues por userID; útil cuando el usuario no trae userVenues[] en auth
export const fetchUserVenuesByUserId = createAsyncThunk(
  "venues/fetchUserVenuesByUserId",
  async (userID) => {
    if (!userID) return [];
    const remote = await getVenuesByUserId(userID);
    const mapped = (remote || []).map(mapRemoteVenue).filter(Boolean);

    const filtered = mapped.filter((v) => {
      const val = v?.userID;
      if (Array.isArray(val)) return val.includes(userID);
      return val === userID;
    });

    if (isWeb) return filtered;

    await dbUpsertVenuesFromAPI(filtered);
    const schedules = extractSchedulesFromVenues(filtered);
    if (schedules.length) {
      await dbUpsertSchedulesFromAPI(schedules);
    }
    const all = await dbSelectAllVenues();
    return all || [];
  }
);

// -------- Slice --------
const venuesSlice = createSlice({
  name: "venues",
  initialState: {
    list: [],
    status: "idle",
    error: null,
    rehydrated: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // fetch local
      .addCase(fetchVenues.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchVenues.fulfilled, (state, action) => {
        // If payload is null (web), IGNORE this update to avoid wiping the list
        if (!action.payload) return;

        state.list = action.payload;
        state.status = "succeeded";
        state.rehydrated = true;
      })
      .addCase(fetchVenues.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error?.message;
      })

      // add (optimista)
      .addCase(addVenue.fulfilled, (state, action) => {
        const v = action.payload;
        // si no trae venueID (web), no lo dupliques
        if (!v?.venueID) return;
        // push/upsert simple
        const i = state.list.findIndex((x) => x.venueID === v.venueID);
        if (i === -1) state.list.push(v);
        else state.list[i] = { ...state.list[i], ...v };
      })

      // update local (optimista)
      .addCase(editVenueLocal.fulfilled, (state, action) => {
        const { venueID, ...changes } = action.payload || {};
        if (!venueID) return;
        const i = state.list.findIndex((v) => v.venueID === venueID);
        if (i !== -1) state.list[i] = { ...state.list[i], ...changes };
      })

      // upsert desde API
      // .addCase(upsertVenuesFromAPIThunk.fulfilled, (state, action) => {
      //   state.list = action.payload || [];
      //   console.log("Venues after upsertVenuesFromAPIThunk:", state.list);
      // })
      .addCase(upsertVenuesFromAPIThunk.fulfilled, (state, action) => {
        const incoming = action.payload || [];

        // For each venue in the payload, either update it (if it exists) or push it
        incoming.forEach((venue) => {
          const index = state.list.findIndex(v => v.venueID === venue.venueID);
          if (index !== -1) {
            state.list[index] = { ...state.list[index], ...venue };
          } else {
            state.list.push(venue);
          }
        })

        console.log("Venues after upsertVenuesFromAPIThunk:", state.list);
      })

      // fetch remoto por IDs
      .addCase(fetchUserVenuesRemote.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchUserVenuesRemote.fulfilled, (state, action) => {
        state.list = action.payload || [];
        state.status = "succeeded";
      })
      .addCase(fetchUserVenuesRemote.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error?.message;
      });

    builder
      .addCase(fetchUserVenuesByUserId.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchUserVenuesByUserId.fulfilled, (state, action) => {
        state.list = action.payload || [];
        state.status = "succeeded";
      })
      .addCase(fetchUserVenuesByUserId.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error?.message;
      });
  },
});

export default venuesSlice.reducer;

// Selector simple
export const selectVenueByIdFromState = (state, id) =>{
  const venues = state.venues.list.find((v) => v.venueID === id)
  return venues || null;};
