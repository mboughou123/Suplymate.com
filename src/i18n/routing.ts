import { defineRouting } from "next-intl/routing";

export const locales = ["en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/**
 * Locales that were previously served publicly and may still be indexed or
 * linked from elsewhere.
 *
 * The generated translations for these were produced by word-substituting a
 * French rendering, which corrupted ICU placeholders and left French text in
 * every language, so the public site is English-only until real translations
 * exist. Their `messages/*.json` files and `scripts/translation-maps/*.json`
 * stay in the repo so translation can resume without redoing the plumbing.
 *
 * Requests to these prefixes are permanently redirected to the English
 * equivalent (see `src/middleware.ts`) rather than 404ing, so inbound links
 * and accumulated search ranking are preserved.
 */
export const retiredLocales = [
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

export type RetiredLocale = (typeof retiredLocales)[number];

export function isRetiredLocale(segment: string): segment is RetiredLocale {
  return (retiredLocales as readonly string[]).includes(segment);
}

/** Native display names — no flags (language ≠ country). */
export const localeNames: Record<Locale, string> = {
  en: "English",
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

/**
 * Strip the leading locale segment from a pathname (e.g. `/en/suppliers` →
 * `/suppliers`). Retired prefixes are stripped too, so route classification
 * (such as the protected-route check) behaves correctly for legacy URLs that
 * arrive before the redirect resolves them.
 */
export function stripLocalePrefix(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];
  if (
    first &&
    ((locales as readonly string[]).includes(first) || isRetiredLocale(first))
  ) {
    const rest = segments.slice(1).join("/");
    return rest ? `/${rest}` : "/";
  }
  return pathname;
}

export function isRtlLocale(locale: string): boolean {
  return locale === "ar";
}
