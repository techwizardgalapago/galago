// -------------------------------------------------
// src/services/authService.js
// -------------------------------------------------
import { api } from "./api";

export async function loginService({ email, password }) {
  // Adjust the route to your backend
  const { data } = await api.post("auth/login", { email, password });
  // Expecting: { token, user }
  return data;
}

export async function registerService(payload) {
  // Your backend creates the user id and returns it
  // Adjust field names to match your API expectations
  // const { data } = await api.post('users', payload); comentemos hasta probar
  const { data } = await api.post("auth/sign-up", payload);

  // Optionally some backends also return a token on signup; if so, use it
  return data; // e.g. { id, ... } or { token, user }
}

export async function fetchMeService() {
  // const { data } = await api.get('auth/me'); comentemos hasta probar
  const { data } = await api.get("users/:id");
  return data; // user object
}

// Backend should verify idToken with Google and return { token, user }
export async function loginWithGoogleService({ idToken }) {
  // const { data } = await api.post("auth/google", { idToken }); comentemos hasta probar

  const { data } = await api.get("auth/google", { idToken }); //asi tengo en backend
  return data; // { token, user }
}
