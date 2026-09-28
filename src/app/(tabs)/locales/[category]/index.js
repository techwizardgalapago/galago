import { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Animated,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  Modal,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { useMedia } from "../../../../hooks/useMedia";
import { useVenues } from "../../../../hooks/useVenues";
import PlaceCard from "../../../../components/profile/PlaceCard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabBarInset } from "../../../../hooks/useTabBarInset";
import {
  tagsForCategory,
  venueMatchesTags,
} from "../../../../features/venues/categoryTags";

// -------- Constantes --------

const ISLANDS = ["Todo", "San Cristóbal", "Isabela", "Santa Cruz"];
// Isla con la que arranca la pantalla cuando no llega ninguna en la URL.
const ISLA_POR_DEFECTO = "San Cristóbal";

// Mapeo categoría-key → valores de venueCategory
const CATEGORY_VENUE_TYPES = {
  alimentos: ["restaurante", "café", "cafe", "bar"],
  hoteles: ["hotel", "hostal", "alojamiento", "hospedaje"],
  actividades: ["teatro", "spa", "museo", "centro turistico", "casa cultural", "parque", "otro"],
  nocturna: ["club", "bar"],
  tiendas: ["tienda", "souvenirs"],
};

const CATEGORY_LABELS = {
  alimentos: "Alimentos y Bebidas",
  hoteles: "Hoteles y Alojamientos",
  actividades: "Actividades y Bienestar",
  nocturna: "Vida Nocturna",
  tiendas: "Tiendas y Souvenirs",
};

const normalizeToken = (value) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const getImageUrl = (value) => {
  if (!value) return "";
  if (Array.isArray(value)) return value[0]?.url || "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed[0]?.url || "";
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }
  return "";
};

// -------- Pantalla --------

