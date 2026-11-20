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

// Las cinco estrellas de un local, con la nota al lado.
//
// Las estrellas se marcan como decoracion y la etiqueta va en la fila: un
// lector de pantalla dice 'Calificacion 5 de 5' una vez, en lugar de nombrar
// cinco iconos seguidos.
export default function Estrellas({
  rating,
  size = 12,
  color = "#E65300",
  mostrarNumero = true,
}) {
  if (!Number.isFinite(rating)) return null;

  return (
    <View
      style={styles.fila}
      accessible
      accessibilityLabel={etiquetaRating(rating)}
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
});
