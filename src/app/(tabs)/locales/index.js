import { useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Animated,
  Platform,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Modal,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { useMedia } from "../../../hooks/useMedia";

// -------- Datos estáticos --------

const TABS = [
  { key: "locales", label: "LOCALES" },
  { key: "descubre", label: "DESCUBRE LAS ISLAS" },
];

const ISLANDS = ["Todo", "San Cristobal", "Isabela", "Santa Cruz"];

const CATEGORIES = [
  {
    key: "alimentos",
    label: "Alimentos y Bebidas",
    colors: ["#ED8924", "#FF6B00"],
    start: { x: 0.37, y: 0.98 },
    end: { x: 0.63, y: 0.02 },
  },
  {
    key: "hoteles",
    label: "Hoteles y Alojamientos",
    colors: ["#F38FBB", "#FBB1D2"],
    start: { x: 0.92, y: 0.23 },
    end: { x: 0.08, y: 0.77 },
  },
  {
    key: "actividades",
    label: "Actividades y Bienestar",
    colors: ["#057DBE", "#009CAD"],
    start: { x: 0.76, y: 0.07 },
    end: { x: 0.24, y: 0.93 },
  },
  {
    key: "nocturna",
    label: "Vida Nocturna",
    colors: ["#48377C", "#7977FC"],
    start: { x: 0.79, y: 0.09 },
    end: { x: 0.21, y: 0.91 },
  },
];

const TOURIST_SITES = [
  { id: "1", name: "La Loberia", island: "San Cristobal", image: null },
  { id: "2", name: "Punta Carola", island: "San Cristobal", image: null },
  { id: "3", name: "Tijeretas", island: "San Cristobal", image: null },
  { id: "4", name: "Los Túneles", island: "Isabela", image: null },
  { id: "5", name: "Bahía Elizabeth", island: "Isabela", image: null },
  { id: "6", name: "Volcán Sierra Negra", island: "Isabela", image: null },
  { id: "7", name: "Tortuga Bay", island: "Santa Cruz", image: null },
  { id: "8", name: "Las Grietas", island: "Santa Cruz", image: null },
  { id: "9", name: "Playa Alemana", island: "Santa Cruz", image: null },
];

const normalizeToken = (value) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

// -------- Componentes internos --------

function CategoryTile({ category }) {
  return (
    <Pressable onPress={() => router.push(`/(tabs)/locales/${category.key}`)}>
      <LinearGradient
        colors={category.colors}
        start={category.start}
        end={category.end}
        style={styles.categoryTile}
      >
        <Text style={styles.categoryTileText}>{category.label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

function TouristSiteCard({ site }) {
  return (
    <View style={styles.siteCard}>
      <View style={styles.siteThumbnail}>
        {site.image ? (
          <Image source={{ uri: site.image }} style={styles.siteThumbnailImage} />
        ) : (
          <View style={styles.siteThumbnailFallback} />
        )}
      </View>
      <View style={styles.siteInfo}>
        <Text style={styles.siteName}>{site.name}</Text>
        <Text style={styles.siteIsland}>Isla {site.island}</Text>
      </View>
    </View>
  );
}

// -------- Pantalla principal --------

export default function LocalesScreen() {
  const { isMobile } = useMedia();

  const [activeTab, setActiveTab] = useState("locales");
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVisible, setFilterVisible] = useState(false);
  const [pendingIsland, setPendingIsland] = useState("San Cristobal");
  const [activeIsland, setActiveIsland] = useState("San Cristobal");

  const tabTranslateX = useRef(new Animated.Value(0)).current;
  const tabLayouts = useRef({});
  const [tabContainerWidth, setTabContainerWidth] = useState(0);
  const [tabLayoutsReady, setTabLayoutsReady] = useState(false);
  const searchInputRef = useRef(null);

  const isLocalesTab = activeTab === "locales";
  const filterActive = activeIsland !== "Todo";

  const hPad = isMobile ? 16 : 30;
  const contentWidth = isMobile ? styles.fullWidth : styles.maxWidth;
  const CardWrapper = Platform.OS === "ios" ? KeyboardAvoidingView : View;

  // Animación centrado de tabs (igual que hoy-en-la-isla)
  const handleTabLayout = (key, layout) => {
    tabLayouts.current[key] = layout;
    if (Object.keys(tabLayouts.current).length === TABS.length) {
      setTabLayoutsReady(true);
    }
  };

  const handleTabPress = (key) => {
    setActiveTab(key);
    if (!isMobile || !tabLayoutsReady) return;
    const layout = tabLayouts.current[key];
    if (!layout || !tabContainerWidth) return;
    const centerOffset = tabContainerWidth / 2 - layout.x - layout.width / 2;
    Animated.spring(tabTranslateX, {
      toValue: centerOffset,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
  };

  // Filtrado de contenido
  const filteredSites = TOURIST_SITES.filter((site) => {
    const matchesIsland =
      activeIsland === "Todo" || site.island === activeIsland;
    if (!searchQuery.trim()) return matchesIsland;
    const q = normalizeToken(searchQuery.trim());
    return (
      matchesIsland &&
      normalizeToken(site.name).includes(q)
    );
  });

  const filteredCategories = !searchQuery.trim()
    ? CATEGORIES
    : CATEGORIES.filter((c) =>
        normalizeToken(c.label).includes(normalizeToken(searchQuery.trim()))
      );

  return (
    <LinearGradient
      colors={["#8D45E9", "#598CEF"]}
      start={{ x: 1, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.background}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.container, contentWidth]}>
        {/* Header: tabs + search */}
        <View style={[styles.topSection, { paddingHorizontal: hPad }]}>
          {isMobile ? (
            <View
              style={[styles.tabsScrollView, { marginHorizontal: -hPad }]}
              onLayout={(e) => setTabContainerWidth(e.nativeEvent.layout.width)}
            >
              <Animated.View
                style={[
                  styles.tabsRow,
                  { gap: 14 },
                  { transform: [{ translateX: tabTranslateX }] },
                ]}
              >
                {TABS.map((tab) => {
                  const isActive = tab.key === activeTab;
                  return (
                    <Pressable
                      key={tab.key}
                      onPress={() => handleTabPress(tab.key)}
                      onLayout={(e) => handleTabLayout(tab.key, e.nativeEvent.layout)}
                    >
                      <Text
                        style={[
                          styles.tabText,
                          isActive ? styles.tabTextActive : styles.tabTextInactive,
                          { fontSize: 20 },
                        ]}
                      >
                        {tab.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </Animated.View>
            </View>
          ) : (
            <View style={styles.tabsRow}>
              {TABS.map((tab) => {
                const isActive = tab.key === activeTab;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => handleTabPress(tab.key)}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        isActive ? styles.tabTextActive : styles.tabTextInactive,
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

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
              style={[styles.filterButton, filterActive && styles.filterButtonActive]}
              onPress={() => {
                setPendingIsland(activeIsland);
                setFilterVisible(true);
              }}
            >
              <Ionicons
                name="options-outline"
                size={18}
                color={filterActive ? "#FDFDFC" : "#99A0A0"}
              />
            </Pressable>
          </View>
        </View>

        {/* Tarjeta blanca */}
        <CardWrapper
          style={styles.card}
          {...(Platform.OS === "ios" ? { behavior: "padding" } : {})}
        >
          {isLocalesTab ? (
            // ---- LOCALES: grid de categorías ----
            <ScrollView
              contentContainerStyle={[
                styles.localesContent,
                { paddingHorizontal: hPad },
              ]}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.sectionTitle}>Categorías Populares</Text>
              <View style={styles.categoryGrid}>
                {filteredCategories.map((cat) => (
                  <CategoryTile key={cat.key} category={cat} />
                ))}
                {filteredCategories.length === 0 && (
                  <Text style={styles.noResults}>Sin resultados</Text>
                )}
              </View>
            </ScrollView>
          ) : (
            // ---- DESCUBRE LAS ISLAS: selector + lista ----
            <>
              <View style={[styles.descubreHeader, { paddingHorizontal: hPad }]}>
                <Text style={styles.sectionTitle}>Seleccionar isla:</Text>
                {/* Island chips inline (quick-select, en sync con el filtro) */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.islandChipsRow}
                >
                  {ISLANDS.filter((i) => i !== "Todo").map((island) => {
                    const isActive = activeIsland === island;
                    return (
                      <Pressable
                        key={island}
                        style={[
                          styles.islandChip,
                          isActive && styles.islandChipSelected,
                        ]}
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
                style={styles.sitesScroll}
                contentContainerStyle={styles.sitesContent}
                showsVerticalScrollIndicator={false}
              >
                {filteredSites.map((site) => (
                  <TouristSiteCard key={site.id} site={site} />
                ))}
                {filteredSites.length === 0 && (
                  <Text style={styles.noResults}>No hay sitios disponibles</Text>
                )}
              </ScrollView>
            </>
          )}
        </CardWrapper>
      </View>

      {/* Modal de filtros (igual que hoy-en-la-isla) */}
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

          <Text style={styles.filterSectionLabel}>Isla</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterIslandRow}
          >
            {ISLANDS.map((island) => {
              const selected = pendingIsland === island;
              return (
                <Pressable
                  key={island}
                  style={[
                    styles.islandChip,
                    selected && styles.islandChipSelected,
                  ]}
                  onPress={() => setPendingIsland(island)}
                >
                  <Text
                    style={[
                      styles.islandChipText,
                      selected && styles.islandChipTextSelected,
                    ]}
                  >
                    {island}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.filterActions}>
            <Pressable
              style={styles.applyButton}
              onPress={() => {
                setActiveIsland(pendingIsland);
                setFilterVisible(false);
              }}
            >
              <Text style={styles.applyButtonText}>Aplicar filtros</Text>
            </Pressable>
            <Pressable
              style={styles.resetButton}
              onPress={() => {
                setPendingIsland("Todo");
                setActiveIsland("Todo");
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
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: 34,
    paddingHorizontal: 0,
  },
  fullWidth: {
    width: "100%",
  },
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
  tabsScrollView: {
    overflow: "hidden",
  },
  tabsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 26,
  },
  tabText: {
    fontSize: 28,
    fontWeight: "700",
    textTransform: "uppercase",
    lineHeight: 34,
  },
  tabTextActive: {
    color: "#FDFDFC",
  },
  tabTextInactive: {
    color: "rgba(253, 253, 252, 0.45)",
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
  searchTouchable: {
    flex: 1,
  },
  searchText: {
    fontSize: 18,
    color: "#99A0A0",
  },
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
  filterButtonActive: {
    backgroundColor: "#8D45E9",
  },

  // Tarjeta blanca — idéntico a hoy-en-la-isla
  card: {
    flex: 1,
    backgroundColor: "#FDFDFC",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: 18,
    paddingTop: 12,
  },

  // ---- LOCALES ----
  localesContent: {
    paddingTop: 18,
    paddingBottom: 24,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "400",
    color: "#000000",
    lineHeight: 30,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
  },
  categoryTile: {
    width: 155,
    height: 155,
    borderRadius: 20,
    padding: 20,
    paddingBottom: 18,
    justifyContent: "flex-end",
  },
  categoryTileText: {
    fontSize: 20,
    fontWeight: "500",
    color: "#FFFFFF",
    lineHeight: 24,
  },

  // ---- DESCUBRE ----
  descubreHeader: {
    paddingTop: 18,
    gap: 12,
  },
  islandChipsRow: {
    gap: 12,
    paddingBottom: 4,
  },
  sitesScroll: {
    flex: 1,
  },
  sitesContent: {
    paddingTop: 20,
    paddingBottom: 24,
    gap: 29,
  },
  siteCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 30,
    gap: 18,
  },
  siteThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#DDE1E1",
    flexShrink: 0,
  },
  siteThumbnailImage: {
    width: "100%",
    height: "100%",
  },
  siteThumbnailFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: "#DDE1E1",
  },
  siteInfo: {
    flex: 1,
    gap: 6,
  },
  siteName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3C3E3E",
    lineHeight: 17.6,
  },
  siteIsland: {
    fontSize: 14,
    fontWeight: "300",
    color: "#99A0A0",
  },

  noResults: {
    fontSize: 15,
    color: "#99A0A0",
    textAlign: "center",
    marginTop: 32,
  },

  // ---- Island chips (inline + modal) ----
  islandChip: {
    paddingHorizontal: 18,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "#EDEDEC",
  },
  islandChipSelected: {
    backgroundColor: "#8D45E9",
  },
  islandChipText: {
    fontSize: 14,
    fontWeight: "400",
    color: "#1B2222",
    lineHeight: 30,
  },
  islandChipTextSelected: {
    fontWeight: "500",
    color: "#FDFDFC",
  },

  // ---- Modal filtros (idéntico a hoy-en-la-isla) ----
  filterBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  filterSheet: {
    backgroundColor: "#FDFDFC",
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 0,
  },
  filterTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#000000",
    textAlign: "center",
    marginBottom: 16,
  },
  filterSectionLabel: {
    fontSize: 18,
    color: "#000000",
    paddingHorizontal: 30,
    paddingVertical: 10,
  },
  filterIslandRow: {
    paddingHorizontal: 30,
    gap: 12,
    paddingBottom: 16,
  },
  filterActions: {
    flexDirection: "row",
    justifyContent: "space-between",
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
  applyButtonText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#FDFDFC",
  },
  resetButton: {
    flex: 1,
    backgroundColor: "#EDEDEC",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
  },
  resetButtonText: {
    fontSize: 18,
    fontWeight: "400",
    color: "#1B2222",
  },
});
