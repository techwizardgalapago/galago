// Convierte los banners que entrega diseno en las mascotas de las fichas.
//
// Lo que llega es el post completo de 1080x1080: fondo de color, el gosito y
// el titulo de la categoria en trazados. Para la ficha hace falta solo el
// gosito, recortado, porque la tarjeta ya pone su propio degradado y su
// propia etiqueta. Puesto entero, el dibujo ocupa el 22% del lienzo y saldria
// de unos 37 de alto con un rectangulo de color tapando el degradado.
//
// Tres pasos: quitar los grupos Fondos y Curvas, pasar las clases del
// bloque <style> a atributos, y recortar el viewBox al dibujo. El recorte se
// mide de verdad: se rasteriza sobre magenta con qlmanage y se busca el
// primer pixel que no lo sea, que es mas fiable que interpretar los trazados.
//
// Uso:
//   node scripts/convertir-gositos.mjs <carpeta-temporal> <origen> <destino>
//
// El reparto esta en MAPA, mas abajo. Al llegar el de Tiendas y Souvenirs,
// se anade ahi una linea y se importa en src/app/(tabs)/locales/index.js.

import fs from "fs";
import zlib from "zlib";
import { execFileSync } from "child_process";

const TRABAJO = process.argv[2];
const ORIGEN = process.argv[3];
const DESTINO = process.argv[4];

// --- Quitar un grupo por id, contando anidamiento ---
const quitarGrupo = (texto, id) => {
  const inicio = texto.indexOf(`<g id="${id}"`);
  if (inicio === -1) return texto;
  let i = texto.indexOf(">", inicio) + 1;
  let nivel = 1;
  while (nivel > 0) {
    const abre = texto.indexOf("<g", i);
    const cierra = texto.indexOf("</g>", i);
    if (cierra === -1) break;
    if (abre !== -1 && abre < cierra) { nivel += 1; i = abre + 2; }
    else { nivel -= 1; i = cierra + 4; }
  }
  return texto.slice(0, inicio) + texto.slice(i);
};

// --- Clases CSS a atributos ---
const inlineCss = (svg) => {
  const bloque = svg.match(/<style>([\s\S]*?)<\/style>/);
  const porClase = new Map();
  if (bloque) {
    const regla = /([^{}]+)\{([^{}]*)\}/g;
    let m;
    while ((m = regla.exec(bloque[1]))) {
      const sels = m[1].split(",").map((s) => s.trim()).filter(Boolean);
      const decls = m[2].split(";").map((d) => d.trim()).filter(Boolean);
      for (const sel of sels) {
        if (!sel.startsWith(".")) continue;
        const c = sel.slice(1);
        if (!porClase.has(c)) porClase.set(c, new Map());
        for (const d of decls) {
          const i = d.indexOf(":");
          porClase.get(c).set(d.slice(0, i).trim(), d.slice(i + 1).trim());
        }
      }
    }
    svg = svg.replace(/<style>[\s\S]*?<\/style>/, "");
  }
  return svg.replace(/\sclass="([^"]+)"/g, (_, clases) => {
    const props = new Map();
    for (const c of clases.split(/\s+/)) {
      const decl = porClase.get(c);
      if (decl) for (const [k, v] of decl) props.set(k, v);
    }
    return props.size ? " " + [...props].map(([k, v]) => `${k}="${v}"`).join(" ") : "";
  });
};

