import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Animated,
  Platform,
  Image,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { useMedia } from "../../../hooks/useMedia";
import { useEvents } from "../../../hooks/useEvents";

const TABS = [
  { key: "hoy", label: "Hoy en la isla" },
  { key: "agenda", label: "Agenda" },
  { key: "regeneracion", label: "Regeneración" },
];

const FEATURED_EVENTS_FALLBACK = [
  {
    title: "Festival De Arte En La Playa",
    location: "La Nube, Isla Santa Cruz",
    date: "14",
    month: "OCT",
    image:
      "http://localhost:3845/assets/5a44d4ddb46060488f1c103d0990ee81cac6f129.png",
  },
  {
    title: "Rolls, Sake y Caña",
    location: "Noe Sushi Bar, Isla Isabela",
    date: "14",
    month: "OCT",
    image:
      "http://localhost:3845/assets/5e060ffce86528279ee70054aa77a2d19e6cfd6c.png",
  },
];

const CATEGORY_CHIPS_FALLBACK = [
  { label: "Gastronomía", color: "#ED8924" },
  { label: "Arte & Cultura", color: "#EA78BF" },
  { label: "Vida Nocturna", color: "#904CCC" },
  { label: "Actividades", color: "#009CAD" },
];

const DAY_ITEMS = [
  { key: "13", day: "L", month: "MAR" },
  { key: "14", day: "M", month: "MAR" },
  { key: "15", day: "M", month: "MAR" },
  { key: "16", day: "J", month: "MAR" },
  { key: "17", day: "V", month: "MAR" },
  { key: "18", day: "S", month: "MAR" },
  { key: "19", day: "D", month: "MAR" },
];

const TAB_STYLES = {
  hoy: {
    accent: "#ED8924",
    gradient: ["#0083A9", "#008EAD", "#2EB0A4"],
  },
  agenda: {
    accent: "#F26719",
    gradient: ["#1E7BB6", "#1A9BB3", "#53BEA8"],
  },
  regeneracion: {
    accent: "#6B8F1F",
    gradient: ["#5C8915", "#87AA18"],
  },
};