export default function VenueListScreen() {
  const tabBarInset = useTabBarInset();
  // La cabecera va bajo la barra de estado y la Dynamic Island: sin esto
  // el titulo queda cortado. El minimo conserva el espaciado que ya tenia
  // en pantallas sin muesca.
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, 34);
  const { isMobile } = useMedia();
  const { category, island } = useLocalSearchParams();
  const { venues } = useVenues();

  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVisible, setFilterVisible] = useState(false);
  // La isla viaja en la URL para conservarse al volver del detalle de un local
  // y para sobrevivir a un refresco o a un enlace compartido.
  const islaInicial = typeof island === "string" && island ? island : ISLA_POR_DEFECTO;
  const [activeIsland, setActiveIsland] = useState(islaInicial);
  // La isla se elige en los chips de la cabecera; el overlay filtra por tags.
  const tagsDisponibles = useMemo(() => tagsForCategory(category), [category]);
  const [pendingTags, setPendingTags] = useState([]);
  const [activeTags, setActiveTags] = useState([]);

  const searchInputRef = useRef(null);
  const tabTranslateX = useRef(new Animated.Value(0)).current;

  const hPad = isMobile ? 16 : 30;
  const contentWidth = isMobile ? styles.fullWidth : styles.maxWidth;
  const CardWrapper = Platform.OS === "ios" ? KeyboardAvoidingView : View;

  const categoryLabel = CATEGORY_LABELS[category] ?? String(category ?? "");
  const allowedTypes = CATEGORY_VENUE_TYPES[category] ?? [];

  // Venues filtrados por categoría, isla y búsqueda
  const filteredVenues = useMemo(() => {
    let list = venues.filter((v) => {
      if (!v || v.deleted) return false;

      // Filtro por categoría
      const cat = normalizeToken(v.venueCategory ?? "");
      const matchesCategory =
        allowedTypes.length === 0 ||
        allowedTypes.some((t) => cat.includes(normalizeToken(t)));
      if (!matchesCategory) return false;

      // Filtro por isla
      if (activeIsland !== "Todo") {
        const loc = normalizeToken(v.venueLocation ?? "");
        if (!loc.includes(normalizeToken(activeIsland))) return false;
      }

      // Filtro por tags
      if (!venueMatchesTags(v, activeTags)) return false;

      return true;
    });

    // Búsqueda por nombre o ubicación
    if (searchQuery.trim()) {
      const q = normalizeToken(searchQuery.trim());
      list = list.filter(
        (v) =>
          normalizeToken(v.venueName ?? "").includes(q) ||
          normalizeToken(v.venueLocation ?? "").includes(q)
      );
    }

    return list;
  }, [venues, category, activeIsland, activeTags, searchQuery, allowedTypes]);

  return (
    <LinearGradient
      colors={["#8D45E9", "#598CEF"]}
      start={{ x: 1, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.background}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.container, contentWidth, { paddingTop: topInset }]}>
        {/* Header: botón regresar */}
        <View style={[styles.topSection, { paddingHorizontal: hPad }]}>
          <Pressable style={styles.backRow} onPress={() => router.replace("/(tabs)/locales")}>
            <Ionicons name="chevron-back" size={20} color="#FDFDFC" />
            <Text style={styles.backText}>REGRESAR</Text>
          </Pressable>

          {/* Search + filtro */}
          <View style={styles.searchRow}>
            <View style={styles.searchButton}>
              <Ionicons name="search" size={18} color="#99A0A0" />
              {searchActive ? (
                <TextInput
                  ref={searchInputRef}
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Buscar"
                  placeholderTextColor="#99A0A0"
                  autoFocus
                  returnKeyType="search"
                />
              ) : (
                <Pressable
                  style={styles.searchTouchable}
                  onPress={() => setSearchActive(true)}
                >
                  <Text style={styles.searchText}>Buscar</Text>
                </Pressable>
              )}
              {searchActive && (
                <Pressable
                  style={styles.exitButton}
                  onPress={() => {
                    setSearchActive(false);
                    setSearchQuery("");
                  }}
                >
                  <Ionicons name="close" size={14} color="#99A0A0" />
                </Pressable>
              )}
            </View>
            <Pressable
              style={styles.filterButton}
              onPress={() => {
                setPendingTags(activeTags);
                setFilterVisible(true);
              }}
            >
              <Ionicons
                name="options-outline"
                size={18}
                color="#99A0A0"
              />
            </Pressable>
          </View>
        </View>

        {/* Tarjeta blanca */}
        <CardWrapper
          style={styles.card}
          {...(Platform.OS === "ios" ? { behavior: "padding" } : {})}
        >
          {/* Island selector inline */}
          <View style={[styles.cardHeader, { paddingHorizontal: hPad }]}>
            <Text style={styles.sectionTitle}>Seleccionar isla:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.islandChipsRow}
            >
              {ISLANDS.filter((i) => i !== "Todo").map((island) => {
                const isActive =
                  normalizeToken(activeIsland) === normalizeToken(island);
                return (
                  <Pressable
                    key={island}
                    style={[styles.islandChip, isActive && styles.islandChipSelected]}
                    onPress={() => setActiveIsland(island)}
                  >
                    <Text
                      style={[
                        styles.islandChipText,
                        isActive && styles.islandChipTextSelected,
                      ]}
                    >
                      {island}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={[styles.listContent, { paddingBottom: tabBarInset }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {filteredVenues.length > 0 ? (
              filteredVenues.map((venue) => (
                <Pressable
                  key={venue.venueID}
                  onPress={() =>
                    router.push(
                      `/(tabs)/locales/${category}/${venue.venueID}?island=${encodeURIComponent(activeIsland)}`
                    )
                  }
                >
                  <PlaceCard
                    imageUri={getImageUrl(venue.venueImage)}
                    title={venue.venueName}
                    location={venue.venueLocation}
                    rating={venue.venueRating ?? null}
                    category={venue.venueCategory}
                    priceLevel={venue.venuePrice ?? null}
                  />
                </Pressable>
              ))
            ) : (
              <Text style={styles.noResults}>
                {venues.length === 0
                  ? "Cargando locales…"
                  : "No hay locales en esta categoría"}
              </Text>
            )}
          </ScrollView>
        </CardWrapper>
      </View>

      {/* Modal de filtros */}
      <Modal
        visible={filterVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterVisible(false)}
      >
        <Pressable
          style={styles.filterBackdrop}
          onPress={() => setFilterVisible(false)}
        />
        <View style={styles.filterSheet}>
          <Text style={styles.filterTitle}>Filtros</Text>

          <View style={styles.filterTagRow}>
            {tagsDisponibles.map((t) => {
              const selected = pendingTags.some((p) => p.label === t.label);
              return (
                <Pressable
                  key={t.label}
                  style={[styles.islandChip, selected && styles.islandChipSelected]}
                  onPress={() =>
                    setPendingTags((previos) =>
                      selected
                        ? previos.filter((p) => p.label !== t.label)
                        : [...previos, t]
                    )
                  }
                >
                  <Text
                    style={[
                      styles.islandChipText,
                      selected && styles.islandChipTextSelected,
                    ]}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.filterActions}>
            <Pressable
              style={styles.applyButton}
              onPress={() => {
                setActiveTags(pendingTags);
                setFilterVisible(false);
              }}
            >
              <Text style={styles.applyButtonText}>Aplicar filtros</Text>
            </Pressable>
            <Pressable
              style={styles.resetButton}
              onPress={() => {
                setPendingTags([]);
                setActiveTags([]);
                setFilterVisible(false);
              }}
            >
              <Text style={styles.resetButtonText}>Borrar filtros</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1 },
  fullWidth: { width: "100%" },
  maxWidth: {
    width: "100%",
    maxWidth: 720,
    ...(Platform.OS === "web"
      ? { marginLeft: "auto", marginRight: "auto" }
      : { alignSelf: "center" }),
  },
  topSection: {
    alignItems: "center",
    gap: 14,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingBottom: 4,
  },
  backText: {
    fontSize: 28,
    fontWeight: "700",
    textTransform: "uppercase",
    lineHeight: 34,
    color: "#FDFDFC",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
    marginTop: 2,
  },
  searchButton: {
    flex: 1,
    height: 45,
    borderRadius: 30,
    backgroundColor: "#FDFDFC",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 8,
  },
  searchTouchable: { flex: 1 },
  searchText: { fontSize: 18, color: "#99A0A0" },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 18,
    color: "#3C3E3E",
    paddingVertical: 0,
  },
  exitButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#EDEDED",
    alignItems: "center",
    justifyContent: "center",
  },
  filterButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "#FDFDFC",
    alignItems: "center",
    justifyContent: "center",
  },

  // Tarjeta blanca — mismo sizing que hoy-en-la-isla y locales/index
  card: {
    flex: 1,
    backgroundColor: "#FDFDFC",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: 18,
    paddingTop: 12,
  },
  cardHeader: {
    paddingTop: 18,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "400",
    color: "#000000",
    lineHeight: 30,
  },
  islandChipsRow: { gap: 12, paddingBottom: 4 },
  islandChip: {
    paddingHorizontal: 18,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "#EDEDEC",
  },
  islandChipSelected: { backgroundColor: "#8D45E9" },
  islandChipText: {
    fontSize: 14,
    fontWeight: "400",
    color: "#1B2222",
    lineHeight: 30,
  },
  islandChipTextSelected: { fontWeight: "500", color: "#FDFDFC" },

  listScroll: { flex: 1 },
  listContent: {
    paddingTop: 20,
    paddingBottom: 24,
    gap: 18,
  },
  noResults: {
    fontSize: 15,
    color: "#99A0A0",
    textAlign: "center",
    paddingHorizontal: 30,
    marginTop: 32,
  },

  // Modal filtros
  filterBackdrop: {
    // Cubre toda la ventana, no solo el hueco sobre la hoja: al limitar el
    // ancho de la hoja, las franjas laterales quedaban sin oscurecer.
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  filterSheet: {
    backgroundColor: "#FDFDFC",
    // Mismo ancho que la columna de contenido: el Modal ocupa toda la ventana,
    // asi que en web la hoja se estiraba de lado a lado.
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    marginTop: "auto",
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    paddingTop: 24,
    paddingBottom: 40,
  },
  filterTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#000000",
    textAlign: "center",
    marginBottom: 16,
  },
  filterTagRow: {
    flexDirection: "row",
    // Los tags son varios y de ancho desigual: en una sola fila se saldrian.
    flexWrap: "wrap",
    paddingHorizontal: 30,
    gap: 12,
    paddingTop: 10,
    paddingBottom: 16,
  },
  filterActions: {
    flexDirection: "row",
    paddingHorizontal: 22,
    gap: 24,
    marginTop: 16,
  },
  applyButton: {
    flex: 1,
    backgroundColor: "#259D4E",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
  },
  applyButtonText: { fontSize: 18, fontWeight: "500", color: "#FDFDFC" },
  resetButton: {
    flex: 1,
    backgroundColor: "#EDEDEC",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
  },
  resetButtonText: { fontSize: 18, fontWeight: "400", color: "#1B2222" },
});
