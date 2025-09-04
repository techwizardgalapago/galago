import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { useUsers } from "../../../hooks/useUsers";

// Small avatar from initials
const Avatar = ({ name = "", size = 40 }) => {
  const initials = useMemo(
    () =>
      name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0]?.toUpperCase())
        .join(""),
    [name]
  );
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={styles.avatarText}>{initials || "?"}</Text>
    </View>
  );
};

const Badge = ({ label }) => (
  <View style={styles.badge}>
    <Text style={styles.badgeText}>{label}</Text>
  </View>
);

export default function PerfilScreen() {
  const { users, status, error, refresh } = useUsers();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all"); // all | admin | user | other

  const onRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users
      .filter((u) =>
        roleFilter === "all"
          ? true
          : (u.userRole || "").toLowerCase() === roleFilter
      )
      .filter((u) => {
        if (!q) return true;
        const hay = [
          `${u.firstName ?? ""} ${u.lastName ?? ""}`,
          u.userEmail ?? "",
          u.countryOfOrigin ?? "",
          u.reasonForTravel ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
  }, [users, roleFilter, query]);

  const renderItem = ({ item }) => {
    const fullName =
      `${item.firstName ?? ""} ${item.lastName ?? ""}`.trim() || "Sin nombre";
    const sub = item.userEmail || "—";
    const metaLeft = item.countryOfOrigin ? `🌍 ${item.countryOfOrigin}` : null;
    const metaRight = item.dateOfBirth ? `🎂 ${item.dateOfBirth}` : null; // store format assumed ISO/string
    const role = item.userRole || "user";
    const synced = item.isSynced ? "Synced" : "Local";

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Avatar name={fullName} size={44} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.cardTitle}>{fullName}</Text>
            <Text style={styles.cardSubtitle}>{sub}</Text>
          </View>
          <Badge label={synced} />
        </View>

        <View style={styles.metaRow}>
          {!!metaLeft && <Text style={styles.metaText}>{metaLeft}</Text>}
          <View style={{ flex: 1 }} />
          {!!metaRight && <Text style={styles.metaText}>{metaRight}</Text>}
        </View>

        {(item.reasonForTravel || role) && (
          <View style={styles.tagsRow}>
            {role ? <Badge label={`Role: ${role}`} /> : null}
            {item.googleAccount ? <Badge label='Google' /> : null}
            {item.reasonForTravel ? (
              <Badge label={item.reasonForTravel} />
            ) : null}
          </View>
        )}

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => {
              /* TODO: navigate to user detail */
            }}
          >
            <Text style={styles.btnSecondaryText}>Ver detalles</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => {
              /* TODO: message / invite */
            }}
          >
            <Text style={styles.btnPrimaryText}>Contactar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Usuarios</Text>

      {/* Search + quick filters */}
      <View style={styles.searchRow}>
        <TextInput
          placeholder='Buscar por nombre, email, país...'
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
          clearButtonMode='while-editing'
        />
      </View>

      <View style={styles.segments}>
        {["all", "admin", "user", "other"].map((key) => (
          <TouchableOpacity
            key={key}
            onPress={() => setRoleFilter(key)}
            style={[styles.segment, roleFilter === key && styles.segmentActive]}
          >
            <Text
              style={[
                styles.segmentText,
                roleFilter === key && styles.segmentTextActive,
              ]}
            >
              {key === "all" ? "Todos" : key}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {status === "failed" ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateText}>Error: {error}</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(u) => u.userID}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={status === "loading"}
              onRefresh={onRefresh}
            />
          }
          ListEmptyComponent={() => (
            <View style={styles.stateBox}>
              <Text style={styles.stateText}>
                {query ? "Sin resultados" : "No hay usuarios"}
              </Text>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 16 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B0F14" },
  header: {
    fontSize: 28,
    fontWeight: "700",
    color: "white",
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },

  searchRow: { paddingHorizontal: 16, paddingBottom: 8 },
  searchInput: {
    backgroundColor: "#121821",
    borderWidth: 1,
    borderColor: "#1F2A37",
    color: "white",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },

  segments: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  segment: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  segmentActive: { backgroundColor: "#2563EB22", borderColor: "#2563EB" },
  segmentText: { color: "#9CA3AF", fontWeight: "600" },
  segmentTextActive: { color: "#BFDBFE" },

  card: {
    backgroundColor: "#0E1520",
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#18212F",
  },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  cardTitle: { color: "white", fontSize: 16, fontWeight: "700" },
  cardSubtitle: { color: "#9CA3AF", fontSize: 13, marginTop: 2 },

  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  metaText: { color: "#93C5FD", fontSize: 12 },

  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  badge: {
    backgroundColor: "#111827",
    borderColor: "#1F2937",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { color: "#E5E7EB", fontSize: 12, fontWeight: "600" },

  cardActions: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  btnPrimary: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  btnPrimaryText: { color: "white", fontWeight: "700" },
  btnSecondary: {
    backgroundColor: "#121821",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  btnSecondaryText: { color: "#E5E7EB", fontWeight: "600" },

  stateBox: { padding: 24, alignItems: "center" },
  stateText: { color: "#9CA3AF" },

  avatar: {
    backgroundColor: "#1F2937",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#E5E7EB", fontWeight: "800" },
});
