import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  Platform,
  Linking,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const parseTags = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch (_) {}
    }
    return trimmed.split(",").map((t) => t.trim()).filter(Boolean);
  }
  return [];
};

const getImageUrl = (value) => {
  if (!value) return "";
  if (Array.isArray(value)) return value[0]?.url || "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed[0]?.url || "";
      } catch (_) {
        return trimmed;
      }
    }
    return trimmed;
  }
  return "";
};

const formatTimeValue = (value) => {
  if (!value) return "";
  if (typeof value === "string") {
    const match = value.match(/(\d{2}:\d{2})/);
    if (match) return match[1];
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(11, 16);
};

const formatTimeRange = (event) => {
  const start = formatTimeValue(event.startTime);
  const end = formatTimeValue(event.endTime);
  if (start && end) return `${start} - ${end}`;
  return start || end || "";
};

const formatDayDate = (startTime) => {
  if (!startTime) return "";
  const date = new Date(startTime);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
};

const INFO_ROWS = [
  { label: "día", getValue: (e) => formatDayDate(e.startTime) },
  { label: "hora", getValue: (e) => formatTimeRange(e), highlight: true },
  { label: "lugar", getValue: (e) => e.eventVenueName || "", isVenue: true },
  { label: "dirección", getValue: (e) => e.direccionVenues || "" },
  {
    label: "precio",
    getValue: (e) =>
      e.eventPrice ? `$${Number(e.eventPrice).toFixed(2)}` : "Gratis",
    highlight: true,
  },
  { label: "Organiza", getValue: (e) => e.organizador || "" },
];

export default function EventDetailScreen() {
  const { eventID } = useLocalSearchParams();
  const allEvents = useSelector((state) => state.events.list);
  const event = allEvents.find((e) => e.eventID === eventID);

  if (!event) {
    return (
      <View style={styles.notFound}>
        <Text>Evento no encontrado</Text>
      </View>
    );
  }

  const imageUrl = getImageUrl(event.eventImage);
  const tags = parseTags(event.eventTags);
  const category = tags[0]?.replace(/^#/, "").toUpperCase() || "";

  const shareOnWhatsApp = () => {
    const msg = `${event.eventName} - ${formatTimeRange(event)}${event.eventVenueName ? ` en ${event.eventVenueName}` : ""}`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`);
  };

  return (
    <LinearGradient
      colors={["#ED8924", "#009CAD", "#904CCC"]}
      start={{ x: 0.85, y: 0 }}
      end={{ x: 0.15, y: 1 }}
      style={styles.background}
    >
      {/* Action bar — absolute, above the card */}
      <View style={styles.actionBar}>
        <Pressable style={styles.circleBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1B2222" />
        </Pressable>
        <View style={styles.rightActions}>
          <Pressable style={[styles.circleBtn, styles.circleBtnBlue]}>
            <Ionicons name="bookmark-outline" size={22} color="#FDFDFC" />
          </Pressable>
          <Pressable
            style={[styles.circleBtn, styles.circleBtnGreen]}
            onPress={shareOnWhatsApp}
          >
            <Ionicons name="logo-whatsapp" size={22} color="#FDFDFC" />
          </Pressable>
          <Pressable style={[styles.circleBtn, styles.circleBtnOrange]}>
            <Ionicons name="share-outline" size={22} color="#FDFDFC" />
          </Pressable>
        </View>
      </View>

      {/* White card */}
      <View style={styles.card}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.imageRing}>
              <LinearGradient
                colors={["#F38FBB", "#FAA7CC"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ringGradient}
              />
              <View style={styles.imageInner}>
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.eventImage} />
                ) : (
                  <View style={[styles.eventImage, styles.imageFallback]} />
                )}
              </View>
            </View>
            <Text style={styles.eventTitle}>{event.eventName}</Text>
            {category ? (
              <Text style={styles.eventCategory}>{category}</Text>
            ) : null}
          </View>

          {/* Tags */}
          {tags.length > 0 && (
            <View style={styles.tagsRow}>
              {tags.map((tag) => (
                <View key={tag} style={styles.tagPill}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Info table */}
          <View style={styles.tableWrapper}>
            <View style={styles.table}>
              {INFO_ROWS.map((row, index) => {
                const value = row.getValue(event);
                if (!value) return null;
                const isShaded = index % 2 === 1;
                return (
                  <View
                    key={row.label}
                    style={[
                      styles.tableRow,
                      isShaded && styles.tableRowShaded,
                      index === 0 && styles.tableRowFirst,
                    ]}
                  >
                    <View style={styles.tableCell}>
                      <Text style={styles.tableLabel}>{row.label}</Text>
                    </View>
                    <View style={[styles.tableCell, styles.tableCellValue]}>
                      <Text
                        style={[
                          styles.tableValue,
                          row.isVenue && styles.tableValueVenue,
                        ]}
                      >
                        {value}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Description */}
          {event.eventDescription ? (
            <View style={styles.descSection}>
              <Text style={styles.descHeading}>descripción</Text>
              <Text style={styles.descBody}>{event.eventDescription}</Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 44 : 24,
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 30,
    paddingVertical: 14,
  },
  circleBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#EDEDEC",
    alignItems: "center",
    justifyContent: "center",
  },
  circleBtnBlue: { backgroundColor: "#0068AD" },
  circleBtnGreen: { backgroundColor: "#259D4E" },
  circleBtnOrange: { backgroundColor: "#F26719" },
  rightActions: {
    flexDirection: "row",
    gap: 17,
  },
  card: {
    flex: 1,
    backgroundColor: "#FDFDFC",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  scrollContent: {
    paddingTop: 33,
    paddingBottom: 40,
    gap: 24,
  },
  header: {
    alignItems: "center",
    gap: 24,
    paddingHorizontal: 30,
  },
  imageRing: {
    width: 63,
    height: 63,
    alignItems: "center",
    justifyContent: "center",
  },
  ringGradient: {
    position: "absolute",
    width: 63,
    height: 63,
    borderRadius: 31.5,
    borderWidth: 1.5,
    borderColor: "#1B2222",
  },
  imageInner: {
    width: 57,
    height: 57,
    borderRadius: 28.5,
    overflow: "hidden",
    backgroundColor: "#DDE1E1",
  },
  eventImage: {
    width: "100%",
    height: "100%",
  },
  imageFallback: {
    backgroundColor: "#DDE1E1",
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1B2222",
    textAlign: "center",
  },
  eventCategory: {
    fontSize: 14,
    color: "#8F8F90",
    textAlign: "center",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: 30,
    gap: 8,
  },
  tagPill: {
    backgroundColor: "rgba(230,83,0,0.1)",
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 0,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#E65300",
    lineHeight: 26,
  },
  tableWrapper: {
    paddingHorizontal: 30,
  },
  table: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D5D6D6",
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#D5D6D6",
  },
  tableRowFirst: {
    borderTopWidth: 0,
  },
  tableRowShaded: {
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  tableCell: {
    width: "35%",
    padding: 10,
    paddingHorizontal: 12,
  },
  tableCellValue: {
    width: "65%",
    borderLeftWidth: 1,
    borderLeftColor: "#D5D6D6",
  },
  tableLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
  },
  tableValue: {
    fontSize: 14,
    fontWeight: "300",
    color: "#000000",
  },
  tableValueVenue: {
    color: "#0063A5",
  },
  descSection: {
    paddingHorizontal: 30,
    gap: 16,
  },
  descHeading: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1B2222",
  },
  descBody: {
    fontSize: 14,
    fontWeight: "300",
    color: "#1B2222",
    lineHeight: 16,
  },
});
