# Agent Rules (Galago)

These rules apply when translating Figma MCP output into this codebase.

## Stack and styling
- Use React Native + Expo Router components (no web-only elements).
- Convert any Tailwind or web-style output into `StyleSheet.create` objects.
- Avoid inline styles except for simple one-off overrides; prefer `styles.*`.
- Do not add new dependencies unless explicitly requested.

## Layout and components
- Prefer existing primitives: `Container` (`src/components/Container.js`) and `Input` (`src/components/Input.js`) when they match the design.
- Use `View`, `Text`, `Image`, `Pressable`, `TouchableOpacity`, and `FlatList` from `react-native`.
- For navigation, use `expo-router` (`router.push`, `Link`) to match current patterns.

## Responsiveness
- Use `useMedia` (`src/hooks/useMedia.js`) for breakpoint-aware sizing when needed.
- Respect existing breakpoints from `src/theme/breakpoints.js`.

## Assets
- If Figma provides image URLs, render with `<Image source={{ uri }} />`.
- Keep assets remote unless the user asks to download or bundle them.

## Gradients
- No gradient library is installed. If a Figma design uses gradients, either:
  - Approximate with a solid color that matches the dominant tone, or
  - Ask the user before adding `expo-linear-gradient`.

## Naming and structure
- Use descriptive component names and keep new screens under `src/app/...`.
- Keep style keys in camelCase and align with existing files.

## Figma-to-code conversion
- Map Figma frames to React Native layout using flexbox.
- Preserve spacing, typography, and colors as closely as possible.
- If the Figma output includes `data-node-id`, omit it in React Native code.
- Ignore any Figma status bar blocks (iOS/Android system UI).
