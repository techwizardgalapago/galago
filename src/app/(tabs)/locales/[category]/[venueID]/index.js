import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { selectVenueByIdFromState } from "../../../../../store/slices/venueSlice";
import { fetchSchedulesByVenue } from "../../../../../store/slices/schedulesByVenueSlice";
import { toggleFavorite } from "../../../../../store/slices/authSlice";
import { getVenueById } from "../../../../../services/venuesService";

// -------- Constantes --------

const WEEKDAYS_ORDER = [
  "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo",
];
const EMPTY_SCHEDULES = [];
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_WIDTH = Math.min(SCREEN_WIDTH - 60, 333);
const IMAGE_HEIGHT = 222;

// -------- Helpers (misma lógica que perfil/negocios/[venueID]) --------

const normalizeWeekDay = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return WEEKDAYS_ORDER[value] || null;
  const raw = String(value)
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  const map = {
    lunes: "Lunes", martes: "Martes", miercoles: "Miércoles",
    jueves: "Jueves", viernes: "Viernes", sabado: "Sábado", domingo: "Domingo",
    monday: "Lunes", tuesday: "Martes", wednesday: "Miércoles",
    thursday: "Jueves", friday: "Viernes", saturday: "Sábado", sunday: "Domingo",
  };
  if (map[raw]) return map[raw];
  const asNum = Number(raw);
  if (!Number.isNaN(asNum)) return WEEKDAYS_ORDER[asNum] || null;
  return null;
};

