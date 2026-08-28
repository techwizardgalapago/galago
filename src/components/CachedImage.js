// Reemplazo directo de <Image> para imágenes remotas.
//
// Si el archivo ya está en disco, se pinta desde ahí: eso es lo que hace que
// aparezca sin conexión. Si no lo está, se usa la URL remota y se descarga en
// segundo plano SIN cambiar el uri, para no provocar un parpadeo a mitad de
// render; la copia queda lista para la próxima vez que se abra la app.

import React, { useEffect, useMemo } from "react";
import { Image } from "react-native";
import { cacheImage, getCachedUri } from "../utils/imageCache";

export default function CachedImage({ source, ...props }) {
  const remote =
    source && typeof source === "object" && typeof source.uri === "string"
      ? source.uri
      : null;

  const resolved = useMemo(() => {
    if (!remote) return source;
    const local = getCachedUri(remote);
    return local ? { ...source, uri: local } : source;
  }, [remote, source]);

  useEffect(() => {
    if (!remote || getCachedUri(remote)) return;
    cacheImage(remote); // best-effort: sin await ni catch, no debe romper el render
  }, [remote]);

  return <Image source={resolved} {...props} />;
}
