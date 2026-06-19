import { api } from './api';

/**
 * Partial-patch user profile on backend → Airtable.
 * Only fields that are explicitly provided (not undefined) are sent,
 * so callers can send a single field without affecting the rest.
 */
export const patchUserProfile = async (userID, data) => {
  const body = {};
  if (data.firstName !== undefined) body.firstName = data.firstName;
  if (data.lastName !== undefined) body.lastName = data.lastName;
  if (data.userEmail !== undefined) body.userEmail = data.userEmail;
  if (data.userRole !== undefined) body.userRole = data.userRole;
  if (data.dateOfBirth !== undefined) body.dateOfBirth = data.dateOfBirth;
  if (data.countryOfOrigin !== undefined) body.countryOfOrigin = data.countryOfOrigin;
  if (data.reasonForTravel !== undefined) {
    body.reasonForTravel = Array.isArray(data.reasonForTravel)
      ? data.reasonForTravel
      : (data.reasonForTravel ? [data.reasonForTravel] : []);
  }
  if (data.genero !== undefined) body.genero = data.genero;
  if (data.favoriteEvents !== undefined) body.favoriteEvents = data.favoriteEvents;
  if (data.favoriteVenues !== undefined) body.favoriteVenues = data.favoriteVenues;
  if (data.favoriteSites !== undefined) body.favoriteSites = data.favoriteSites;

  const res = await api.put(`/users/${userID}`, body);
  return res.data;
};
