import { api } from './api';

// Las valoraciones de un local.
//
// La nota promedio no se pide aqui: viaja dentro del propio local
// (venueRating), que es un rollup de Airtable. Esto son las opiniones, con su
// texto y su autor.

// Las publicadas, de la mas reciente a la mas antigua. No necesita sesion.
export const getVenueRatings = async (venueID) => {
  if (!venueID) return [];
  const res = await api.get('/venues-rating', { params: { venueID } });
  return Array.isArray(res.data) ? res.data : [];
};

// La propia, este publicada o en revision. Devuelve null si todavia no se ha
// calificado este local. Requiere sesion.
export const getMyVenueRating = async (venueID) => {
  if (!venueID) return null;
  const res = await api.get('/venues-rating/mine', { params: { venueID } });
  return res.data || null;
};

// Crea la valoracion o reescribe la que ya habia: una por persona y local.
//
// Nace oculta y no cuenta para el promedio hasta que se revisa, asi que la
// pantalla que llame a esto tiene que decirlo; si no, parece que no se
// guardo.
export const rateVenue = async ({ venueID, estrellas, comentario }) => {
  const res = await api.post('/venues-rating', {
    venueID,
    ratingStars: estrellas,
    ratingComment: comentario,
  });
  return res.data;
};

export const deleteVenueRating = async (ratingID) => {
  const res = await api.delete(`/venues-rating/${ratingID}`);
  return res.data;
};
