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


export const parseCreatedVenueId = extractCreatedVenueId;
