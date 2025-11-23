// src/components/Input.js
import React from 'react';
import { TextInput, Platform } from 'react-native';
import { useMedia } from '../hooks/useMedia';

export default function Input(props) {
  const { isMobile, isTablet, isDesktop, isWide } = useMedia();

  // Base style (shared)
  const base = {
    width: '100%',
    backgroundColor: '#EDEDED',
    fontSize: 16,
  };

  // Size variants per breakpoint
  let sizeStyle = {};

  if (isMobile) {
    // 📱 Mobile: big & comfy
    sizeStyle = {
      height: 48,
      paddingHorizontal: 16,
      borderRadius: 30,
      paddingVertical: Platform.OS === 'web' ? 10 : 12,
    };
  } else if (isTablet) {
    // 📲 Tablet: slightly slimmer but still touch-friendly
    sizeStyle = {
      height: 46,
      paddingHorizontal: 16,
      borderRadius: 26,
      paddingVertical: 10,
    };
  } else {
    // 🖥️ Desktop / wide: more “web form” style
    sizeStyle = {
      height: 40,
      paddingHorizontal: 14,
      borderRadius: 20,
      paddingVertical: 8,
    };
  }

  return (
    <TextInput
      {...props}
      style={[
        base,
        sizeStyle,
        props.style, // allow overrides
      ]}
    />
  );
}
