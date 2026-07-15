import { locales, type Locale } from "@/i18n/routing";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://suplymate.com"
).replace(/\/$/, "");

/** Build locale-prefixed absolute URL for SEO alternates. */
export function localeAbsoluteUrl(locale: string, pathname = ""): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const suffix = path === "/" ? "" : path;
  return `${SITE_URL}/${locale}${suffix}`;
}

/** hreflang alternates for all supported locales. */
export function buildHreflangAlternates(pathname = ""): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of locales) {
    languages[locale] = localeAbsoluteUrl(locale, pathname);
  }
  languages["x-default"] = localeAbsoluteUrl("en", pathname);
  return languages;
}

export function buildPageAlternates(
  locale: Locale,
  pathname = "",
): { canonical: string; languages: Record<string, string> } {
  return {
    canonical: localeAbsoluteUrl(locale, pathname),
    languages: buildHreflangAlternates(pathname),
  };
}
