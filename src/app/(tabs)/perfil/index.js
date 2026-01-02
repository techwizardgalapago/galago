// src/app/(tabs)/perfil/index.js
import { View, Text, StyleSheet, Platform, ScrollView } from "react-native";
import { useState } from "react";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import AuthBackground from "../../../components/auth/AuthBackground";
import AuthCard from "../../../components/auth/AuthCard";
import AuthButton from "../../../components/auth/AuthButton";
import ProfileAvatarBadge from "../../../components/profile/ProfileAvatarBadge";
import ProfileTabs from "../../../components/profile/ProfileTabs";
import ProfileEventCard from "../../../components/profile/ProfileEventCard";
import PlaceCard from "../../../components/profile/PlaceCard";
import { joinFullName } from "../../../features/users/profileComplition";

export default function PerfilScreen() {
  const [activeTab, setActiveTab] = useState("saved");
  const insets = useSafeAreaInsets();
  const user = useSelector((s) => s.auth?.user);
  const topGap = 108;
  const topInset = Platform.OS === "ios" ? insets.top : 0;
  const fullName =
    user?.fullName || joinFullName(user?.firstName, user?.lastName) || "—";

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
            activeKey={activeTab}
            onChange={setActiveTab}
          />

          {activeTab === "agenda" ? (
            <ProfileEventCard
              time="14 MAR — SABADO,  15:00"
              title="Festival de Arte en la Playa"
              location="La Nube, Isla Santa Cruz"
            />
          ) : activeTab === "saved" ? (
            <PlaceCard
              imageUri="http://localhost:3845/assets/8f3b703d2ec1c2c8c7ac7943b1e03040da211ef5.png"
              title="Shawarmi"
              location="Isla Isabela"
              rating="4.3"
              category="Ecuatoriana"
              price="$$$$"
            />
          ) : (
            <PlaceCard
              imageUri="http://localhost:3845/assets/a3f20e0c3dfebaa77127b55bc2623843a28b40c6.png"
              title="La Loberia"
              location="Isla San Cristobal"
            />
          )}
        </AuthCard>
      </ScrollView>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
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
