const { progresoAxios, textoProgreso } = require("../../src/services/progreso");

describe("progresoAxios", () => {
  it("no estorba cuando nadie escucha", () => {
    expect(progresoAxios(undefined)).toBeUndefined();
    expect(progresoAxios(null)).toBeUndefined();
  });

  it("traduce el evento de axios a porcentaje", () => {
    const visto = [];
    progresoAxios((p) => visto.push(p))({ loaded: 512, total: 2048 });
    expect(visto[0]).toEqual({ enviados: 512, total: 2048, porcentaje: 25 });
  });

  it("sin total no inventa un porcentaje", () => {
    // En nativo el tamano del cuerpo no siempre se sabe.
    const visto = [];
    progresoAxios((p) => visto.push(p))({ loaded: 1000 });
    expect(visto[0].porcentaje).toBeNull();
    expect(visto[0].enviados).toBe(1000);
  });

  it("no pasa del 100 aunque el evento se exceda", () => {
    const visto = [];
    progresoAxios((p) => visto.push(p))({ loaded: 3000, total: 2048 });
    expect(visto[0].porcentaje).toBe(100);
  });
});

describe("textoProgreso", () => {
  it("no dice nada si no hay subida en curso", () => {
    expect(textoProgreso(null)).toBe("");
  });

  it("avisa mientras prepara las fotos", () => {
    expect(textoProgreso({ fase: "preparando" })).toMatch(/preparando/i);
  });

  it("muestra porcentaje y tamanos en megas", () => {
    const texto = textoProgreso({
      fase: "subiendo",
      porcentaje: 40,
      enviados: 2 * 1024 * 1024,
      total: 5 * 1024 * 1024,
    });
    expect(texto).toMatch(/40%/);
    expect(texto).toMatch(/2,0 MB/);
    expect(texto).toMatch(/5,0 MB/);
  });

  it("usa KB cuando aun no llega a un mega", () => {
    const texto = textoProgreso({
      fase: "subiendo",
      porcentaje: 10,
      enviados: 300 * 1024,
      total: 900 * 1024,
    });
    expect(texto).toMatch(/300 KB/);
    expect(texto).not.toMatch(/MB/);
  });

  it("sin total dice lo enviado, para demostrar que avanza", () => {
    const texto = textoProgreso({
      fase: "subiendo",
      porcentaje: null,
      enviados: 1024 * 1024,
      total: 0,
    });
    expect(texto).toMatch(/1,0 MB/);
    expect(texto).not.toMatch(/%/);
  });
});
