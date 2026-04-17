export const LOCALE_COOKIE = "farm-domain.locale";
export const LOCALES = ["th", "en"] as const;
export const DEFAULT_LOCALE = "th" as const;

export type Locale = (typeof LOCALES)[number];

export function isLocale(value: string): value is Locale {
  return LOCALES.includes(value as Locale);
}
