export const APP_NAME = "AnnyTrade";
export const APP_SHORT_NAME = "AnnyTrade";

export const THEME = {
  storageKey: "annytrade-theme",
  defaultTheme: "system" as const,
  colorSchemes: ["light", "dark"] as const,
  options: ["light", "dark", "system"] as const,
} as const;

export type ThemeOption = (typeof THEME.options)[number];
