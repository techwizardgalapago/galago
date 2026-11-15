// Reduce una foto en el navegador antes de subirla.
//
// Por que hace falta: en web el selector de archivos entrega el archivo tal
// cual (el `quality` de expo-image-picker no se aplica ahi), asi que una foto
// de celular sale de 3 a 8 MB. Seis de esas en un solo envio no llegan: nginx
// corta el cuerpo y la subida muere antes de que el backend la vea.
//
// Cuanto reducir: la foto se muestra como maximo a 560 px de ancho, en el
// detalle de un local en escritorio. 1600 px de lado largo deja casi el triple
// de lo que la pantalla puede usar, y mas del doble en una pantalla retina,
// asi que no se nota en calidad y pesa una fraccion.

export const LADO_MAX = 1600;

// Por debajo de esto no se toca nada. Un logo, un PNG con transparencia o una
// foto ya optimizada no ganan nada al recomprimirse, y si pierden: convertir
// un PNG transparente a JPEG le pone un fondo, y recomprimir un JPEG vuelve a
// degradarlo. Mas vale dejar en paz lo que ya es liviano.
export const UMBRAL_BYTES = 600 * 1024;

const CALIDAD_JPEG = 0.85;

const TIPOS = new Set(["image/jpeg", "image/png", "image/webp"]);

// Decision separada del dibujado para poder probarla sin un navegador.
export const necesitaReducir = (archivo) => {
  if (!archivo) return false;
  if (typeof archivo.size !== "number" || archivo.size <= UMBRAL_BYTES) {
    return false;
  }
  return TIPOS.has(archivo.type);
};

export const medidasReducidas = (ancho, alto, ladoMax = LADO_MAX) => {
  const lado = Math.max(ancho, alto);
  if (!lado || lado <= ladoMax) return { ancho, alto };
  const factor = ladoMax / lado;
  // Se redondea hacia arriba para no quedar en 0 con imagenes muy alargadas.
  return {
    ancho: Math.max(1, Math.round(ancho * factor)),
    alto: Math.max(1, Math.round(alto * factor)),
  };
};

// Las fotos de celular guardan la rotacion en los metadatos EXIF en vez de
// girar los pixeles. Al dibujar en un canvas esa rotacion se pierde y la foto
// sale tumbada, asi que se pide que se aplique al decodificar.
const decodificar = async (blob) => {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob, { imageOrientation: "from-image" });
    } catch {
      // Safari viejo no acepta el segundo argumento.
      try {
        return await createImageBitmap(blob);
      } catch {
        return null;
      }
    }
  }
  return null;
};

export const reducirImagen = async (archivo, nombre) => {
  const nombreFinal = nombre || archivo?.name || "foto.jpg";
  if (!necesitaReducir(archivo)) return archivo;

  // Sin canvas o sin decodificador no se intenta nada: se sube el original,
  // que es lo que pasaba antes. Reducir es una mejora, no un requisito.
  if (typeof document === "undefined" || typeof File === "undefined") {
    return archivo;
  }

  const bitmap = await decodificar(archivo);
  if (!bitmap) return archivo;

  try {
    const { ancho, alto } = medidasReducidas(bitmap.width, bitmap.height);
    // Un PNG puede llevar transparencia, y pasarlo a JPEG le pondria un fondo
    // negro. Se conserva el formato; aun asi adelgaza, porque la reduccion de
    // medidas ya quita la mayor parte de los pixeles.
    const esPng = archivo.type === "image/png";

    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext("2d");
    if (!ctx) return archivo;
    ctx.drawImage(bitmap, 0, 0, ancho, alto);

    const tipo = esPng ? "image/png" : "image/jpeg";
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, tipo, esPng ? undefined : CALIDAD_JPEG)
    );
    if (!blob) return archivo;

    // Si el resultado no adelgaza (pasa con PNG ya optimizados), se queda el
    // original: no tiene sentido cambiar una imagen por otra igual o peor.
    if (blob.size >= archivo.size) return archivo;

    return new File([blob], nombreFinal, { type: tipo });
  } finally {
    bitmap.close?.();
  }
};