// --- Decodificar PNG (RGB/RGBA 8 bits) y medir el recuadro del dibujo ---
const bbox = (ruta) => {
  const d = fs.readFileSync(ruta);
  let pos = 8, idat = [], w, h, color, prof;
  while (pos < d.length) {
    const ln = d.readUInt32BE(pos), t = d.toString("ascii", pos + 4, pos + 8);
    if (t === "IHDR") { w = d.readUInt32BE(pos + 8); h = d.readUInt32BE(pos + 12); prof = d[pos + 16]; color = d[pos + 17]; }
    if (t === "IDAT") idat.push(d.subarray(pos + 8, pos + 8 + ln));
    pos += 12 + ln;
  }
  if (prof !== 8 || (color !== 2 && color !== 6)) throw new Error(`png no soportado prof=${prof} color=${color}`);
  const ch = color === 6 ? 4 : 3, fila = w * ch;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  let p = 0, prev = Buffer.alloc(fila), x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    const f = raw[p++], l = Buffer.from(raw.subarray(p, p + fila)); p += fila;
    for (let i = 0; i < fila; i++) {
      const a = i >= ch ? l[i - ch] : 0, b = prev[i], c = i >= ch ? prev[i - ch] : 0;
      if (f === 1) l[i] = (l[i] + a) & 255;
      else if (f === 2) l[i] = (l[i] + b) & 255;
      else if (f === 3) l[i] = (l[i] + ((a + b) >> 1)) & 255;
      else if (f === 4) {
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        l[i] = (l[i] + ((pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c))) & 255;
      }
    }
    for (let x = 0; x < w; x++) {
      const o = x * ch;
      if (!(l[o] > 230 && l[o + 1] < 40 && l[o + 2] > 230)) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    prev = l;
  }
  return { x0, y0, x1, y1, w, h };
};

const MAPA = {
  "BannersMasterSinFondo-01.svg": "go-alimentos",
  "BannersMasterSinFondo-02.svg": "go-hoteles",
  "BannersMasterSinFondo-03.svg": "go-actividades",
  "BannersMasterSinFondo-04.svg": "go-nocturna",
  "BannersMasterSinFondo-05.svg": "go-informacion",
};

for (const [archivo, nombre] of Object.entries(MAPA)) {
  let svg = fs.readFileSync(`${ORIGEN}/${archivo}`, "utf8");
  const antes = svg.length;
  svg = quitarGrupo(svg, "Fondos");
  svg = quitarGrupo(svg, "Curvas");
  svg = inlineCss(svg);
  svg = svg.replace(/<linearGradient id="linear-gradient"[\s\S]*?<\/linearGradient>\s*/g, "");
  svg = svg.replace(/\n\s*\n/g, "\n");

  // Medir: mismo dibujo sobre magenta, rasterizado a 1080.
  const medir = `${TRABAJO}/_medir-${nombre}.svg`;
  fs.writeFileSync(medir, svg.replace(/(<svg[^>]*>)/, '$1<rect x="0" y="0" width="1080" height="1080" fill="#FF00FF"/>'));
  try { fs.unlinkSync(`${TRABAJO}/_medir-${nombre}.svg.png`); } catch {}
  execFileSync("qlmanage", ["-t", "-s", "1080", "-o", TRABAJO, medir], { stdio: "ignore" });
  const b = bbox(`${TRABAJO}/_medir-${nombre}.svg.png`);
  const esc = 1080 / b.w;
  const M = 3; // margen para que el trazo no se corte
  const vx = Math.max(0, Math.round(b.x0 * esc) - M);
  const vy = Math.max(0, Math.round(b.y0 * esc) - M);
  const vw = Math.min(1080 - vx, Math.round((b.x1 - b.x0 + 1) * esc) + M * 2);
  const vh = Math.min(1080 - vy, Math.round((b.y1 - b.y0 + 1) * esc) + M * 2);

  svg = svg.replace(/viewBox="0 0 1080 1080"/, `viewBox="${vx} ${vy} ${vw} ${vh}"`);
  fs.writeFileSync(`${DESTINO}/${nombre}.svg`, svg);
  console.log(
    `${nombre.padEnd(16)} ${String(vw).padStart(4)}x${String(vh).padEnd(4)} ` +
    `(${((vw * vh) / (1080 * 1080) * 100).toFixed(0).padStart(2)}% del lienzo)  ` +
    `${(antes / 1024).toFixed(1)}KB -> ${(svg.length / 1024).toFixed(1)}KB`
  );
}
