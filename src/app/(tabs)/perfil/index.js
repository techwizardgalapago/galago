// src/app/(tabs)/perfil/index.js
import { View, Text, StyleSheet, Platform, ScrollView, Pressable } from "react-native";
import { useState, useMemo, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import AuthBackground from "../../../components/auth/AuthBackground";
import AuthCard from "../../../components/auth/AuthCard";
import AuthButton from "../../../components/auth/AuthButton";
import ProfileAvatarBadge from "../../../components/profile/ProfileAvatarBadge";
import ProfileTabs from "../../../components/profile/ProfileTabs";
import ProfileEventCard from "../../../components/profile/ProfileEventCard";
import PlaceCard from "../../../components/profile/PlaceCard";
import ProfileActionsSheet from "../../../components/profile/ProfileActionsSheet";
import { joinFullName } from "../../../features/users/profileComplition";
import { getVenueById } from "../../../services/venuesService";
import { upsertVenueLocal } from "../../../store/slices/venueSlice";

const CATEGORY_VENUE_TYPES = {
  alimentos: ["restaurante", "café", "cafe"],
  hoteles: ["hotel", "hostal", "alojamiento", "hospedaje"],
  actividades: ["teatro", "spa", "museo", "centro turistico", "casa cultural", "parque", "otro"],
  nocturna: ["club", "bar"],
  tiendas: ["tienda", "souvenirs"],
};

const normalizeToken = (v) =>
  String(v ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const getCategoryForVenue = (venue) => {
  const cat = normalizeToken(venue?.venueCategory ?? "");
  for (const [key, types] of Object.entries(CATEGORY_VENUE_TYPES)) {
    if (types.some((t) => cat.includes(normalizeToken(t)))) return key;
  }
  return "alimentos";
};

const getSiteImageUrl = (siteImage) => {
  try {
    if (!siteImage) return null;
    const arr = Array.isArray(siteImage) ? siteImage : JSON.parse(siteImage);
    const img = Array.isArray(arr) ? arr[0] : arr;
    return img?.thumbnails?.large?.url || img?.url || null;
  } catch (_) {
    return null;
  }
};

const getVenueImageUrl = (venueImage) => {
  try {
    if (!venueImage) return null;
    const parsed = typeof venueImage === 'string' ? JSON.parse(venueImage) : venueImage;
    const first = Array.isArray(parsed) ? parsed[0] : parsed;
    return first?.thumbnails?.large?.url || first?.url || null;
  } catch (_) {
    return typeof venueImage === 'string' && venueImage.startsWith('http')
      ? venueImage
      : null;
  }
};

const formatEventTime = (isoString) => {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} · ${hh}:${mm}`;
};

export default function PerfilScreen() {
  const [activeTab, setActiveTab] = useState("saved");
  const [sheetVisible, setSheetVisible] = useState(false);
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const user = useSelector((s) => s.auth?.user);
  const allEvents = useSelector((s) => s.events?.list || []);
  const allVenues = useSelector((s) => s.venues?.list || []);
  const allSites = useSelector((s) => s.touristSites?.list || []);
  const topGap = 108;
  const topInset = Platform.OS === "ios" ? insets.top : 0;
  const fullName =
    user?.fullName || joinFullName(user?.firstName, user?.lastName) || "—";

  const favoriteEventIDs = user?.favoriteEvents || [];
  const favoriteVenueIDs = user?.favoriteVenues || [];
  const favoriteSiteIDs = user?.favoriteSites || [];

  const fetchedIDsRef = useRef([]);

  useEffect(() => {
    if (!favoriteVenueIDs.length) return;
    const toFetch = favoriteVenueIDs.filter(
      (id) =>
        !allVenues.some((v) => v.venueID === id) &&
        !fetchedIDsRef.current.includes(id)
    );
    if (!toFetch.length) return;
    fetchedIDsRef.current = [...fetchedIDsRef.current, ...toFetch];
    Promise.all(toFetch.map((id) => getVenueById(id).catch(() => null)))
      .then((results) => {
        results
          .filter(Boolean)
          .map((r) => (r?.fields ? { venueID: r.id, ...r.fields } : r))
          .forEach((venue) => dispatch(upsertVenueLocal(venue)));
      });
  }, [favoriteVenueIDs.join(','), allVenues.length]);

  const savedEvents = useMemo(
    () => allEvents.filter((e) => favoriteEventIDs.includes(e.eventID)),
    [allEvents, favoriteEventIDs]
  );
  const savedVenues = useMemo(
    () => allVenues.filter((v) => favoriteVenueIDs.includes(v.venueID) && !!v.negocio),
    [allVenues, favoriteVenueIDs]
  );
  const savedPlaces = useMemo(
    () => allVenues.filter((v) => favoriteVenueIDs.includes(v.venueID) && !v.negocio),
    [allVenues, favoriteVenueIDs]
  );
  const savedSites = useMemo(
    () => allSites.filter((s) => favoriteSiteIDs.includes(s.siteID)),
    [allSites, favoriteSiteIDs]
  );

  return (
    <AuthBackground>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: topGap + topInset },
        ]}
      >
        <AuthCard style={styles.card}>
          <View style={styles.section}>
            <View style={styles.profileBlock}>
              <ProfileAvatarBadge />
              <Text style={styles.name}>{fullName}</Text>
            </View>

            <View style={styles.buttonRow}>
              <AuthButton
                label="Ajustes"
                onPress={() => setSheetVisible(true)}
                style={styles.button}
              />
              <AuthButton
                label="Mis Negocios"
                variant="outline"
                onPress={() => router.push("/(tabs)/perfil/negocios")}
                style={styles.button}
              />
            </View>
          </View>

          <ProfileTabs
            tabs={[
              { key: "agenda", label: "Mi Agenda" },
              { key: "saved", label: "Sitios guardados" },
              { key: "places", label: "Mis lugares" },
            ]}
            activeKey={activeTab}
            onChange={setActiveTab}
          />

          {activeTab === "agenda" ? (
            savedEvents.length > 0 ? (
              <View style={styles.listContainer}>
                {savedEvents.map((ev) => (
                  <Pressable
                    key={ev.eventID}
                    onPress={() => router.push(`/(tabs)/hoy-en-la-isla/${ev.eventID}`)}
                  >
                    <ProfileEventCard
                      time={formatEventTime(ev.startTime)}
                      title={ev.eventName || ""}
                      location={ev.eventVenueName || ev.direccionVenues || ""}
                    />
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>Aún no tienes eventos guardados</Text>
            )
          ) : activeTab === "saved" ? (
            savedVenues.length > 0 ? (
              <View style={styles.listContainer}>
                {savedVenues.map((v) => (
                  <Pressable
                    key={v.venueID}
                    onPress={() => router.push(`/(tabs)/locales/${getCategoryForVenue(v)}/${v.venueID}`)}
                  >
                    <PlaceCard
                      imageUri={getVenueImageUrl(v.venueImage)}
                      title={v.venueName || ""}
                      location={v.venueLocation || ""}
                    />
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>Aún no tienes sitios guardados</Text>
            )
          ) : (
            savedPlaces.length > 0 || savedSites.length > 0 ? (
              <View style={styles.listContainer}>
                {savedPlaces.map((v) => (
                  <Pressable
                    key={v.venueID}
                    onPress={() => router.push(`/(tabs)/locales/${getCategoryForVenue(v)}/${v.venueID}`)}
                  >
                    <PlaceCard
                      imageUri={getVenueImageUrl(v.venueImage)}
                      title={v.venueName || ""}
                      location={v.venueLocation || ""}
                    />
                  </Pressable>
                ))}
                {savedSites.map((s) => (
                  <Pressable
                    key={s.siteID}
                    onPress={() => router.push(`/(tabs)/locales/descubre/${s.siteID}`)}
                  >
                    <PlaceCard
                      imageUri={getSiteImageUrl(s.siteImage)}
                      title={s.siteName || ""}
                      location={s.siteIsland || ""}
                    />
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>Aún no tienes lugares guardados</Text>
            )
          )}
        </AuthCard>
      </ScrollView>
      <ProfileActionsSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
      />
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  card: {
    minHeight: 744,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingTop: 30,
    paddingBottom: 24,
    gap: 30,
  },
  section: {
    gap: 34,
  },
  profileBlock: {
    alignItems: "center",
    gap: 14,
  },
  name: {
    fontSize: 22,
    fontWeight: "600",
    color: "#1B2222",
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    width: Platform.OS === "web" ? 303 : "100%",
    alignSelf: "center",
    paddingHorizontal: Platform.OS === "web" ? 0 : 45,
  },
  button: {
    flex: 1,
    minWidth: 0,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(31,34,29,0.4)',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  listContainer: {
    gap: 12,
    width: '100%',
  },
});
