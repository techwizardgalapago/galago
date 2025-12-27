import { api } from './api';

// Normaliza respuesta (Airtable suele devolver array de records)
const extractCreatedVenueId = (responseData) => {
  if (!responseData) return null;
  // Posibles estructuras: [{ id, fields }, ...] | { records: [{ id, fields }, ...] }
  const arr = Array.isArray(responseData) ? responseData : responseData.records;
  const rec = Array.isArray(arr) ? arr[0] : null;
  // Airtable usa 'id' (p.ej. rectHWy8ujec0uB4s)
  console.log('extractCreatedVenueId - record:', rec);
  return rec?.venueIDid || rec?.fields?.id || null;
};

export const createVenue = async (fields) => {
  // Backend espera: [ { fields: {...} } ]
  const payload = [{ fields }];
  const res = await api.post('/venues', payload); // baseUrl configurado en api.js -> http://localhost:8080/api/v1
  console.log('createVenue response:', res.data[0]);
  return res.data[0];
};

export const createVenueSchedules = async (records) => {
  // records: [ { fields: { linkedVenue: [id], weekDay, openingTime_, closingTime_ } }, ...]
  const res = await api.post('/venues-schedule', records);
  return res.data;
};

export const uploadVenueImage = async (venueID, fileOrFormData) => {
  if (typeof FormData !== 'undefined' && fileOrFormData instanceof FormData) {
    // ✅ send as-is, no manual headers
    const res = await api.put(`/venues-img/${venueID}`, fileOrFormData);
    return res.data;
  }
  const form = new FormData();
  form.append('image', fileOrFormData);  // native { uri, name, type }
  const res = await api.put(`/venues-img/${venueID}`, form);
  return res.data;
};

// Opción A: tu backend soporte GET /venues/:id
export const getVenueById = async (venueID) => {
  const res = await api.get(`/venues/${venueID}`);
  return res.data; // idealmente { id, fields: { ... } }
};

// Opción B: si no tienes un endpoint por id, puedes usar un batch si lo tienes (ajusta a tu API)
// Si no existe batch, haz un Promise.all con getVenueById(ids[i])
export const getVenuesByIds = async (ids = []) => {
  const results = [];
  for (const id of ids) {
    try {
      const v = await getVenueById(id);
      if (v) results.push(v);
    } catch (_) {}
  }
  return results;
};

// GET venues by user; tries filtered endpoint first, falls back to full list
export const getVenuesByUserId = async (userID) => {
  if (!userID) return [];
  try {
    const res = await api.get(`/venues`, { params: { userID } });
    return res.data;
  } catch (err) {
    const res = await api.get(`/venues`);
    return res.data;
  }
};

// PATCH venue (solo los campos enviados)
export const patchVenue = async (venueID, fieldsPatch) => {
  // Ajusta al shape que espera tu backend para PATCH (Airtable: [{id, fields}] o { fields }
  const payload = { fields: fieldsPatch };
  const res = await api.put(`/venues/${venueID}`, fieldsPatch);
  return res.data; // debería retornar el venue actualizado
};

// DELETE todos los horarios de un venue
export const deleteVenueScheduleById = async (id) => {
  try {
    const res = await api.delete(`/venues-schedule/${id}`);
    return res.data || {};
  } catch (err) {
    console.error(`Delete schedule ${id} failed`, err);
    throw err;
  }
};


export const updateVenueSchedules = async (payloadArray) => {
  try {
    const res = await api.put('/venues-schedule', payloadArray);
    return res.data || {};
  } catch (err) {
    console.error('Update schedules failed', err);
    throw err;
  }
};

export const parseCreatedVenueId = extractCreatedVenueId;
