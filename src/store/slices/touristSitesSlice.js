import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getTouristSites } from "../../services/touristSitesService";

const mapRemoteSite = (r) => {
  if (!r) return null;
  if (r.fields && r.id) return { siteID: r.id, ...r.fields };
  // Airtable formula field puede ser siteId o siteID
  const id = r.siteID || r.siteId;
  if (id) return { ...r, siteID: id };
  if (r.id) return { siteID: r.id, ...r };
  return null;
};

export const fetchTouristSitesRemote = createAsyncThunk(
  "touristSites/fetchRemote",
  async () => {
    const remote = await getTouristSites();
    const list = Array.isArray(remote) ? remote : remote?.records || remote?.data || [];
    return list.map(mapRemoteSite).filter(Boolean);
  }
);

const touristSitesSlice = createSlice({
  name: "touristSites",
  initialState: {
    list: [],
    status: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTouristSitesRemote.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchTouristSitesRemote.fulfilled, (state, action) => {
        const incoming = action.payload || [];
        incoming.forEach((site) => {
          const index = state.list.findIndex((s) => s.siteID === site.siteID);
          if (index !== -1) state.list[index] = { ...state.list[index], ...site };
          else state.list.push(site);
        });
        state.status = "succeeded";
      })
      .addCase(fetchTouristSitesRemote.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error?.message;
        console.warn("fetchTouristSitesRemote failed:", action.error?.message);
      });
  },
});

export default touristSitesSlice.reducer;

export const selectTouristSiteById = (state, id) =>
  state.touristSites.list.find((s) => s.siteID === id || s.siteId === id) || null;
