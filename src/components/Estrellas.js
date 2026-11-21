import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  formasDeEstrellas,
  textoRating,
  etiquetaRating,
} from "../features/venues/rating";

const ICONO = {
  llena: "star",
  media: "star-half",
  vacia: "star-outline",
};

// Las cinco estrellas de un local, con la nota al lado y, si se conoce,
// cuantas personas la han puesto.
//
// Las estrellas se marcan como decoracion y la etiqueta va en la fila: un
// lector de pantalla dice 'Calificacion 5 de 5' una vez, en lugar de nombrar
// cinco iconos seguidos.
export default function Estrellas({
  rating,
  size = 12,
  color = "#E65300",
  mostrarNumero = true,
  conteo = null,
}) {
  if (!Number.isFinite(rating)) return null;

  const hayConteo = Number.isFinite(conteo) && conteo > 0;

  return (
    <View
      style={styles.fila}
      accessible
      accessibilityLabel={etiquetaRating(rating, conteo)}
    >
      {formasDeEstrellas(rating).map((forma, i) => (
        <Ionicons
          // Las estrellas no se reordenan ni se quitan: la posicion las
          // identifica sin ambiguedad.
          key={i}
          name={ICONO[forma]}
          size={size}
          color={color}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      ))}
      {mostrarNumero ? (
        <Text style={[styles.numero, { color, fontSize: size }]}>
          {textoRating(rating)}
        </Text>
      ) : null}
      {hayConteo ? (
        <Text style={[styles.conteo, { color, fontSize: size }]}>
          {`(${conteo})`}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  numero: {
    fontWeight: "500",
    marginLeft: 2,
  },
  conteo: {
    // Mas tenue que la nota: acompana al promedio, no compite con el.
    fontWeight: "400",
    opacity: 0.75,
    marginLeft: 2,
  },
});
