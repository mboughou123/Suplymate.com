import { describe, expect, it } from "vitest";
import {
  defaultLocale,
  isRetiredLocale,
  isRtlLocale,
  locales,
  retiredLocales,
  stripLocalePrefix,
} from "@/i18n/routing";
import { resolveBrowserLocale } from "@/i18n/locale-detection";
import { buildHreflangAlternates, localeAbsoluteUrl } from "@/lib/locale-metadata";

describe("stripLocalePrefix", () => {
  it("removes the active locale prefix", () => {
    expect(stripLocalePrefix("/en/suppliers")).toBe("/suppliers");
    expect(stripLocalePrefix("/en")).toBe("/");
  });

  // Legacy URLs must still classify correctly (e.g. protected-route checks)
  // during the request that redirects them to English.
  it("removes retired locale prefixes", () => {
    expect(stripLocalePrefix("/fr/suppliers")).toBe("/suppliers");
    expect(stripLocalePrefix("/ar/dashboard/settings")).toBe(
      "/dashboard/settings",
    );
  });

  it("leaves paths without locale unchanged", () => {
    expect(stripLocalePrefix("/suppliers")).toBe("/suppliers");
    expect(stripLocalePrefix("/api/health")).toBe("/api/health");
  });

  it("does not strip unknown two-letter segments", () => {
    expect(stripLocalePrefix("/xx/products")).toBe("/xx/products");
  });
});

describe("isRetiredLocale", () => {
  it("identifies previously-served locales", () => {
    expect(isRetiredLocale("fr")).toBe(true);
    expect(isRetiredLocale("zh")).toBe(true);
  });

  it("rejects the active locale and unknown segments", () => {
    expect(isRetiredLocale("en")).toBe(false);
    expect(isRetiredLocale("suppliers")).toBe(false);
    expect(isRetiredLocale("xx")).toBe(false);
  });

  it("never overlaps the active locale list", () => {
    for (const retired of retiredLocales) {
      expect((locales as readonly string[]).includes(retired)).toBe(false);
    }
  });
});

describe("isRtlLocale", () => {
  it("returns true only for Arabic", () => {
    expect(isRtlLocale("ar")).toBe(true);
    expect(isRtlLocale("en")).toBe(false);
  });
});

describe("resolveBrowserLocale", () => {
  // The site is English-only, so every Accept-Language resolves to English.
  it("resolves retired languages to the default locale", () => {
    expect(resolveBrowserLocale("fr")).toBe(defaultLocale);
    expect(resolveBrowserLocale("ja,en;q=0.9")).toBe(defaultLocale);
    expect(resolveBrowserLocale("fr-CA,en;q=0.8")).toBe(defaultLocale);
  });

  it("falls back to English for unsupported languages", () => {
    expect(resolveBrowserLocale("sv,nb")).toBe(defaultLocale);
    expect(resolveBrowserLocale(null)).toBe(defaultLocale);
    expect(resolveBrowserLocale("")).toBe(defaultLocale);
  });

  it("still detects English", () => {
    expect(resolveBrowserLocale("en-GB,en;q=0.9")).toBe("en");
  });
});

describe("locale metadata", () => {
  it("builds locale-prefixed absolute URLs", () => {
    expect(localeAbsoluteUrl("en", "/suppliers")).toBe(
      "https://suplymate.com/en/suppliers",
    );
    expect(localeAbsoluteUrl("en", "")).toBe("https://suplymate.com/en");
  });

  // Advertising hreflang for locales the site no longer serves would point
  // crawlers at redirects.
  it("advertises only served locales plus x-default", () => {
    const languages = buildHreflangAlternates("/pricing");
    expect(Object.keys(languages)).toHaveLength(locales.length + 1);
    expect(languages.en).toBe("https://suplymate.com/en/pricing");
    expect(languages["x-default"]).toBe("https://suplymate.com/en/pricing");
    for (const retired of retiredLocales) {
      expect(languages[retired]).toBeUndefined();
    }
  });
});

describe("locales configuration", () => {
  it("serves English only", () => {
    expect([...locales]).toEqual(["en"]);
  });

  it("retains the retired locales for redirect handling", () => {
    expect([...retiredLocales]).toEqual([
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
    ]);
  });
});
