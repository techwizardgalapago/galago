const {
  RATING_MAXIMO,
  RATING_PROVISIONAL,
  ratingDeVenue,
  conteoDeVenue,
  esProvisional,
  textoRating,
  formasDeEstrellas,
  etiquetaRating,
} = require("../../src/features/venues/rating");

// Lo que Airtable devuelve de verdad en el rollup 'venueRating' cuando el
// local todavia no tiene ninguna valoracion publicada: no es un hueco, es un
// objeto. Comprobado contra la base real.
const ROLLUP_VACIO = { specialValue: "NaN" };

describe("ratingDeVenue", () => {
  it("usa la provisional cuando el local no trae calificacion", () => {
    expect(ratingDeVenue({ venueName: "Ahonui" })).toBe(RATING_PROVISIONAL);
    expect(ratingDeVenue({ venueRating: null })).toBe(RATING_PROVISIONAL);
    expect(ratingDeVenue(undefined)).toBe(RATING_PROVISIONAL);
  });

  it("trata el promedio vacio de Airtable como 'todavia sin nota'", () => {
    // Un AVERAGE sin nada que promediar llega como objeto, no como vacio.
    // Si esto se colara tal cual, la ficha pintaria NaN estrellas.
    expect(ratingDeVenue({ venueRating: ROLLUP_VACIO })).toBe(
      RATING_PROVISIONAL
    );
  });

  it("prefiere la calificacion real en cuanto exista", () => {
    // Lo que importa el dia que se cree el campo: el valor de verdad manda
    // sobre la provisional sin tocar ninguna pantalla.
    expect(ratingDeVenue({ venueRating: 3.4 })).toBe(3.4);
    expect(ratingDeVenue({ rating: 1 })).toBe(1);
  });

  it("entiende el numero escrito como texto, con punto o con coma", () => {
    // Airtable puede devolverlo como texto, y aqui la coma es el separador.
    expect(ratingDeVenue({ venueRating: "4.5" })).toBe(4.5);
    expect(ratingDeVenue({ venueRating: "4,5" })).toBe(4.5);
  });

  it("recorta un valor fuera de rango en vez de pintarlo", () => {
    expect(ratingDeVenue({ venueRating: 9 })).toBe(RATING_MAXIMO);
    expect(ratingDeVenue({ venueRating: -2 })).toBe(0);
  });

  it("no toma un texto sin numero por una calificacion", () => {
    expect(ratingDeVenue({ venueRating: "sin datos" })).toBe(RATING_PROVISIONAL);
    expect(ratingDeVenue({ venueRating: "" })).toBe(RATING_PROVISIONAL);
  });

  it("distingue el cero de no tener calificacion", () => {
    // Un cero es una nota, no un hueco: no se reemplaza por la provisional.
    expect(ratingDeVenue({ venueRating: 0 })).toBe(0);
  });
});

describe("textoRating", () => {
  it("escribe los enteros sin decimal", () => {
    expect(textoRating(5)).toBe("5");
    expect(textoRating(0)).toBe("0");
  });

  it("usa la coma como separador decimal", () => {
    expect(textoRating(4.5)).toBe("4,5");
    expect(textoRating(3.25)).toBe("3,3");
  });

  it("devuelve vacio si no hay numero", () => {
    expect(textoRating(null)).toBe("");
    expect(textoRating(NaN)).toBe("");
  });
});

describe("formasDeEstrellas", () => {
  it("pinta las cinco llenas con la provisional de hoy", () => {
    expect(formasDeEstrellas(RATING_PROVISIONAL)).toEqual([
      "llena",
      "llena",
      "llena",
      "llena",
      "llena",
    ]);
  });

  it("parte la estrella a la mitad", () => {
    expect(formasDeEstrellas(3.5)).toEqual([
      "llena",
      "llena",
      "llena",
      "media",
      "vacia",
    ]);
  });

  it("no pinta igual un 4,9 que un 4,5", () => {
    expect(formasDeEstrellas(4.9)).not.toEqual(formasDeEstrellas(4.5));
    expect(formasDeEstrellas(4.9)[4]).toBe("llena");
    expect(formasDeEstrellas(4.5)[4]).toBe("media");
  });

  it("deja todas vacias con cero", () => {
    expect(formasDeEstrellas(0)).toEqual([
      "vacia",
      "vacia",
      "vacia",
      "vacia",
      "vacia",
    ]);
  });

  it("devuelve siempre cinco", () => {
    [0, 1.2, 3.7, 5, 99, -4, NaN].forEach((valor) => {
      expect(formasDeEstrellas(valor)).toHaveLength(RATING_MAXIMO);
    });
  });
});


describe("conteoDeVenue", () => {
  it("cuenta las valoraciones publicadas del local", () => {
    expect(conteoDeVenue({ venueRatingCount: 12 })).toBe(12);
    expect(conteoDeVenue({ venueRatingCount: "3" })).toBe(3);
  });

  it("es cero cuando el local no tiene ninguna", () => {
    expect(conteoDeVenue({ venueRatingCount: 0 })).toBe(0);
    expect(conteoDeVenue({ venueRatingCount: ROLLUP_VACIO })).toBe(0);
    expect(conteoDeVenue({})).toBe(0);
    expect(conteoDeVenue(undefined)).toBe(0);
  });

  it("no devuelve un conteo negativo ni con decimales", () => {
    expect(conteoDeVenue({ venueRatingCount: -4 })).toBe(0);
    expect(conteoDeVenue({ venueRatingCount: 2.4 })).toBe(2);
  });
});

describe("esProvisional", () => {
  it("distingue el cinco inventado del cinco ganado", () => {
    // Los dos locales muestran 5 estrellas; solo uno lo ha merecido.
    expect(esProvisional({ venueRating: ROLLUP_VACIO, venueRatingCount: 0 })).toBe(
      true
    );
    expect(esProvisional({ venueRating: 5, venueRatingCount: 9 })).toBe(false);
  });
});

describe("etiquetaRating", () => {
  it("dice la calificacion de una vez, no cinco iconos seguidos", () => {
    expect(etiquetaRating(5)).toBe("Calificación 5 de 5");
    expect(etiquetaRating(4.5)).toBe("Calificación 4,5 de 5");
  });

  it("dice tambien cuantas personas han opinado", () => {
    expect(etiquetaRating(4.5, 12)).toBe("Calificación 4,5 de 5, 12 valoraciones");
  });

  it("no dice '1 valoraciones'", () => {
    expect(etiquetaRating(5, 1)).toBe("Calificación 5 de 5, 1 valoración");
  });

  it("calla el conteo cuando no hay ninguna", () => {
    expect(etiquetaRating(5, 0)).toBe("Calificación 5 de 5");
  });
});
