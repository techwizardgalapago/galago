// La calificacion de un local.
//
// 'venueRating' es un rollup de Airtable: el promedio de las valoraciones
// publicadas del local. Un local sin ninguna no trae un hueco sino el objeto
// { specialValue: 'NaN' }, que es como Airtable escribe el promedio de un
// conjunto vacio; eso cuenta como 'todavia no tiene nota'.
//
// Mientras un local no tenga valoraciones se muestra con la calificacion
// provisional, que es una decision de producto y no un dato. Para dejar de
// inventar calificaciones basta con que 'ratingDeVenue' devuelva null en vez
// de la provisional; no hay que tocar ninguna pantalla.

export const RATING_MAXIMO = 5;

// Provisional hasta que haya valoraciones de verdad.
export const RATING_PROVISIONAL = 5;

// Airtable puede devolver el numero como texto, y en castellano la coma es
// el separador decimal, asi que '4,5' tambien se entiende. Un rollup sin
// nada que promediar llega como { specialValue: 'NaN' }, que no es un
// numero: cae en el NaN final igual que un hueco.
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

// Lo que oye un lector de pantalla. El conteo es opcional porque no todas
// las pantallas lo tienen a mano, pero cuando lo hay se dice: 'cinco de
// cinco' a secas suena igual con una opinion que con cien.
export const etiquetaRating = (rating, conteo) => {
  if (!Number.isFinite(rating)) return "";
  const base = `Calificación ${textoRating(rating)} de ${RATING_MAXIMO}`;
  if (!Number.isFinite(conteo) || conteo <= 0) return base;
  return conteo === 1
    ? `${base}, 1 valoración`
    : `${base}, ${conteo} valoraciones`;
};

// Cuantas valoraciones publicadas tiene el local ('venueRatingCount', el
// segundo rollup).
//
// Sin este numero una nota de 5 puesta por una sola persona se ve igual que
// una de 5 sostenida por cien, que es justo lo que la gente quiere distinguir.
export const conteoDeVenue = (venue) => {
  const numero = comoNumero(venue?.venueRatingCount);
  if (!Number.isFinite(numero) || numero < 0) return 0;
  return Math.round(numero);
};

// Si lo que se ve es una nota de verdad o la provisional. Las pantallas que
// quieran avisar de que todavia nadie ha opinado preguntan por esto en lugar
// de comparar con el 5.
export const esProvisional = (venue) => conteoDeVenue(venue) === 0;
