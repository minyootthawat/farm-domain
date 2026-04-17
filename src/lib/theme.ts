export const THEME_COOKIE = "farm-domain.theme";
export const THEMES = ["light", "dark"] as const;
export const DEFAULT_THEME = "light" as const;

export type Theme = (typeof THEMES)[number];

export function isTheme(value: string): value is Theme {
  return THEMES.includes(value as Theme);
}
