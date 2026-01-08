import { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { useMedia } from "../../../hooks/useMedia";

const TABS = [
  { key: "hoy", label: "Hoy en la isla" },
  { key: "agenda", label: "Agenda" },
  { key: "regeneracion", label: "Regeneracion" },
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

const EVENTS_BY_TAB = {
  agenda: [
    {
      time: "15:00 - 17:00",
      title: "Festival de Arte en la Playa",
      location: "La Nube, Isla Santa Cruz",
      tags: ["#exhibiciones", "#aire libre", "#talleres"],
    },
    {
      time: "19:00 - 21:00",
      title: "Rolls, Sake, y Cana",
      location: "Noe Sushi Bar, Isla Isabela",
      tags: ["#gastronomia", "#cocteles"],
    },
    {
      time: "19:00 - 22:00",
      title: "Noche de Wes Anderson Bajo Las Estrellas",
      location: "La Nube, Isla Santa Cruz",
      tags: ["#cine", "#aire libre", "#cocteles"],
    },
  ],
  regeneracion: [
    {
      time: "15:00 - 17:00",
      title: "Minga de recoleccion de basura",
      location: "Tortuga Bay, Isla Santa Cruz",
      tags: ["#regeneracion", "#aire libre", "#talleres"],
    },
    {
      time: "19:00 - 21:00",
      title: "Workshop: Reciclando correctamente",
      location: "Plaza Central, Isla Isabela",
      tags: ["#talleres", "#charlas"],
    },
    {
      time: "19:00 - 22:00",
      title: "Galeria de arte hecha en plastico",
      location: "La Nube, Isla Santa Cruz",
      tags: ["#arte", "#galeria", "#regeneracion"],
    },
  ],
  hoy: [
    {
      time: "10:00 - 12:00",
      title: "Taller de fotografia en la isla",
      location: "Puerto Ayora, Isla Santa Cruz",
      tags: ["#fotografia", "#aire libre"],
    },
    {
      time: "15:00 - 17:00",
      title: "Festival de Arte en la Playa",
      location: "La Nube, Isla Santa Cruz",
      tags: ["#exhibiciones", "#aire libre", "#talleres"],
    },
    {
      time: "19:00 - 21:00",
      title: "Concierto acustico al atardecer",
      location: "Malecon, Isla Isabela",
      tags: ["#musica", "#cocteles"],
    },
  ],
};

const TAB_STYLES = {
  hoy: {
    accent: "#F26719",
    gradient: ["#1E7BB6", "#1A9BB3", "#53BEA8"],
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

export default function HoyEnLaIslaScreen() {
  const { isMobile } = useMedia();
  const [activeTab, setActiveTab] = useState("agenda");
  const [activeDay, setActiveDay] = useState(DAY_ITEMS[0].key);

  const tabStyle = TAB_STYLES[activeTab] || TAB_STYLES.agenda;
  const inactiveColor =
    activeTab === "regeneracion"
      ? "rgba(107, 143, 31, 0.5)"
      : "rgba(242, 103, 25, 0.5)";
  const tagBackground =
    activeTab === "regeneracion"
      ? "rgba(107, 143, 31, 0.12)"
      : "rgba(242, 103, 25, 0.1)";

  const events = useMemo(() => EVENTS_BY_TAB[activeTab] || [], [activeTab]);
  const contentWidth = isMobile ? styles.fullWidth : styles.maxWidth;

  return (
    <LinearGradient colors={tabStyle.gradient} style={styles.background}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <View style={[styles.topSection, contentWidth]}>
          <Text style={styles.logo}>GalapaGo.</Text>
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
                  style={[styles.eventBar, { backgroundColor: tabStyle.accent }]}
                />
                <View style={styles.eventInfo}>
                  <Text
                    style={[
                      styles.eventTime,
                      { color: tabStyle.accent },
                    ]}
                  >
                    {event.time}
                  </Text>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventLocation}>{event.location}</Text>
                  <View style={styles.tagRow}>
                    {event.tags.map((tag) => (
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
    paddingTop: 40,
    paddingHorizontal: 16,
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
    gap: 16,
  },
  logo: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FDFDFC",
  },
  tabsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 22,
  },
  tabText: {
    fontSize: 24,
    fontWeight: "700",
    textTransform: "uppercase",
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
    paddingTop: 8,
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 22,
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
    paddingHorizontal: 26,
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
