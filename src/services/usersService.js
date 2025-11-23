import { api } from './api';

/**
 * PATCH user profile on backend → Airtable.
 * NOTE: your screen uses a single string for reasonForTravel; backend usually expects an array.
 */
export const patchUserProfile = async (userID, data) => {
  const body = {
    firstName: data.firstName,
    lastName: data.lastName,
    userEmail: data.userEmail,
    userRole: data.userRole,
    dateOfBirth: data.dateOfBirth,
    countryOfOrigin: data.countryOfOrigin,
    reasonForTravel: Array.isArray(data.reasonForTravel)
      ? data.reasonForTravel
      : (data.reasonForTravel ? [data.reasonForTravel] : []),
      genero: data.genero, // <-- NEW FIELD
  };
  const res = await api.put(`/users/${userID}`, body);
  
  return res.data; // ideally { user: {...updated airtable user...} }
};
