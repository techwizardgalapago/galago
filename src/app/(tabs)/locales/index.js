import { useRef, useState, useMemo } from "react";
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
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSelector } from "react-redux";

import GoAlimentos from "../../../../assets/gositos/go-alimentos.svg";
import GoHoteles from "../../../../assets/gositos/go-hoteles.svg";
import GoActividades from "../../../../assets/gositos/go-actividades.svg";
import GoNocturna from "../../../../assets/gositos/go-nocturna.svg";
import GoInformacion from "../../../../assets/gositos/go-informacion.svg";
import { useMedia } from "../../../hooks/useMedia";
import CachedImage from "../../../components/CachedImage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabBarInset } from "../../../hooks/useTabBarInset";

// -------- Datos estáticos --------

const TABS = [
  { key: "locales", label: "LOCALES" },
  { key: "descubre", label: "DESCUBRE LAS ISLAS" },
];

const ISLANDS = ["Todo", "San Cristóbal", "Isabela", "Santa Cruz"];
// Isla con la que arranca la pantalla cuando no llega ninguna en la URL.
const ISLA_POR_DEFECTO = "San Cristóbal";

// Las mascotas de cada categoria, en vectores.
//
// El reparto ya no es una suposicion mia: diseno entrego un dibujo por
// categoria, con su nombre encima, y cada uno va donde le corresponde.
//
// Los archivos que llegan son el post completo de 1080x1080 (fondo de color
// y titulo incluidos) y el gosito ocupa alrededor del 22% del lienzo. Lo que
// hay aqui son esos mismos archivos sin el fondo, sin el texto y con el
// viewBox recortado al dibujo: puestos enteros, el gosito saldria de unos 37
// de alto perdido en medio de un marco vacio, y encima con un rectangulo de
// color tapando el degradado de la ficha.
export const MASCOTAS = {
  alimentos: GoAlimentos,
  hoteles: GoHoteles,
  actividades: GoActividades,
  nocturna: GoNocturna,
  informacion: GoInformacion,
};

// Tiendas y Souvenirs es la unica que todavia no tiene dibujo propio. Hasta
// que llegue se queda con el PNG que ya estaba, para no dejar la ficha vacia.
export const MASCOTAS_PNG = {
  tiendas: require("../../../../assets/gositos/go-hike.png"),
};

export const CATEGORIES = [
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
    label: "Tours y Actividades",
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
  {
    key: "tiendas",
    label: "Tiendas y Souvenirs",
    colors: ["#2E7D32", "#66BB6A"],
    start: { x: 0.2, y: 0.9 },
    end: { x: 0.8, y: 0.1 },
  },
  {
    key: "informacion",
    label: "Información y Servicios",
    colors: ["#C43D3D", "#F2766B"],
    start: { x: 0.85, y: 0.12 },
    end: { x: 0.15, y: 0.88 },
  },
];

const getSiteImageUrl = (siteImage) => {
  try {
    if (!siteImage) return null;
    if (Array.isArray(siteImage)) {
      const img = siteImage[0];
      return img?.thumbnails?.large?.url || img?.url || null;
    }
    if (typeof siteImage === "string") {
      const parsed = JSON.parse(siteImage);
      if (Array.isArray(parsed)) return parsed[0]?.url || null;
    }
  } catch (_) {}
  return null;
};

const normalizeToken = (value) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

// -------- Componentes internos --------

