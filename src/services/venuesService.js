import { api } from './api';

// Normaliza la respuesta de creacion.
// El backend responde con un array de fields (airtable.crud.createRecord),
// pero toleramos tambien [{ id, fields }] y { records: [...] }.
const extractCreatedVenueId = (responseData) => {
  if (!responseData) return null;
  const arr = Array.isArray(responseData) ? responseData : responseData.records;
  const rec = Array.isArray(arr) ? arr[0] : responseData;
  if (!rec) return null;
  return rec.venueID || rec.fields?.venueID || rec.id || null;
};

export const getVenues = async (params = {}) => {
  const res = await api.get('/venues', { params });
  return res.data;
};

export const createVenue = async (fields) => {
  // Backend espera: [ { fields: {...} } ]
  const payload = [{ fields }];
  const res = await api.post('/venues', payload); // baseUrl configurado en api.js -> http://localhost:8080/api/v1
  return res.data[0];
};

export const createVenueSchedules = async (records) => {
  // records: [ { fields: { linkedVenue: [id], weekDay, openingTime_, closingTime_ } }, ...]
  const res = await api.post('/venues-schedule', records);
  return res.data;
};

// Acepta un archivo suelto o una lista: el backend las anade a las que el
// local ya tiene, hasta seis.
export const uploadVenueImage = async (venueID, fileOrFormData) => {
  if (typeof FormData !== 'undefined' && fileOrFormData instanceof FormData) {
    // ✅ send as-is, no manual headers
    const res = await api.put(`/venues-img/${venueID}`, fileOrFormData);
    return res.data;
  }
  const form = new FormData();
  const lista = Array.isArray(fileOrFormData) ? fileOrFormData : [fileOrFormData];
  lista.forEach((file) => form.append('images', file)); // native { uri, name, type }
  const res = await api.put(`/venues-img/${venueID}`, form);
  return res.data;
};

// Sin `filename` el backend borra todas las imagenes del local.
export const deleteVenueImage = async (venueID, filename) => {
  const res = await api.delete(`/venues-img/${venueID}`, {
    params: filename ? { filename } : undefined,
  });
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
    } catch {}
  }
  return results;
};

// GET venues del usuario.
//
// El backend NO acepta ?userID=: queryVenueSchema solo permite limit, offset,
// filterField y filterValue, y como no hay error handler registrado un
// parametro desconocido sale como 500 en vez de 400. Mandarlo provocaba un 500
// por cada carga de la pantalla de negocios y luego, en el catch, la peticion
// completa igual.
//
// El filtrado por userID lo hace fetchUserVenuesByUserId en venueSlice, asi que
// aqui basta con traer la lista.
export const getVenuesByUserId = async (userID) => {
  if (!userID) return [];
  const res = await api.get(`/venues`);
  return res.data;
};

// PATCH venue (solo los campos enviados)
export const patchVenue = async (venueID, fieldsPatch) => {
  // El backend espera el objeto plano en PUT /venues/:id (updateVenueSchema).
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
