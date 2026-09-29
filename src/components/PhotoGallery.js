import { View, Text, Image, Pressable, StyleSheet } from 'react-native';

/**
 * Miniaturas de las fotos de un local o un evento.
 *
 * `guardadas` son las que ya estan en el servidor: se pueden reordenar y al
 * quitarlas se borran alli. `nuevas` son las recien elegidas y todavia sin
 * subir: quitarlas solo las saca de la seleccion.
 *
 * Las flechas de orden aparecen solo si se pasa `onMover`, asi el mismo
 * componente sirve para los formularios de creacion, donde aun no hay nada
 * guardado que reordenar.
 */
export default function PhotoGallery({
  guardadas = [],
  nuevas = [],
  onQuitarGuardada,
  onQuitarNueva,
  onMover,
  borrando = null,
  ordenando = false,
}) {
  if (guardadas.length === 0 && nuevas.length === 0) return null;

  const bloqueado = !!borrando || !!ordenando;
  const sePuedeOrdenar = !!onMover && guardadas.length > 1;

  return (
    <View style={styles.fila}>
      {guardadas.map((img, i) => (
        <View key={img.filename || img.url}>
          <Image source={{ uri: img.url }} style={styles.miniatura} resizeMode="cover" />

          {i === 0 ? (
            <View style={styles.portada}>
              <Text style={styles.portadaTexto}>Portada</Text>
            </View>
          ) : null}

          <Pressable
            onPress={() => onQuitarGuardada?.(img.filename)}
            disabled={bloqueado}
            style={styles.quitar}
          >
            <Text style={styles.quitarTexto}>
              {borrando === img.filename ? '…' : '×'}
            </Text>
          </Pressable>

          {sePuedeOrdenar ? (
            <View style={styles.barraOrden}>
              <Pressable
                onPress={() => onMover(i, i - 1)}
                disabled={i === 0 || bloqueado}
                style={styles.mover}
              >
                <Text style={[styles.moverTexto, i === 0 && styles.moverApagado]}>‹</Text>
              </Pressable>
              <Pressable
                onPress={() => onMover(i, i + 1)}
                disabled={i === guardadas.length - 1 || bloqueado}
                style={styles.mover}
              >
                <Text
                  style={[
                    styles.moverTexto,
                    i === guardadas.length - 1 && styles.moverApagado,
                  ]}
                >
                  ›
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ))}

      {nuevas.map((img) => (
        <View key={img.uri}>
          <Image
            source={{ uri: img.uri }}
            style={[styles.miniatura, guardadas.length ? styles.sinSubir : null]}
            resizeMode="cover"
          />
          <Pressable onPress={() => onQuitarNueva?.(img.uri)} style={styles.quitar}>
            <Text style={styles.quitarTexto}>×</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  miniatura: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  // Las que aun no estan subidas se distinguen de las guardadas.
  sinSubir: {
    opacity: 0.85,
  },
  portada: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  portadaTexto: {
    color: '#FDFDFC',
    fontSize: 10,
    fontWeight: '600',
  },
  quitar: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quitarTexto: {
    color: '#FDFDFC',
    fontSize: 15,
    lineHeight: 17,
    fontWeight: '600',
  },
  barraOrden: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  mover: {
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  moverTexto: {
    color: '#FDFDFC',
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '700',
  },
  moverApagado: {
    color: 'rgba(253,253,252,0.35)',
  },
});
