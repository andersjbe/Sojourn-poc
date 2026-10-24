import { Platform } from "react-native";

// Sojourn — "a map and a journal on a table": parchment, forest ink, moss,
// bark, and rust; sharp edges throughout.
const sharedColors = {
  success: "#5B7553",
  destructive: "#A4532B",
  destructiveForeground: "#F2EBDD",
  warning: "#C28E3A",
  info: "#4E6E7A",
} as const;

const fonts = {
  serif: Platform.select({ ios: "Georgia", android: "serif", default: "Georgia, serif" }),
  mono: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
  sans: Platform.select({ ios: "System", android: "sans-serif", default: "system-ui" }),
} as const;

const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
const borderRadius = { sm: 0, md: 1, lg: 2, xl: 2 } as const;
const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
} as const;

export const lightTheme = {
  colors: {
    ...sharedColors,
    typography: "#1F2420",
    background: "#F2EBDD",
    foreground: "#1F2420",
    card: "#F8F3E8",
    cardForeground: "#1F2420",
    primary: "#2F4A3A",
    primaryForeground: "#F2EBDD",
    secondary: "#D9C9A8",
    secondaryForeground: "#1F2420",
    muted: "#E6DCC6",
    mutedForeground: "#5E5A4E",
    accent: "#A3B18A",
    accentForeground: "#1F2420",
    border: "#CBBB98",
    input: "#CBBB98",
    ring: "#5B7553",
  },
  spacing,
  borderRadius,
  fontSize,
  fonts,
} as const;

export const darkTheme = {
  colors: {
    ...sharedColors,
    destructive: "#D07A4F",
    typography: "#EBE3D2",
    background: "#171C18",
    foreground: "#EBE3D2",
    card: "#1F2620",
    cardForeground: "#EBE3D2",
    primary: "#A3B18A",
    primaryForeground: "#171C18",
    secondary: "#3A3428",
    secondaryForeground: "#EBE3D2",
    muted: "#262D27",
    mutedForeground: "#A69F8C",
    accent: "#34442F",
    accentForeground: "#EBE3D2",
    border: "#3B443A",
    input: "#3B443A",
    ring: "#A3B18A",
  },
  spacing,
  borderRadius,
  fontSize,
  fonts,
} as const;