const parseImages = (venueImage) => {
  try {
    if (Array.isArray(venueImage)) return venueImage;
    if (typeof venueImage === "string" && venueImage.trim()) {
      const parsed = JSON.parse(venueImage);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    /* ignore */
  }
  return [];
};

const getImageUrl = (imgObj) =>
  imgObj?.thumbnails?.large?.url || imgObj?.url || null;

// -------- Componente principal --------

export default function VenueDetailScreen() {
  const { venueID, category } = useLocalSearchParams();
  const dispatch = useDispatch();

  const venue = useSelector((s) => selectVenueByIdFromState(s, venueID));
  const authUser = useSelector((s) => s.auth?.user);
  const isFavorited = (authUser?.favoriteVenues || []).includes(venueID);
  const schedulesByVenue = useSelector(
    (s) => s.schedulesByVenue?.schedulesByVenueID?.[venueID] || EMPTY_SCHEDULES
  );

  const [remoteSchedules, setRemoteSchedules] = useState(EMPTY_SCHEDULES);
  const [imageIndex, setImageIndex] = useState(0);
  const imageScrollRef = useRef(null);

  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedStars, setSelectedStars] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [mapsConfirmVisible, setMapsConfirmVisible] = useState(false);

  // Carga de schedules locales (native) y remotos
  useEffect(() => {
    if (!venueID || Platform.OS === "web") return;
    dispatch(fetchSchedulesByVenue(venueID));
  }, [dispatch, venueID]);

  useEffect(() => {
    if (!venueID || Platform.OS === "web") return;
    let active = true;
    getVenueById(venueID)
      .then((res) => {
        if (!active) return;
        const record = res?.fields ? res.fields : res;
        const next = Array.isArray(record?.VenueSchedules)
          ? record.VenueSchedules
          : [];
        setRemoteSchedules(next);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [venueID]);

  // Imágenes para el carousel
  const images = useMemo(() => {
    const parsed = parseImages(venue?.venueImage);
    const urls = parsed.map(getImageUrl).filter(Boolean);
    return urls.length ? urls : [null];
  }, [venue?.venueImage]);

  const goNextImage = () => {
    const next = (imageIndex + 1) % images.length;
    setImageIndex(next);
    imageScrollRef.current?.scrollTo({ x: next * IMAGE_WIDTH, animated: true });
  };

  const goPrevImage = () => {
    const prev = (imageIndex - 1 + images.length) % images.length;
    setImageIndex(prev);
    imageScrollRef.current?.scrollTo({ x: prev * IMAGE_WIDTH, animated: true });
  };

  // Normalización de horarios
  const normalizedSchedules = useMemo(() => {
    const rawFromVenue =
      Array.isArray(venue?.VenueSchedules) && venue.VenueSchedules.length
        ? venue.VenueSchedules
        : [];
    const raw = rawFromVenue.length
      ? rawFromVenue
      : remoteSchedules.length
      ? remoteSchedules
      : schedulesByVenue;

    const orderMap = WEEKDAYS_ORDER.reduce((acc, d, idx) => {
      acc[d] = idx;
      return acc;
    }, {});

    return (raw || [])
      .map((r) => {
        const item = r?.fields ? r.fields : r;
        const weekDay = normalizeWeekDay(
          item.weekDay ?? item.dayOfWeek ?? item.day
        );
        if (!weekDay) return null;
        return {
          weekDay,
          openingTime_:
            item.openingTime_ ?? item.openingTime ?? item.openTime ?? null,
          closingTime_:
            item.closingTime_ ?? item.closingTime ?? item.closeTime ?? null,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (orderMap[a.weekDay] ?? 99) - (orderMap[b.weekDay] ?? 99));
  }, [venue?.VenueSchedules, schedulesByVenue, remoteSchedules]);

  const schedulesByDay = useMemo(() => {
    const map = {};
    normalizedSchedules.forEach(({ weekDay, openingTime_, closingTime_ }) => {
      if (!map[weekDay]) map[weekDay] = [];
      map[weekDay].push({ openingTime_, closingTime_ });
    });
    return map;
  }, [normalizedSchedules]);

  // Tags (igual que perfil/negocios/[venueID])
  const ratingValue = venue?.venueRating ?? venue?.rating;
  const priceValue = venue?.venuePriceRange ?? venue?.priceRange;
  const ecoFriendly = venue?.ecoFriendly ?? venue?.isEcoFriendly;
  const acceptsCard =
    venue?.acceptsCard ?? venue?.acceptsCardPayments ?? venue?.cardAccepted;

  const normalizedRating =
    ratingValue != null
      ? String(
          typeof ratingValue === "number" ? ratingValue.toFixed(1) : ratingValue
        )
      : null;

  const normalizedPrice =
    typeof priceValue === "number"
      ? "$".repeat(Math.max(1, Math.min(4, Math.round(priceValue))))
      : typeof priceValue === "string" && priceValue.trim()
      ? priceValue.trim()
      : null;

  // Acciones
  const lat =
    typeof venue?.latitude === "number"
      ? venue.latitude
      : Number(venue?.latitude);
  const lng =
    typeof venue?.longitude === "number"
      ? venue.longitude
      : Number(venue?.longitud ?? venue?.longitude);

  const openMaps = useCallback(async () => {
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
    const label = encodeURIComponent(venue?.venueName || "Ubicación");
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
  }, [lat, lng, venue?.venueName]);

  const openWhatsApp = useCallback(async () => {
    const rawPhone = `${venue?.venueContact ?? ""}`.trim();
    if (!rawPhone) return;
    const normalized = rawPhone.replace(/[^\d+]/g, "");
    const phone = normalized.startsWith("+") ? normalized.slice(1) : normalized;
    const message = encodeURIComponent(
      `Hola, te escribo por ${venue?.venueName || "tu negocio"}.`
    );
    const appUrl = `whatsapp://send?phone=${phone}&text=${message}`;
    const webUrl = `https://wa.me/${phone}?text=${message}`;
    if (Platform.OS === "web") {
      window.open(webUrl, "_blank", "noopener");
      return;
    }
    const canOpen = await Linking.canOpenURL(appUrl);
    Linking.openURL(canOpen ? appUrl : webUrl);
  }, [venue?.venueContact, venue?.venueName]);

  if (!venue) {
    return (
      <LinearGradient
        colors={["#8D45E9", "#598CEF"]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.background}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>No se encontró el local.</Text>
          <Pressable onPress={() => router.replace(`/(tabs)/locales/${category}`)} style={styles.notFoundBack}>
            <Text style={styles.notFoundBackText}>Regresar</Text>
          </Pressable>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={["#8D45E9", "#598CEF"]}
      start={{ x: 1, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.background}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* Tarjeta blanca scrollable */}
      <View style={styles.card}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Carousel de imágenes */}
          <View style={styles.carouselWrapper}>
            <ScrollView
              ref={imageScrollRef}
              horizontal
              pagingEnabled
              scrollEnabled={images.length > 1}
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(
                  e.nativeEvent.contentOffset.x / IMAGE_WIDTH
                );
                setImageIndex(idx);
              }}
              style={{ width: IMAGE_WIDTH }}
            >
              {images.map((url, i) =>
                url ? (
                  <Image
                    key={i}
                    source={{ uri: url }}
                    style={styles.heroImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View key={i} style={styles.heroPlaceholder} />
                )
              )}
            </ScrollView>
            {images.length > 1 && imageIndex < images.length - 1 && (
              <Pressable style={styles.arrowRight} onPress={goNextImage}>
                <Ionicons name="chevron-forward" size={20} color="#1B2222" />
              </Pressable>
            )}
            {images.length > 1 && imageIndex > 0 && (
              <Pressable style={styles.arrowLeft} onPress={goPrevImage}>
                <Ionicons name="chevron-back" size={20} color="#1B2222" />
              </Pressable>
            )}
          </View>

          {/* Nombre y categoría */}
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{venue.venueName || "Sin nombre"}</Text>
            {!!venue.venueCategory && (
              <Text style={styles.subtitle}>{venue.venueCategory}</Text>
            )}
          </View>

          {/* Tags */}
          <View style={styles.tagRow}>
            {ecoFriendly ? (
              <View style={[styles.tag, styles.tagGreen]}>
                <Text style={styles.tagTextLight}>
                  {typeof ecoFriendly === "string" ? ecoFriendly : "Eco-Friendly"}
                </Text>
              </View>
            ) : null}
            {acceptsCard ? (
              <View style={[styles.tag, styles.tagOrange]}>
                <Text style={styles.tagText}>
                  {typeof acceptsCard === "string" ? acceptsCard : "acepta tarjeta"}
                </Text>
              </View>
            ) : null}
            {normalizedPrice ? (
              <View style={[styles.tag, styles.tagOrange]}>
                <Text style={styles.tagText}>
                  {normalizedPrice.slice(0, 2)}
                  <Text style={styles.tagTextMuted}>
                    {"$".repeat(Math.max(0, 4 - normalizedPrice.length))}
                  </Text>
                </Text>
              </View>
            ) : null}
            {normalizedRating ? (
              <View style={[styles.tag, styles.tagOrange]}>
                <Ionicons name="star" size={12} color="#E65300" />
                <Text style={styles.tagText}> {normalizedRating}</Text>
              </View>
            ) : null}
          </View>

          {/* Descripción */}
          {!!venue.venueDescription && (
            <Text style={styles.description}>{venue.venueDescription}</Text>
          )}

          {/* Tabla de horarios */}
          <View style={styles.table}>
            {WEEKDAYS_ORDER.map((day, index) => {
              const segments = schedulesByDay[day] || [];
              const value = segments.length
                ? segments
                    .map(
                      (s) =>
                        `${s.openingTime_ ?? "--:--"} - ${s.closingTime_ ?? "--:--"}`
                    )
                    .join("  ")
                : "cerrado";
              return (
                <View
                  key={day}
                  style={[
                    styles.tableRow,
                    index % 2 === 1 && styles.tableRowAlt,
                  ]}
                >
                  <View style={styles.tableDay}>
                    <Text style={styles.tableDayText}>{day.toLowerCase()}</Text>
                  </View>
                  <View style={styles.tableValue}>
                    <Text style={styles.tableValueText}>{value}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Espaciado para la barra de acciones sticky */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>

      {/* Barra de acciones sticky */}
      <View style={styles.actionBar}>
        <Pressable style={styles.actionBack} onPress={() => router.replace(`/(tabs)/locales/${category}`)}>
          <Ionicons name="arrow-back" size={20} color="#1B2222" />
        </Pressable>

        <View style={styles.actionButtons}>
          <Pressable
            style={[styles.actionBtn, styles.actionYellow]}
            onPress={() => setRatingModalVisible(true)}
          >
            <Ionicons name="star-outline" size={22} color="#FDFDFC" />
          </Pressable>
          <Pressable
            style={[styles.actionBtn, styles.actionBlue]}
            onPress={() => setMapsConfirmVisible(true)}
          >
            <Ionicons name="map" size={22} color="#FDFDFC" />
          </Pressable>
          <Pressable
            style={[styles.actionBtn, styles.actionGreen]}
            onPress={openWhatsApp}
          >
            <Ionicons name="logo-whatsapp" size={22} color="#FDFDFC" />
          </Pressable>
          {/* Guardar en sitios guardados */}
          <Pressable
            style={[styles.actionBtn, styles.actionOrange]}
            onPress={() =>
              dispatch(toggleFavorite({ type: "venue", id: venueID, data: venue }))
            }
          >
            <Ionicons
              name={isFavorited ? "bookmark" : "bookmark-outline"}
              size={22}
              color="#FDFDFC"
            />
          </Pressable>
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
          style={styles.ratingBackdrop}
          onPress={() => setMapsConfirmVisible(false)}
        />
        <View style={styles.mapsConfirmSheet}>
          <Text style={styles.mapsConfirmTitle}>Abrir Google Maps?</Text>
          <View style={styles.ratingActions}>
            <Pressable
              style={styles.cancelButton}
              onPress={() => setMapsConfirmVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={styles.publishButton}
              onPress={() => {
                setMapsConfirmVisible(false);
                openMaps();
              }}
            >
              <Text style={styles.publishButtonText}>Abrir</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal de rating */}
      <Modal
        visible={ratingModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRatingModalVisible(false)}
      >
        <Pressable
          style={styles.ratingBackdrop}
          onPress={() => setRatingModalVisible(false)}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.ratingSheetWrapper}
        >
          <View style={styles.ratingSheet}>
            {/* Puntaje */}
            <View style={styles.ratingSection}>
              <Text style={styles.ratingSectionLabel}>Tu Puntaje</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable key={n} onPress={() => setSelectedStars(n)}>
                    <Ionicons
                      name={n <= selectedStars ? "star" : "star-outline"}
                      size={24}
                      color={n <= selectedStars ? "#FFBE3B" : "#C4C4C4"}
                    />
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Comentario */}
            <View style={styles.ratingSection}>
              <Text style={styles.ratingSectionLabel}>Comentario</Text>
              <View style={styles.commentBox}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Cuéntanos tu experiencia..."
                  placeholderTextColor="#99A0A0"
                  multiline
                  maxLength={240}
                  value={ratingComment}
                  onChangeText={setRatingComment}
                  textAlignVertical="top"
                />
                <Text style={styles.commentCount}>{ratingComment.length}/240</Text>
              </View>
            </View>

            {/* Botones */}
            <View style={styles.ratingActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => {
                  setRatingModalVisible(false);
                  setSelectedStars(0);
                  setRatingComment("");
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={styles.publishButton}
                onPress={() => {
                  // TODO: enviar rating al backend
                  setRatingModalVisible(false);
                  setSelectedStars(0);
                  setRatingComment("");
                }}
              >
                <Text style={styles.publishButtonText}>Publicar</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  card: {
    flex: 1,
    backgroundColor: "#FDFDFC",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: Platform.OS === "ios" ? 54 : 34,
    overflow: "hidden",
  },
  scrollContent: {
    paddingTop: 20,
    paddingHorizontal: 30,
    alignItems: "center",
    gap: 18,
  },

  // Carousel
  carouselWrapper: {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    borderRadius: 10,
    overflow: "visible",
    position: "relative",
  },
  heroImage: {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    borderRadius: 10,
  },
  heroPlaceholder: {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    borderRadius: 10,
    backgroundColor: "#DDE1E1",
  },
  arrowRight: {
    position: "absolute",
    right: -8,
    top: "50%",
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  arrowLeft: {
    position: "absolute",
    left: -8,
    top: "50%",
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Título
  titleBlock: {
    alignItems: "center",
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1B2222",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "400",
    color: "#8F8F90",
    textAlign: "center",
  },

  // Tags
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: 15,
    height: 26,
  },
  tagOrange: {
    backgroundColor: "rgba(230,83,0,0.1)",
  },
  tagGreen: {
    backgroundColor: "rgba(135,170,24,0.7)",
  },
  tagText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#E65300",
    lineHeight: 26,
  },
  tagTextLight: {
    fontSize: 12,
    fontWeight: "500",
    color: "#FDFDFC",
    lineHeight: 26,
  },
  tagTextMuted: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(230,83,0,0.5)",
  },

  // Descripción
  description: {
    fontSize: 14,
    fontWeight: "300",
    color: "#1B2222",
    lineHeight: 15.7,
    width: "100%",
  },

  // Tabla de horarios
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#D5D6D6",
    borderRadius: 10,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#D5D6D6",
  },
  tableRowAlt: {
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  tableDay: {
    width: 93,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRightWidth: 1,
    borderRightColor: "#D5D6D6",
  },
  tableDayText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    lineHeight: 18.2,
  },
  tableValue: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tableValueText: {
    fontSize: 14,
    fontWeight: "300",
    color: "#000",
    lineHeight: 18.2,
    textTransform: "lowercase",
  },

  // Barra de acciones sticky
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255,255,255,0.9)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 30,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 30 : 20,
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
    gap: 14,
    alignItems: "center",
  },
  actionBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  actionYellow: { backgroundColor: "#FFBE3B" },
  actionBlue: { backgroundColor: "#0068AD" },
  actionGreen: { backgroundColor: "#259D4E" },
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

  // Maps confirm modal
  mapsConfirmSheet: {
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
  mapsConfirmTitle: {
    fontSize: 18,
    fontWeight: "400",
    color: "#000000",
    textAlign: "center",
    lineHeight: 23,
  },

  // Rating modal
  ratingBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  ratingSheetWrapper: {
    backgroundColor: "transparent",
  },
  ratingSheet: {
    backgroundColor: "#FDFDFC",
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    paddingTop: 22,
    paddingBottom: 40,
    paddingHorizontal: 22,
    gap: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  ratingSection: {
    gap: 14,
  },
  ratingSectionLabel: {
    fontSize: 18,
    fontWeight: "400",
    color: "#000000",
    lineHeight: 23,
  },
  starsRow: {
    flexDirection: "row",
    gap: 10,
  },
  commentBox: {
    backgroundColor: "#EDEDEC",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    minHeight: 137,
  },
  commentInput: {
    fontSize: 14,
    fontWeight: "400",
    color: "#1B2222",
    lineHeight: 18,
    flex: 1,
    minHeight: 90,
  },
  commentCount: {
    fontSize: 9,
    fontWeight: "500",
    color: "#99A0A0",
    textAlign: "right",
    marginTop: 4,
  },
  ratingActions: {
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
    paddingHorizontal: 25,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "400",
    color: "#1B2222",
  },
  publishButton: {
    flex: 1,
    backgroundColor: "#259D4E",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 30,
  },
  publishButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FDFDFC",
  },
});
