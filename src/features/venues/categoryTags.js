// Tags de filtrado dentro de cada categoria de locales.
//
// Un tag casa con un local de dos formas:
//   1. Por `venueTags`, el campo de etiquetas del propio local.
//   2. Por `venueCategory`, cuando el tipo del local ya implica el tag
//      (un local de tipo "Hostal" es un "Hostales" sin necesidad de etiquetarlo).
//
// Los tags con `types: []` dependen solo del primero: describen algo que el
// tipo de local no expresa ("Happy Hour", "Buceo") o un tipo que todavia no
// existe en las opciones de Airtable ("Heladerias"). Hasta que los locales
// esten etiquetados, esos filtros no devuelven resultados.

const tag = (label, types = []) => ({ label, types });

export const CATEGORY_TAGS = {
  alimentos: [
    tag("Restaurantes", ["restaurante"]),
    tag("Cafés", ["café", "cafe"]),
    tag("Bares", ["bar"]),
    tag("Heladerías"),
  ],
  hoteles: [
    tag("Hoteles", ["hotel"]),
    tag("Hostales", ["hostal"]),
    tag("Eco-lodges"),
  ],
  actividades: [
    tag("Tours diarios"),
    tag("Buceo"),
    tag("Snorkel"),
    tag("Senderismo"),
    tag("Playas"),
    tag("Bienestar", ["spa"]),
  ],
  nocturna: [
    tag("Eventos del día"),
    tag("Música en vivo"),
    tag("Bares", ["bar"]),
    tag("Discotecas", ["club"]),
    tag("Happy Hour"),
  ],
  tiendas: [
    tag("Souvenirs", ["souvenirs"]),
    tag("Tiendas", ["tienda"]),
    tag("Supermercados"),
  ],
  informacion: [
    tag("Transporte", ["transporte"]),
    tag("Farmacias", ["farmacia"]),
    tag("Hospitales", ["hospital"]),
    tag("Bancos y cajeros", ["banco", "cajero"]),
    tag("Centros de información turística", ["informacion turistica"]),
  ],
};

export const tagsForCategory = (category) => CATEGORY_TAGS[category] ?? [];

const normalize = (value) =>
  String(value ?? "")
    // Se recorta: al partir "Musica en vivo, Happy Hour" por comas los
    // elementos quedan con el espacio de separacion pegado.
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

// Las etiquetas pueden llegar como lista (Airtable) o como texto separado por
// comas (la copia local en SQLite guarda las listas aplanadas).
const venueTagList = (venue) => {
  const raw = venue?.venueTags;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") return raw.split(",");
  return [];
};

export const venueMatchesTag = (venue, tagDef) => {
  if (!tagDef) return false;

  const objetivo = normalize(tagDef.label);
  if (venueTagList(venue).some((t) => normalize(t) === objetivo)) return true;

  const categoria = normalize(venue?.venueCategory);
  return (tagDef.types ?? []).some((t) => categoria.includes(normalize(t)));
};

// Sin tags seleccionados no se filtra. Con varios, basta con que cumpla uno:
// dentro de una categoria los tags son alternativas, no condiciones que sumar.
export const venueMatchesTags = (venue, tagDefs = []) =>
  tagDefs.length === 0 || tagDefs.some((t) => venueMatchesTag(venue, t));
