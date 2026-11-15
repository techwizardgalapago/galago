// Traduce un error de red a algo que la persona pueda leer y actuar.
//
// Por que hace falta: las pantallas mostraban un 'No se pudo guardar' seco y
// tiraban el error a la consola. Cuando a alguien le fallo subir fotos de su
// negocio, el mensaje no decia nada: ni que la conexion se habia cortado, ni
// que el archivo era demasiado grande, ni el motivo que el backend ya manda
// escrito ("Solo se admiten imagenes", "admite como maximo 6 imagenes...").
//
// El backend responde con el formato de boom: { statusCode, error, message }.

const MENSAJE_POR_ESTADO = {
  401: "Tu sesion caduco. Vuelve a entrar e intentalo otra vez.",
  403: "No tienes permiso para hacer este cambio.",
  404: "El registro ya no existe. Puede que se haya borrado.",
  // 413 lo devuelve el servidor web, no la API, asi que no trae mensaje.
  413: "Las fotos pesan demasiado para enviarlas juntas. Prueba a subirlas de una en una, o con fotos mas livianas.",
  429: "Demasiadas peticiones seguidas. Espera un momento y reintenta.",
};

export const mensajeDeError = (error, respaldo = "No se pudo guardar") => {
  // Lo que el backend dice de si mismo manda sobre cualquier texto nuestro:
  // conoce el motivo exacto.
  const delServidor = error?.response?.data?.message;
  if (typeof delServidor === "string" && delServidor.trim()) {
    return delServidor;
  }

  const estado = error?.response?.status;
  if (estado && MENSAJE_POR_ESTADO[estado]) {
    return MENSAJE_POR_ESTADO[estado];
  }

  // Sin respuesta: o se agoto el tiempo, o no hubo red. Se distingue porque
  // son dos arreglos distintos para quien lo lee: esperar y reintentar, o
  // revisar la conexion.
  if (error?.code === "ECONNABORTED" || error?.code === "ETIMEDOUT") {
    return "La subida tardo demasiado y se cancelo. Con una conexion lenta, prueba a subir menos fotos a la vez.";
  }
  if (!error?.response) {
    return "No se pudo conectar con el servidor. Revisa tu conexion e intentalo de nuevo.";
  }

  if (estado >= 500) {
    return "El servidor tuvo un problema. Intentalo de nuevo en un momento.";
  }

  return respaldo;
};
