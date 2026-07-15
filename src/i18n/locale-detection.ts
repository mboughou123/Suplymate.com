import { defaultLocale, locales, type Locale } from "./routing";

/**
 * Resolve the best supported locale from an Accept-Language header value.
 * Falls back to English when no supported language is found.
 */
export function resolveBrowserLocale(
  acceptLanguage: string | null | undefined,
): Locale {
  if (!acceptLanguage) return defaultLocale;

  const tags = acceptLanguage
    .split(",")
    .map((part) => part.trim().split(";")[0]?.toLowerCase())
    .filter(Boolean) as string[];

  for (const tag of tags) {
    if (locales.includes(tag as Locale)) return tag as Locale;
    const primary = tag.split("-")[0];
    if (locales.includes(primary as Locale)) return primary as Locale;
  }

  return defaultLocale;
}