export function CategoryTile({ category, island }) {
  const { isMobile } = useMedia();
  const medidaMascota = isMobile
    ? styles.categoryTileMascotaMovil
    : styles.categoryTileMascotaEscritorio;
  const Mascota = MASCOTAS[category.key];
  const mascotaPng = MASCOTAS_PNG[category.key];
  return (
    <Pressable
      // El tamano va en el Pressable, que es el hijo de la rejilla: puesto en
      // el degradado, el porcentaje del movil no tendria contra que calcularse.
      style={isMobile ? styles.categoryTileMovil : styles.categoryTileEscritorio}
      onPress={() =>
        // La isla seleccionada acompaña a la categoria, para que el listado
        // abra con el mismo filtro y pueda devolverlo al volver de un local.
        router.push(
          `/(tabs)/locales/${category.key}?island=${encodeURIComponent(island || ISLA_POR_DEFECTO)}`
        )
      }
    >
      <LinearGradient
        colors={category.colors}
        start={category.start}
        end={category.end}
        style={styles.categoryTileFondo}
      >
        {Mascota ? (
          // El alto fijo vive en la caja, no en el dibujo. El SVG la rellena
          // y, como su viewBox va recortado al gosito, se escala solo sin
          // deformarse: es lo mismo que hacia el resizeMode 'contain' de la
          // imagen, pero sin depender del tamano del archivo.
          <View
            style={[styles.categoryTileMascota, medidaMascota]}
            // Es decoracion: quien navegue con lector de pantalla ya oye la
            // etiqueta de la categoria, y oir ademas 'imagen' no aporta nada.
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Mascota width="100%" height="100%" />
          </View>
        ) : mascotaPng ? (
          <Image
            source={mascotaPng}
            style={[styles.categoryTileMascota, medidaMascota]}
            resizeMode="contain"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        ) : (
          // Sin mascota queda el hueco igual, para que la etiqueta no suba y
          // las fichas con dibujo y sin el se vean a la misma altura.
          <View style={[styles.categoryTileMascota, medidaMascota]} />
        )}
        <Text style={styles.categoryTileText}>{category.label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

function TouristSiteCard({ site, island }) {
  const imageUrl = getSiteImageUrl(site.siteImage);
  return (
    <Pressable
      style={styles.siteCard}
      onPress={() => router.push(`/(tabs)/locales/descubre/${site.siteID}?island=${encodeURIComponent(island || ISLA_POR_DEFECTO)}`)}
    >
      <View style={styles.siteThumbnail}>
        {imageUrl ? (
          <CachedImage source={{ uri: imageUrl }} style={styles.siteThumbnailImage} />
        ) : (
          <View style={styles.siteThumbnailFallback} />
        )}
      </View>
      <View style={styles.siteInfo}>
        <Text style={styles.siteName}>{site.siteName}</Text>
        <Text style={styles.siteIsland}>{site.siteIsland}</Text>
      </View>
    </Pressable>
  );
}

// -------- Pantalla principal --------

export default function LocalesScreen() {
  const tabBarInset = useTabBarInset();
  // La cabecera va bajo la barra de estado y la Dynamic Island: sin esto
  // el titulo queda cortado. El minimo conserva el espaciado que ya tenia
  // en pantallas sin muesca.
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, 34);
  const { isMobile } = useMedia();
  const allSites = useSelector((s) => s.touristSites?.list || []);
  const params = useLocalSearchParams();

  const [activeTab, setActiveTab] = useState(params.tab === "descubre" ? "descubre" : "locales");
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVisible, setFilterVisible] = useState(false);
  const [pendingIsland, setPendingIsland] = useState(params.island || ISLA_POR_DEFECTO);
  const [activeIsland, setActiveIsland] = useState(params.island || ISLA_POR_DEFECTO);

  const tabTranslateX = useRef(new Animated.Value(0)).current;
  const tabLayouts = useRef({});
  const [tabContainerWidth, setTabContainerWidth] = useState(0);
  const [tabLayoutsReady, setTabLayoutsReady] = useState(false);
  const searchInputRef = useRef(null);

  const isLocalesTab = activeTab === "locales";

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

  // Filtrado de sitios turísticos desde Redux
  const filteredSites = useMemo(() => {
    return allSites.filter((site) => {
      if (site.deleted) return false;
      const matchesIsland =
        activeIsland === "Todo" ||
        normalizeToken(site.siteIsland ?? "").includes(normalizeToken(activeIsland));
      if (!matchesIsland) return false;
      if (!searchQuery.trim()) return true;
      const q = normalizeToken(searchQuery.trim());
      return normalizeToken(site.siteName ?? "").includes(q);
    });
  }, [allSites, activeIsland, searchQuery]);

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

      <View style={[styles.container, contentWidth, { paddingTop: topInset }]}>
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
              style={styles.filterButton}
              onPress={() => {
                setPendingIsland(activeIsland);
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
          {isLocalesTab ? (
            // ---- LOCALES: grid de categorías ----
            <ScrollView
              contentContainerStyle={[
                styles.localesContent,
                // La barra de pestanas flota encima: sin sumar su alto, la
                // ultima fila de categorias queda debajo y no hay forma de
                // subirla para verla entera.
                {
                  paddingHorizontal: hPad,
                  paddingBottom: styles.localesContent.paddingBottom + tabBarInset,
                },
              ]}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.sectionTitle}>Categorías Populares</Text>
              <View style={styles.categoryGrid}>
                {filteredCategories.map((cat) => (
                  <CategoryTile key={cat.key} category={cat} island={activeIsland} />
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
                    const isActive =
                      normalizeToken(activeIsland) === normalizeToken(island);
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
                contentContainerStyle={[styles.sitesContent, { paddingBottom: tabBarInset }]}
                showsVerticalScrollIndicator={false}
              >
                {filteredSites.map((site) => (
                  <TouristSiteCard key={site.siteID} site={site} island={activeIsland} />
                ))}
                {filteredSites.length === 0 && (
                  <Text style={styles.noResults}>
                    {allSites.length === 0
                      ? "Cargando sitios..."
                      : "No hay sitios disponibles"}
                  </Text>
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
              const selected =
                normalizeToken(pendingIsland) === normalizeToken(island);
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
  // Un tercio exacto de la columna: 212*3 mas los dos huecos de 12 suman justo
  // los 660 utiles. El ancho va fijo y no con flexGrow, porque al crecer cada
  // baldosa partia de su contenido y acababa con un ancho distinto segun lo
  // larga que fuera su etiqueta.
  categoryTileEscritorio: {
    width: 212,
    height: 170,
  },
  // Dos por fila en cualquier telefono. Con el ancho fijo de 155 que habia
  // antes, uno estrecho solo admitia una por fila; el porcentaje deja sitio al
  // hueco de 12 en todos los anchos y la baldosa se encoge con la pantalla.
  categoryTileMovil: {
    width: "47%",
    aspectRatio: 1,
  },
  categoryTileFondo: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    paddingBottom: 18,
    // La mascota arriba y la etiqueta abajo. Antes la etiqueta se apoyaba en
    // que la mascota crecia hasta empujarla; ahora la mascota mide lo que
    // mide, asi que el reparto lo hace la ficha.
    justifyContent: "space-between",
    // Nada de lo que lleve dentro puede salirse de la ficha. Es lo que fallo
    // con la mascota en absoluto, que se desbordaba sobre las vecinas.
    overflow: "hidden",
  },
  // Un hijo mas de la columna, de alto fijo.
  //
  // Antes iba en absoluto con 'top/left/right: 0' y una altura en
  // porcentaje. En web no se media contra la ficha: la imagen salia de 619
  // de ancho, se desbordaba sobre las fichas vecinas y estas, que se pintan
  // despues, la tapaban. Asi no se veia ninguna mascota.
  //
  // Luego crecia con 'flex: 1' hasta llenar el sobrante, y eso hacia que
  // cada mascota saliera de un tamano: 'Hoteles y Alojamientos' ocupa dos
  // lineas y le robaba 23 de alto a la suya. Ahora el alto es fijo y todas
  // se ven iguales. 'contain' encaja el dibujo dentro sin recortarlo.
  categoryTileMascota: {
    width: "100%",
    // Red de seguridad para un telefono muy estrecho, donde la ficha es
    // cuadrada y se queda pequena: antes que recortar la mascota o la
    // etiqueta, la mascota cede. En un telefono normal no llega a activarse
    // y las diez miden lo mismo.
    flexShrink: 1,
  },
  // La ficha de escritorio mide 170 de alto y el padding deja 132 utiles.
  // La etiqueta ocupa 46 cuando son dos lineas, asi que 80 entra con holgura.
  categoryTileMascotaEscritorio: {
    height: 80,
  },
  // En movil la ficha es cuadrada al 47% del ancho, asi que su alto depende
  // del telefono. 64 entra en los estrechos de verdad sin recortar nada.
  categoryTileMascotaMovil: {
    height: 64,
  },
  categoryTileText: {
    fontSize: 19,
    fontWeight: "500",
    color: "#FFFFFF",
    lineHeight: 23,
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
