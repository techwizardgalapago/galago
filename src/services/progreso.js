// Progreso de una subida: el calculo y el texto, sin nada de interfaz.
//
// Va aparte del componente para que se pueda probar en el proyecto de tests
// 'logic', que es node puro y no transforma JSX.

// Adapta el evento de progreso de axios a algo que una pantalla pueda pintar.
//
// `total` no siempre viene: depende de que se pueda medir el cuerpo, y en
// nativo a veces no se sabe. Sin total no hay porcentaje, pero si se sabe
// cuanto se ha enviado, que ya sirve para demostrar que la subida avanza.
export const progresoAxios = (onProgreso) => {
  if (typeof onProgreso !== "function") return undefined;
  return (evento) => {
    const total = evento?.total || 0;
    const enviados = evento?.loaded || 0;
    onProgreso({
      enviados,
      total,
      porcentaje: total
        ? Math.min(100, Math.round((enviados / total) * 100))
        : null,
    });
  };
};

const kb = 1024;

export const comoTamano = (bytes) => {
  if (!bytes) return "";
  const mb = bytes / (kb * kb);
  if (mb >= 1) return `${mb.toFixed(1).replace(".", ",")} MB`;
  return `${Math.round(bytes / kb)} KB`;
};

export const textoProgreso = (progreso) => {
  if (!progreso) return "";
  if (progreso.fase === "preparando") return "Preparando las fotos…";
  // Sin total no hay porcentaje, pero lo enviado ya demuestra que avanza.
  if (!progreso.total) {
    return progreso.enviados
      ? `Subiendo fotos… ${comoTamano(progreso.enviados)} enviados`
      : "Subiendo fotos…";
  }
  return `Subiendo fotos… ${progreso.porcentaje}% (${comoTamano(
    progreso.enviados
  )} de ${comoTamano(progreso.total)})`;
};
