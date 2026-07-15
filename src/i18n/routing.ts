import { defineRouting } from "next-intl/routing";

export const locales = [
  "en",
  "fr",
  "ar",
  "es",
  "de",
  "it",
  "pt",
  "nl",
  "tr",
  "zh",
  "ja",
  "ko",
  "hi",
] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/** Native display names — no flags (language ≠ country). */
export const localeNames: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  ar: "العربية",
  es: "Español",
  de: "Deutsch",
  it: "Italiano",
  pt: "Português",
  nl: "Nederlands",
  tr: "Türkçe",
  zh: "中文",
  ja: "日本語",
  ko: "한국어",
  hi: "हिन्दी",
};

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
  localeCookie: {
    name: "NEXT_LOCALE",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  },
});

/** Strip the leading locale segment from a pathname (e.g. `/fr/suppliers` → `/suppliers`). */
export function stripLocalePrefix(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && locales.includes(segments[0] as Locale)) {
    const rest = segments.slice(1).join("/");
    return rest ? `/${rest}` : "/";
  }
  return pathname;
}

export function isRtlLocale(locale: string): boolean {
  return locale === "ar";
}
