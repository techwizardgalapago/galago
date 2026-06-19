import { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  StyleSheet,
  Platform,
  Linking,
  Dimensions,
  Modal,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useSelector, useDispatch } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { selectTouristSiteById } from "../../../../../store/slices/touristSitesSlice";
import { toggleFavorite } from "../../../../../store/slices/authSlice";
import { useMedia } from "../../../../../hooks/useMedia";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_WIDTH = Math.min(SCREEN_WIDTH - 60, 333);
const IMAGE_HEIGHT = 222;

const getImageUrl = (siteImage) => {
  try {
    if (!siteImage) return null;
    if (Array.isArray(siteImage)) {
      const img = siteImage[0];
      return img?.thumbnails?.large?.url || img?.url || null;
    }
    if (typeof siteImage === "string") {
      const parsed = JSON.parse(siteImage);
      if (Array.isArray(parsed)) {
        const img = parsed[0];
        return img?.thumbnails?.large?.url || img?.url || null;
      }
    }
  } catch (_) {}
  return null;
};

const parseRules = (rulesText) => {
  if (!rulesText) return [];
  return String(rulesText).split("\n").map((r) => r.trim()).filter(Boolean);
};

const parseTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.filter(Boolean);
  return [];
};

const formatEntryFee = (fee) => {
  if (fee === null || fee === undefined || fee === 0) return "Gratis";
  return `$${fee} USD`;
};

