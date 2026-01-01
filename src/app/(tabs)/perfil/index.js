// src/app/(tabs)/perfil/index.js
import { View, Text, StyleSheet, Platform, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import AuthBackground from "../../../components/auth/AuthBackground";
import AuthCard from "../../../components/auth/AuthCard";
import AuthButton from "../../../components/auth/AuthButton";
import ProfileAvatarBadge from "../../../components/profile/ProfileAvatarBadge";
import ProfileTabs from "../../../components/profile/ProfileTabs";
import ProfileEventCard from "../../../components/profile/ProfileEventCard";

export default function PerfilScreen() {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const topGap = 108;
  const topInset = Platform.OS === "ios" ? insets.top : 0;
  const cardHeight = Math.max(windowHeight - topGap - topInset, 0);

  return (
    <AuthBackground>
      <View style={styles.root}>
        <AuthCard style={[styles.card, { height: cardHeight }]}>
          <View style={styles.section}>
            <View style={styles.profileBlock}>
              <ProfileAvatarBadge />
              <Text style={styles.name}>Joche Vega</Text>
            </View>

            <View style={styles.buttonRow}>
              <AuthButton
                label="Ajustes"
                onPress={() => router.push("/(tabs)/perfil/settings")}
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
            activeKey="agenda"
          />

          <ProfileEventCard
            time="14 MAR — SABADO,  15:00"
            title="Festival de Arte en la Playa"
            location="La Nube, Isla Santa Cruz"
          />
        </AuthCard>
      </View>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  card: {
    height: 744,
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
});
