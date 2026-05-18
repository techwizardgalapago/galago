import { api } from "./api";

export const getEvents = async (params = {}) => {
  const res = await api.get("/events", { params });
  return res.data;
};

export const createEvent = async (fields) => {
  const payload = [{ fields }];
  const res = await api.post('/events', payload);
  return res.data[0];
};

export const getEventById = async (eventID) => {
  const res = await api.get(`/events/${eventID}`);
  return res.data;
};

export const patchEvent = async (eventID, fieldsPatch) => {
  const res = await api.put(`/events/${eventID}`, fieldsPatch);
  return res.data;
};

export const deleteEvent = async (eventID) => {
  const res = await api.delete(`/events/${eventID}`);
  return res.data;
};

export const uploadEventImage = async (eventID, fileOrFormData) => {
  if (typeof FormData !== 'undefined' && fileOrFormData instanceof FormData) {
    const res = await api.put(`/events-img/${eventID}`, fileOrFormData);
    return res.data;
  }
  const form = new FormData();
  form.append('image', fileOrFormData);
  const res = await api.put(`/events-img/${eventID}`, form);
  return res.data;
};

export const parseCreatedEventId = (responseData) => {
  if (!responseData) return null;
  const arr = Array.isArray(responseData) ? responseData : responseData?.records;
  const rec = Array.isArray(arr) ? arr[0] : responseData;
  return rec?.eventID || rec?.id || rec?.fields?.id || null;
};