export default function TouristSiteDetailScreen() {
  const { siteID, island } = useLocalSearchParams();
  const backUrl = `/(tabs)/locales?tab=descubre&island=${encodeURIComponent(island || "San Cristobal")}`;
  const { isMobile } = useMedia();
  const dispatch = useDispatch();
  const site = useSelector((s) => selectTouristSiteById(s, siteID));
  const authUser = useSelector((s) => s.auth?.user);
  const isSaved = (authUser?.favoriteSites || []).includes(siteID);

  const [mapsConfirmVisible, setMapsConfirmVisible] = useState(false);

  const contentWidth = isMobile ? { width: "100%" } : { width: "100%", maxWidth: 720, alignSelf: "center" };

  const openMaps = useCallback(async () => {
    const lat = Number(site?.latitude);
    const lng = Number(site?.longitude);
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
    const label = encodeURIComponent(site?.siteName || "Sitio turístico");
    const appleUrl = hasCoords ? `maps://?q=${lat},${lng}` : `maps://?q=${label}`;
    const googleUrl = hasCoords
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${label}`;
    if (Platform.OS === "web") {
      window.open(googleUrl, "_blank", "noopener");
      return;
    }
    const canOpen = await Linking.canOpenURL(appleUrl);
    Linking.openURL(canOpen ? appleUrl : googleUrl);
  }, [site]);

  if (!site) {
    return (
      <LinearGradient
        colors={["#8D45E9", "#598CEF"]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.background}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Sitio no encontrado.</Text>
          <Pressable
            style={styles.notFoundBack}
            onPress={() => router.replace("/(tabs)/locales")}
          >
            <Text style={styles.notFoundBackText}>Regresar</Text>
          </Pressable>
        </View>
      </LinearGradient>
    );
  }

  const imageUrl = getImageUrl(site.siteImage);
  const rules = parseRules(site.siteRules);
  const tags = parseTags(site.siteTags);
  const visitHours =
    site.visitOpenTime && site.visitCloseTime
      ? `${site.visitOpenTime} - ${site.visitCloseTime}`
      : null;
  const entryFee = formatEntryFee(site.entryFee);

  return (
    <LinearGradient
      colors={["#8D45E9", "#598CEF"]}
      start={{ x: 1, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.background}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.container, contentWidth]}>
        {/* Tarjeta blanca */}
        <View style={styles.card}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Imagen */}
            <View style={styles.imageWrapper}>
              {imageUrl ? (
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.image}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.imageFallback} />
              )}
            </View>

            {/* Nombre */}
            <Text style={styles.name}>{site.siteName}</Text>

            {/* Tags */}
            {tags.length > 0 && (
              <View style={styles.tagsRow}>
                {tags.map((tag, i) => (
                  <View key={i} style={styles.tag}>
                    <Text style={styles.tagText}>
                      {String(tag).startsWith("#") ? tag : `#${tag}`}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Descripción */}
            {!!site.siteDescription && (
              <Text style={styles.description}>{site.siteDescription}</Text>
            )}

            {/* Horario de visita */}
            {visitHours && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Horario de visita:</Text>
                <Text style={styles.sectionValue}>{visitHours}</Text>
              </View>
            )}

            {/* Reglas */}
            {rules.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Reglas:</Text>
                {rules.map((rule, i) => (
                  <View key={i} style={styles.ruleRow}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.sectionValue}>{rule}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Precio de entrada */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Precio de entrada:</Text>
              <Text style={styles.sectionValue}>{entryFee}</Text>
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>
        </View>

        {/* Barra de acciones sticky */}
        <View style={styles.actionBar}>
          <Pressable
            style={styles.actionBack}
            onPress={() => router.replace(backUrl)}
          >
            <Ionicons name="arrow-back" size={20} color="#1B2222" />
          </Pressable>
          <View style={styles.actionButtons}>
            <Pressable
              style={[styles.actionBtn, styles.actionBlue]}
              onPress={() => setMapsConfirmVisible(true)}
            >
              <Ionicons name="map" size={22} color="#FDFDFC" />
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.actionOrange]}
              onPress={() => dispatch(toggleFavorite({ type: 'site', id: siteID }))}
            >
              <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={22} color="#FDFDFC" />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Modal confirmación Maps */}
      <Modal
        visible={mapsConfirmVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMapsConfirmVisible(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setMapsConfirmVisible(false)}
        />
        <View style={styles.confirmSheet}>
          <Text style={styles.confirmTitle}>Abrir Google Maps?</Text>
          <View style={styles.confirmActions}>
            <Pressable
              style={styles.cancelButton}
              onPress={() => setMapsConfirmVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={styles.openButton}
              onPress={() => {
                setMapsConfirmVisible(false);
                openMaps();
              }}
            >
              <Text style={styles.openButtonText}>Abrir</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1, paddingTop: Platform.OS === "ios" ? 60 : 40 },
  card: {
    flex: 1,
    backgroundColor: "#FDFDFC",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  scrollContent: {
    paddingTop: 30,
    paddingHorizontal: 30,
    alignItems: "center",
    gap: 16,
  },

  // Imagen
  imageWrapper: {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  image: {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    borderRadius: 10,
  },
  imageFallback: {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    borderRadius: 10,
    backgroundColor: "#DDE1E1",
  },

  // Nombre
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1B2222",
    textAlign: "center",
    lineHeight: 24,
  },

  // Tags
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  tag: {
    backgroundColor: "rgba(230,83,0,0.1)",
    borderRadius: 15,
    paddingHorizontal: 12,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  tagText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#E65300",
  },

  // Texto
  description: {
    fontSize: 14,
    fontWeight: "300",
    color: "#1B2222",
    lineHeight: 16,
    alignSelf: "flex-start",
  },
  section: {
    alignSelf: "flex-start",
    gap: 4,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1B2222",
    lineHeight: 16,
  },
  sectionValue: {
    fontSize: 14,
    fontWeight: "300",
    color: "#1B2222",
    lineHeight: 16,
    flex: 1,
  },
  ruleRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "flex-start",
  },
  bullet: {
    fontSize: 14,
    color: "#1B2222",
    lineHeight: 16,
  },

  // Action bar
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
    backgroundColor: "rgba(255,255,255,0.95)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 30,
    paddingBottom: Platform.OS === "ios" ? 20 : 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 8,
  },
  actionBack: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#EDEDEC",
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 17,
  },
  actionBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBlue: { backgroundColor: "#0068AD" },
  actionOrange: { backgroundColor: "#F26719" },

  // Not found
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  notFoundText: {
    fontSize: 16,
    color: "#FDFDFC",
    fontWeight: "500",
  },
  notFoundBack: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
  },
  notFoundBackText: {
    color: "#FDFDFC",
    fontSize: 15,
  },

  // Maps confirm
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  confirmSheet: {
    backgroundColor: "#FDFDFC",
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    paddingTop: 22,
    paddingBottom: 40,
    paddingHorizontal: 22,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "400",
    color: "#000000",
    textAlign: "center",
    lineHeight: 23,
  },
  confirmActions: {
    flexDirection: "row",
    gap: 6,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#EDEDEC",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "400",
    color: "#1B2222",
  },
  openButton: {
    flex: 1,
    backgroundColor: "#259D4E",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  openButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FDFDFC",
  },
});
