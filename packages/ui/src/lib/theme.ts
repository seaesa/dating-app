import { useColorScheme as useRNColorScheme } from "react-native";

import { THEME_COLORS } from "@repo/tailwind-config/colors";

/**
 * Navigation themes.
 *
 * React Navigation takes finished colours rather than Tailwind classes, so the
 * values come from @repo/tailwind-config/colors — which a test pins against
 * theme.css, so a brand change cannot leave these behind.
 */
export const NAV_THEME = {
  light: {
    background: THEME_COLORS.light.background,
    border: THEME_COLORS.light.border,
    card: THEME_COLORS.light.card,
    notification: THEME_COLORS.light.destructive,
    primary: THEME_COLORS.light.primary,
    text: THEME_COLORS.light.foreground,
  },
  dark: {
    background: THEME_COLORS.dark.background,
    border: THEME_COLORS.dark.border,
    card: THEME_COLORS.dark.card,
    notification: THEME_COLORS.dark.destructive,
    primary: THEME_COLORS.dark.primary,
    text: THEME_COLORS.dark.foreground,
  },
} as const;

export function useColorScheme(): "light" | "dark" {
  return useRNColorScheme() === "dark" ? "dark" : "light";
}
