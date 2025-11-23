// src/components/Container.js
import { View } from "react-native";
import { useMedia } from "../hooks/useMedia";

export default function Container({ children, style, centered = false }) {
  const { isMobile, isTablet, isDesktop, isWide } = useMedia();

  // You can tweak these values
  let maxWidth = 600;
  if (isTablet) maxWidth = 900;
  if (isDesktop) maxWidth = 1200;
  if (isWide) maxWidth = 1400;

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: centered ? "center" : "flex-start",
        paddingHorizontal: isMobile ? 16 : 24,
        paddingVertical: isMobile ? 16 : 32,
      }}
    >
      <View style={[{ width: "100%", maxWidth, flex: 1 }, style]}>{children}</View>
    </View>
  );
}