const normalizeToken = (value) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const parseTags = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch (error) {
        // fallback to splitting
      }
    }
    return trimmed
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
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
      } catch (error) {
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

const formatLocation = (event) => {
  const venue = event.eventVenueName || "";
  const island = event.eventIslandLocation || "";
  if (venue && island) return `${venue}, ${island}`;
  return venue || island || "";
};

const formatTimeRange = (event) => {
  const start = formatTimeValue(event.startTime);
  const end = formatTimeValue(event.endTime);
  if (start && end) return `${start} - ${end}`;
  return start || end || "";
};

export default function HoyEnLaIslaScreen() {
  const { isMobile } = useMedia();
  const [activeTab, setActiveTab] = useState("hoy");
  const [activeDay, setActiveDay] = useState(DAY_ITEMS[0].key);
  const tabTranslateX = useRef(new Animated.Value(0)).current;
  const tabLayouts = useRef({});
  const [tabContainerWidth, setTabContainerWidth] = useState(0);
  const [tabLayoutsReady, setTabLayoutsReady] = useState(false);
  const [activeFeaturedIndex, setActiveFeaturedIndex] = useState(0);
  const { events: allEvents } = useEvents();

  const tabStyle = TAB_STYLES[activeTab] || TAB_STYLES.agenda;
  const inactiveColor =
    activeTab === "regeneracion"
      ? "rgba(107, 143, 31, 0.5)"
      : "rgba(242, 103, 25, 0.5)";
  const tagBackground =
    activeTab === "regeneracion"
      ? "rgba(107, 143, 31, 0.12)"
      : "rgba(242, 103, 25, 0.1)";
  const isHoyTab = activeTab === "hoy";

  const events = useMemo(() => {
    const filteredByTag =
      activeTab === "regeneracion"
        ? allEvents.filter((event) =>
            parseTags(event.eventTags).some((tag) =>
              normalizeToken(tag).includes("regeneracion")
            )
          )
        : allEvents;

    if (activeTab === "hoy") return filteredByTag;

    return filteredByTag.filter((event) => {
      if (!event.startTime) return true;
      const date = new Date(event.startTime);
      if (Number.isNaN(date.getTime())) return true;
      return `${date.getDate()}` === activeDay;
    });
  }, [activeDay, activeTab, allEvents]);

  useEffect(() => {
    if (!allEvents.length) {
      console.log("HoyEnLaIslaScreen - no events in redux");
      return;
    }
    const sample = allEvents[0];
    const startDay = sample?.startTime
      ? new Date(sample.startTime).getDate()
      : null;
    console.log("HoyEnLaIslaScreen - events summary", {
      total: allEvents.length,
      activeTab,
      activeDay,
      sampleStartDay: startDay,
      filteredCount: events.length,
    });
  }, [activeDay, activeTab, allEvents, events.length]);

  const featuredEvents = useMemo(() => {
    if (!allEvents.length) return FEATURED_EVENTS_FALLBACK;

    const now = Date.now();
    const toMs = (value) => {
      if (!value) return 0;
      const t = new Date(value).getTime();
      return Number.isFinite(t) ? t : 0;
    };

    const active = allEvents.filter((event) => !event.deleted);
    const upcoming = active
      .filter((e) => toMs(e.startTime) >= now)
      .sort((a, b) => toMs(a.startTime) - toMs(b.startTime));
    const past = active
      .filter((e) => toMs(e.startTime) < now)
      .sort((a, b) => toMs(b.startTime) - toMs(a.startTime));

    return [...upcoming, ...past]
      .slice(0, 2)
      .map((event) => ({
        title: event.eventName || "Evento destacado",
        location: formatLocation(event),
        date: (() => {
          const date = new Date(event.startTime || Date.now());
          return Number.isNaN(date.getTime()) ? "" : `${date.getDate()}`.padStart(2, "0");
        })(),
        month: (() => {
          const date = new Date(event.startTime || Date.now());
          if (Number.isNaN(date.getTime())) return "";
          return date
            .toLocaleString("es-ES", { month: "short" })
            .replace(".", "")
            .toUpperCase();
        })(),
        image: getImageUrl(event.eventImage),
      }));
  }, [allEvents]);

  const categories = useMemo(() => {
    if (!allEvents.length) return CATEGORY_CHIPS_FALLBACK;
    const counts = new Map();
    allEvents.forEach((event) => {
      parseTags(event.eventTags).forEach((tag) => {
        const clean = tag.replace(/^#/, "").trim();
        if (!clean) return;
        counts.set(clean, (counts.get(clean) || 0) + 1);
      });
    });
    const palette = ["#ED8924", "#EA78BF", "#904CCC", "#009CAD"];
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([label], index) => ({
        label,
        color: palette[index % palette.length],
      }));
  }, [allEvents]);

  useEffect(() => {
    if (!isMobile || !tabLayoutsReady) return;
    const layout = tabLayouts.current[activeTab];
    if (!layout || !tabContainerWidth) return;
    const centerOffset = tabContainerWidth / 2 - layout.x - layout.width / 2;
    Animated.spring(tabTranslateX, {
      toValue: centerOffset,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
  }, [activeTab, isMobile, tabContainerWidth, tabLayoutsReady]);

  const contentWidth = isMobile ? styles.fullWidth : styles.maxWidth;

  return (
    <LinearGradient colors={tabStyle.gradient} style={styles.background}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <View style={[styles.topSection, contentWidth]}>
          <Text style={styles.logo}>GalapaGo.</Text>
          {isMobile ? (
            <View
              style={styles.tabsScrollView}
              onLayout={(e) => setTabContainerWidth(e.nativeEvent.layout.width)}
            >
              <Animated.View
                style={[
                  styles.tabsRow,
                  { transform: [{ translateX: tabTranslateX }] },
                ]}
              >
                {TABS.map((tab) => {
                  const isActive = tab.key === activeTab;
                  return (
                    <Pressable
                      key={tab.key}
                      onPress={() => setActiveTab(tab.key)}
                      onLayout={(e) => {
                        tabLayouts.current[tab.key] = e.nativeEvent.layout;
                        if (Object.keys(tabLayouts.current).length === TABS.length) {
                          setTabLayoutsReady(true);
                        }
                      }}
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
              </Animated.View>
            </View>
          ) : (
            <View style={styles.tabsRow}>
              {TABS.map((tab) => {
                const isActive = tab.key === activeTab;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => setActiveTab(tab.key)}
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
          <View style={styles.searchRow}>
            <Pressable style={styles.searchButton}>
              <Ionicons name="search" size={18} color="#99A0A0" />
              <Text style={styles.searchText}>Buscar</Text>
            </Pressable>
            <Pressable style={styles.filterButton}>
              <Ionicons name="options-outline" size={18} color="#99A0A0" />
            </Pressable>
          </View>
        </View>
        <View style={[styles.card, contentWidth]}>
          {isHoyTab ? (
            <ScrollView
              contentContainerStyle={styles.hoyContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Categorías de eventos populares
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryRow}
                >
                  {categories.map((chip) => (
                    <View
                      key={chip.label}
                      style={[styles.categoryChip, { backgroundColor: chip.color }]}
                    >
                      <Text style={styles.categoryText}>{chip.label}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Eventos Destacadados</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.featuredRow}
                  scrollEventThrottle={16}
                  onScroll={(e) => {
                    const cardStepWidth = 290 + 12;
                    const index = Math.round(e.nativeEvent.contentOffset.x / cardStepWidth);
                    setActiveFeaturedIndex(Math.max(0, Math.min(index, featuredEvents.length - 1)));
                  }}
                >
                  {featuredEvents.map((event) => (
                    <View key={event.title} style={styles.featuredCard}>
                      {event.image ? (
                        <Image
                          source={{ uri: event.image }}
                          style={styles.featuredImage}
                        />
                      ) : (
                        <View style={styles.featuredImageFallback} />
                      )}
                      <View style={styles.featuredDate}>
                        <Text style={styles.featuredDateDay}>{event.date}</Text>
                        <Text style={styles.featuredDateMonth}>{event.month}</Text>
                      </View>
                      <LinearGradient
                        colors={[
                          "rgba(27,34,34,0)",
                          "rgba(27,34,34,0.8)",
                        ]}
                        style={styles.featuredOverlay}
                      >
                        <Text style={styles.featuredLocation}>
                          {event.location}
                        </Text>
                        <Text style={styles.featuredTitle}>{event.title}</Text>
                      </LinearGradient>
                    </View>
                  ))}
                </ScrollView>
                <View style={styles.carouselRow}>
                  {featuredEvents.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.carouselDot,
                        index === activeFeaturedIndex && styles.carouselDotActive,
                      ]}
                    />
                  ))}
                </View>
              </View>
            </ScrollView>
          ) : (
            <>
              <View style={styles.dayRow}>
                {DAY_ITEMS.map((day) => {
                  const isActive = day.key === activeDay;
                  return (
                    <Pressable
                      key={day.key}
                      style={styles.dayItem}
                      onPress={() => setActiveDay(day.key)}
                    >
                      <Text
                        style={[
                          styles.dayLabel,
                          { color: isActive ? tabStyle.accent : inactiveColor },
                        ]}
                      >
                        {day.day}
                      </Text>
                      <Text
                        style={[
                          styles.dayNumber,
                          { color: isActive ? tabStyle.accent : inactiveColor },
                        ]}
                      >
                        {day.key}
                      </Text>
                      <Text
                        style={[
                          styles.dayMonth,
                          { color: isActive ? tabStyle.accent : inactiveColor },
                        ]}
                      >
                        {day.month}
                      </Text>
                      {isActive ? (
                        <View
                          style={[
                            styles.dayDot,
                            { backgroundColor: tabStyle.accent },
                          ]}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
              <ScrollView
                contentContainerStyle={styles.eventsContent}
                showsVerticalScrollIndicator={false}
              >
                {events.map((event, index) => (
                  <View key={`${event.title}-${index}`} style={styles.eventRow}>
                    <View
                      style={[
                        styles.eventBar,
                        { backgroundColor: tabStyle.accent },
                      ]}
                    />
                    <View style={styles.eventInfo}>
                      <Text
                        style={[
                          styles.eventTime,
                          { color: tabStyle.accent },
                        ]}
                      >
                        {formatTimeRange(event)}
                      </Text>
                      <Text style={styles.eventTitle}>{event.eventName}</Text>
                      <Text style={styles.eventLocation}>
                        {formatLocation(event)}
                      </Text>
                      <View style={styles.tagRow}>
                        {parseTags(event.eventTags).map((tag) => (
                          <View
                            key={tag}
                            style={[
                              styles.tagPill,
                              { backgroundColor: tagBackground },
                            ]}
                          >
                            <Text
                              style={[
                                styles.tagText,
                                { color: tabStyle.accent },
                              ]}
                            >
                              {tag}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </>
          )}
        </View>
      </View>
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
    paddingBottom: Platform.OS === "web" ? 24 : 0,
    alignItems: Platform.OS === "web" ? "center" : "stretch",
  },
  fullWidth: {
    width: "100%",
  },
  maxWidth: {
    width: "100%",
    maxWidth: 393,
  },
  topSection: {
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 30,
  },
  logo: {
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 30,
    color: "#FDFDFC",
  },
  tabsScrollView: {
    marginHorizontal: -30,
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
  searchText: {
    fontSize: 18,
    color: "#99A0A0",
  },
  filterButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "#FDFDFC",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    flex: 1,
    backgroundColor: "#FDFDFC",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: 18,
    paddingTop: 12,
  },
  hoyContent: {
    paddingTop: 10,
    paddingBottom: 24,
    gap: 28,
  },
  section: {
    gap: 14,
  },
  sectionTitle: {
    fontSize: 18,
    color: "#1B2222",
    lineHeight: 30,
    paddingHorizontal: 30,
  },
  categoryRow: {
    paddingHorizontal: 30,
    gap: 8,
  },
  categoryChip: {
    borderRadius: 30,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  categoryText: {
    color: "#FDFDFC",
    fontSize: 12,
    fontWeight: "600",
  },
  featuredRow: {
    paddingHorizontal: 30,
    gap: 12,
  },
  featuredCard: {
    width: 290,
    height: 230,
    borderRadius: 20,
    overflow: "hidden",
  },
  featuredImage: {
    width: "100%",
    height: "100%",
  },
  featuredImageFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: "#DDE1E1",
  },
  featuredDate: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "rgba(27,34,34,0.35)",
  },
  featuredDateDay: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FDFDFC",
  },
  featuredDateMonth: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FDFDFC",
  },
  featuredOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 12,
    gap: 6,
  },
  featuredLocation: {
    fontSize: 13,
    color: "#FDFDFC",
  },
  featuredTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FDFDFC",
  },
  carouselRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D0D3D3",
  },
  carouselDotActive: {
    backgroundColor: "#ED8924",
    width: 7,
    height: 7,
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 30,
    paddingTop: 12,
    paddingBottom: 6,
  },
  dayItem: {
    alignItems: "center",
    width: 36,
    gap: 2,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: "400",
  },
  dayNumber: {
    fontSize: 26,
    fontWeight: "700",
  },
  dayMonth: {
    fontSize: 14,
    fontWeight: "400",
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
  eventsContent: {
    paddingHorizontal: 30,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 24,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  eventBar: {
    width: 5,
    height: 110,
    borderRadius: 30,
    marginTop: 4,
  },
  eventInfo: {
    flex: 1,
    gap: 6,
  },
  eventTime: {
    fontSize: 13,
    fontWeight: "600",
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3C3E3E",
  },
  eventLocation: {
    fontSize: 16,
    fontWeight: "300",
    color: "#99A0A0",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  tagPill: {
    paddingHorizontal: 12,
    height: 26,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  tagText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
