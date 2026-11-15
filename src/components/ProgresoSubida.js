import { View, Text, StyleSheet } from "react-native";

import { textoProgreso } from "../services/progreso";

// Aviso de que la subida avanza, con barra y cifras.
//
// Por que: subir seis fotos desde Galapagos puede tardar minutos, y hasta
// ahora el boton solo decia 'Guardando…'. Sin senal de vida la subida parece
// colgada, la gente vuelve a darle a guardar y se duplica el envio.

export default function ProgresoSubida({ progreso }) {
  if (!progreso) return null;

  const porcentaje =
    progreso.fase === "preparando" ? null : progreso.porcentaje ?? null;

  return (
    <View style={styles.contenedor} accessibilityRole="progressbar">
      <Text style={styles.texto}>{textoProgreso(progreso)}</Text>
      <View style={styles.riel}>
        {/* Sin porcentaje conocido la barra se queda al 15%: indica actividad
            sin prometer un avance que no sabemos. */}
        <View
          style={[styles.relleno, { width: `${porcentaje ?? 15}%` }]}
        />
      </View>
      {porcentaje !== null && porcentaje >= 100 ? (
        <Text style={styles.nota}>Guardando en el servidor…</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { marginTop: 12, gap: 6 },
  texto: { color: "#1B2222", fontSize: 13 },
  riel: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(27,34,34,0.12)",
    overflow: "hidden",
  },
  relleno: { height: 6, borderRadius: 3, backgroundColor: "#F49DB6" },
  // Al llegar al 100% la subida termino pero el backend sigue: manda las
  // fotos a S3 y luego a Airtable. Decirlo evita que parezca atascado.
  nota: { color: "rgba(27,34,34,0.6)", fontSize: 12 },
});
