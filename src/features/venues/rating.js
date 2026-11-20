// La calificacion de un local.
//
// Hoy no existe: 'venueRating' no es un campo de la tabla de Airtable, asi
// que lo que llega de la API siempre viene vacio. Mientras no exista el
// sistema de valoraciones, todos los locales se muestran con la calificacion
// provisional, que es una decision de producto y no un dato.
//
// El valor real tiene prioridad: en cuanto el campo exista en Airtable y
// llegue con contenido, se usa ese. Para dejar de inventar calificaciones
// basta con que 'ratingDeVenue' devuelva null en vez de la provisional; no
// hay que tocar ninguna pantalla.

export const RATING_MAXIMO = 5;

// Provisional hasta que haya valoraciones de verdad.
export const RATING_PROVISIONAL = 5;

// Airtable puede devolver el numero como texto, y en castellano la coma es
// el separador decimal, asi que '4,5' tambien se entiende.
const comoNumero = (valor) => {
  if (typeof valor === "number") return valor;
  if (typeof valor === "string" && valor.trim()) {
    return Number(valor.trim().replace(",", "."));
  }
  return NaN;
};

export const ratingDeVenue = (venue) => {
  const numero = comoNumero(venue?.venueRating ?? venue?.rating);
  if (Number.isFinite(numero)) {
    // Un dato fuera de rango se recorta en vez de pintar seis estrellas o
    // una negativa.
    return Math.min(RATING_MAXIMO, Math.max(0, numero));
  }
  return RATING_PROVISIONAL;
};

// El numero que acompana a las estrellas. '5' y no '5.0', y '4,5' con coma,
// que es como se escribe una nota aqui.
export const textoRating = (rating) => {
  if (!Number.isFinite(rating)) return "";
  return Number.isInteger(rating)
    ? String(rating)
    : rating.toFixed(1).replace(".", ",");
};

// Como se ve cada estrella, de izquierda a derecha.
//
// Media estrella desde un cuarto y hasta tres cuartos. Por debajo se ve
// vacia y por encima llena: redondear al medio mas cercano evita que un 4,9
// se pinte igual que un 4,5.
export const formasDeEstrellas = (rating, maximo = RATING_MAXIMO) => {
  const valor = Number.isFinite(rating) ? Math.min(maximo, Math.max(0, rating)) : 0;
  const formas = [];
  for (let i = 1; i <= maximo; i += 1) {
    const resto = valor - (i - 1);
    if (resto >= 0.75) formas.push("llena");
    else if (resto >= 0.25) formas.push("media");
    else formas.push("vacia");
  }
  return formas;
};

export const etiquetaRating = (rating) =>
  Number.isFinite(rating)
    ? `Calificación ${textoRating(rating)} de ${RATING_MAXIMO}`
    : "";
