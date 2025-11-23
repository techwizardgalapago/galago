// src/hooks/useMedia.js
import { useWindowDimensions } from "react-native";
import { breakpoints } from "../theme/breakpoints";

export function useMedia() {
  const { width, height } = useWindowDimensions();

  const isMobile = width < breakpoints.tablet;
  const isTablet = width >= breakpoints.tablet && width < breakpoints.desktop;
  const isDesktop = width >= breakpoints.desktop && width < breakpoints.wide;
  const isWide = width >= breakpoints.wide;

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    isWide,
  };
}
