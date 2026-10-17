import { useRef, useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import CachedImage from './CachedImage';

/**
 * Pasa una a una las fotos de un local o un evento.
 *
 * `images` son objetos `{ url, filename }`, tal como los devuelve
 * `parseAttachmentImages`. Si viene vacio se pinta `vacio`.
 *
 * El paso se mide con `onLayout` en vez de darlo por sabido: estas pantallas
 * dimensionan el contenedor como porcentaje del ancho que les toque, que no se
 * conoce hasta que se coloca.
 */
export default function PhotoCarousel({
  images = [],
  style,
  imageStyle,
  vacio = null,
}) {
  const scrollRef = useRef(null);
  const [indice, setIndice] = useState(0);
  const [ancho, setAncho] = useState(0);

  const irA = (destino) => {
    if (images.length < 2 || !ancho) return;
    const i = (destino + images.length) % images.length;
    setIndice(i);
    scrollRef.current?.scrollTo({ x: i * ancho, animated: true });
  };

  const hayVarias = images.length > 1;

  return (
    <View
      style={style}
      onLayout={(e) => setAncho(e.nativeEvent.layout.width)}
    >
      {images.length ? (
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          scrollEnabled={hayVarias}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            if (!ancho) return;
            setIndice(Math.round(e.nativeEvent.contentOffset.x / ancho));
          }}
        >
          {images.map((img, i) => (
            <CachedImage
              key={img.filename || img.url || i}
              source={{ uri: img.url }}
              style={[imageStyle, ancho ? { width: ancho } : null]}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      ) : (
        vacio
      )}

      {hayVarias && indice < images.length - 1 ? (
        <Pressable style={styles.flechaDerecha} onPress={() => irA(indice + 1)}>
          <Ionicons name="chevron-forward" size={20} color="#FDFDFC" />
        </Pressable>
      ) : null}

      {hayVarias && indice > 0 ? (
        <Pressable style={styles.flechaIzquierda} onPress={() => irA(indice - 1)}>
          <Ionicons name="chevron-back" size={20} color="#FDFDFC" />
        </Pressable>
      ) : null}

      {hayVarias ? (
        <View style={styles.puntos}>
          {images.map((img, i) => (
            <View
              key={img.filename || img.url || i}
              style={[styles.punto, i === indice && styles.puntoActivo]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const flecha = {
  position: 'absolute',
  top: '50%',
  marginTop: -16,
  width: 32,
  height: 32,
  borderRadius: 16,
  backgroundColor: 'rgba(0,0,0,0.35)',
  alignItems: 'center',
  justifyContent: 'center',
};

const styles = StyleSheet.create({
  flechaDerecha: { ...flecha, right: 12 },
  flechaIzquierda: { ...flecha, left: 12 },
  // Indican cuantas fotos hay: sin ellos, con la flecha oculta en el ultimo
  // paso no se sabe si quedan mas.
  puntos: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  punto: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(253,253,252,0.5)',
  },
  puntoActivo: {
    backgroundColor: '#FDFDFC',
  },
});
