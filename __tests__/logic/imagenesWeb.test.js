const {
  necesitaReducir,
  medidasReducidas,
  LADO_MAX,
  UMBRAL_BYTES,
} = require("../../src/services/imagenesWeb");

// El dibujado en canvas no se puede ejercitar sin navegador, asi que se prueba
// la parte que decide: a quien se toca y a que medidas. Es donde estan las
// decisiones que pueden estropear una foto.

const archivo = (size, type = "image/jpeg") => ({ size, type });

describe("necesitaReducir", () => {
  it("no toca lo que ya es liviano", () => {
    // Un logo o una foto ya optimizada solo pierde al recomprimirse.
    expect(necesitaReducir(archivo(200 * 1024))).toBe(false);
    expect(necesitaReducir(archivo(UMBRAL_BYTES))).toBe(false);
  });

  it("reduce una foto de celular", () => {
    expect(necesitaReducir(archivo(4 * 1024 * 1024))).toBe(true);
    expect(necesitaReducir(archivo(UMBRAL_BYTES + 1))).toBe(true);
  });

  it("no se mete con formatos que no sabe rehacer", () => {
    // Un HEIC o un PDF se suben tal cual; el backend ya rechaza lo que no
    // sea imagen.
    expect(necesitaReducir(archivo(5 * 1024 * 1024, "image/heic"))).toBe(false);
    expect(necesitaReducir(archivo(5 * 1024 * 1024, "application/pdf"))).toBe(
      false
    );
  });

  it("admite png y webp, no solo jpeg", () => {
    expect(necesitaReducir(archivo(2 * 1024 * 1024, "image/png"))).toBe(true);
    expect(necesitaReducir(archivo(2 * 1024 * 1024, "image/webp"))).toBe(true);
  });

  it("no se rompe sin archivo o sin tamano", () => {
    expect(necesitaReducir(null)).toBe(false);
    expect(necesitaReducir(undefined)).toBe(false);
    expect(necesitaReducir({ type: "image/jpeg" })).toBe(false);
  });
});

describe("medidasReducidas", () => {
  it("deja igual lo que ya cabe", () => {
    expect(medidasReducidas(800, 600)).toEqual({ ancho: 800, alto: 600 });
    expect(medidasReducidas(LADO_MAX, 900)).toEqual({
      ancho: LADO_MAX,
      alto: 900,
    });
  });

  it("limita el lado largo y conserva la proporcion", () => {
    const { ancho, alto } = medidasReducidas(4000, 3000);
    expect(ancho).toBe(LADO_MAX);
    expect(alto).toBe(Math.round((LADO_MAX * 3000) / 4000));
    expect(ancho / alto).toBeCloseTo(4000 / 3000, 2);
  });

  it("funciona igual en vertical", () => {
    const { ancho, alto } = medidasReducidas(3000, 4000);
    expect(alto).toBe(LADO_MAX);
    expect(ancho).toBeLessThan(LADO_MAX);
  });

  it("deja al menos un pixel en imagenes muy alargadas", () => {
    const { ancho, alto } = medidasReducidas(20000, 5);
    expect(ancho).toBe(LADO_MAX);
    expect(alto).toBeGreaterThanOrEqual(1);
  });

  it("el lado maximo da de sobra para como se muestran las fotos", () => {
    // La foto se pinta como maximo a 560 px de ancho, en el detalle de un
    // local en escritorio. Incluso al doble por una pantalla retina sobra.
    expect(LADO_MAX).toBeGreaterThanOrEqual(560 * 2);
  });
});
