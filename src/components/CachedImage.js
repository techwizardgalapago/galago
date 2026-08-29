// Reemplazo directo de <Image> para imágenes remotas.
//
// El índice url -> ruta local vive en memoria y arranca vacío en cada apertura
// de la app, aunque los archivos sigan en disco. Por eso la resolución tiene
// que ser asíncrona: se pregunta al disco al montar y, si el archivo está, se
// cambia el uri. Sin ese cambio, en un arranque sin conexión la primera
// pintada se quedaba con la URL remota —que no carga— y la foto no aparecía
// hasta que el componente se remontaba al navegar.

import React, { useEffect, useState } from "react";
import { Image } from "react-native";
import { cacheImage, getCachedUri } from "../utils/imageCache";

export default function CachedImage({ source, ...props }) {
  const remote =
    source && typeof source === "object" && typeof source.uri === "string"
      ? source.uri
      : null;

  // Si ya se resolvió antes en esta sesión, se parte del archivo local y no
  // llega a pintarse la URL remota.
  const [localUri, setLocalUri] = useState(() =>
    remote ? getCachedUri(remote) : null
  );

  useEffect(() => {
    if (!remote) {
      setLocalUri(null);
      return;
    }

    const conocido = getCachedUri(remote);
    if (conocido) {
      setLocalUri(conocido);
      return;
    }

    let vivo = true;
    // Encuentra el archivo si ya estaba en disco de una sesión anterior, y si
    // no lo está lo descarga. En ambos casos devuelve la ruta local.
    cacheImage(remote).then((ruta) => {
      if (vivo && ruta) setLocalUri(ruta);
    });
    return () => {
      vivo = false;
    };
  }, [remote]);

  const resolved = remote && localUri ? { ...source, uri: localUri } : source;

  return <Image source={resolved} {...props} />;
}
