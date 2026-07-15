import { describe, expect, it } from "vitest";
import {
  defaultLocale,
  isRtlLocale,
  locales,
  stripLocalePrefix,
} from "@/i18n/routing";
import { resolveBrowserLocale } from "@/i18n/locale-detection";
import { buildHreflangAlternates, localeAbsoluteUrl } from "@/lib/locale-metadata";

describe("stripLocalePrefix", () => {
  it("removes supported locale prefixes", () => {
    expect(stripLocalePrefix("/fr/suppliers")).toBe("/suppliers");
    expect(stripLocalePrefix("/ar/dashboard/settings")).toBe(
      "/dashboard/settings",
    );
    expect(stripLocalePrefix("/en")).toBe("/");
  });

  it("leaves paths without locale unchanged", () => {
    expect(stripLocalePrefix("/suppliers")).toBe("/suppliers");
    expect(stripLocalePrefix("/api/health")).toBe("/api/health");
  });

  it("does not strip unsupported two-letter segments", () => {
    expect(stripLocalePrefix("/xx/products")).toBe("/xx/products");
  });
});

describe("isRtlLocale", () => {
  it("returns true only for Arabic", () => {
    expect(isRtlLocale("ar")).toBe(true);
    expect(isRtlLocale("en")).toBe(false);
    expect(isRtlLocale("fr")).toBe(false);
  });
});

describe("resolveBrowserLocale", () => {
  it("detects exact locale matches", () => {
    expect(resolveBrowserLocale("fr")).toBe("fr");
    expect(resolveBrowserLocale("ja,en;q=0.9")).toBe("ja");
  });

  it("maps region subtags to primary language", () => {
    expect(resolveBrowserLocale("fr-CA,en;q=0.8")).toBe("fr");
    expect(resolveBrowserLocale("zh-CN,zh;q=0.9,en;q=0.8")).toBe("zh");
  });

  it("falls back to English for unsupported languages", () => {
    expect(resolveBrowserLocale("sv,nb")).toBe(defaultLocale);
    expect(resolveBrowserLocale(null)).toBe(defaultLocale);
    expect(resolveBrowserLocale("")).toBe(defaultLocale);
  });
});

describe("locale metadata", () => {
  it("builds locale-prefixed absolute URLs", () => {
    expect(localeAbsoluteUrl("fr", "/suppliers")).toBe(
      "https://suplymate.com/fr/suppliers",
    );
    expect(localeAbsoluteUrl("en", "")).toBe("https://suplymate.com/en");
  });

  it("builds hreflang alternates for every locale plus x-default", () => {
    const languages = buildHreflangAlternates("/pricing");
    expect(Object.keys(languages)).toHaveLength(locales.length + 1);
    expect(languages.fr).toBe("https://suplymate.com/fr/pricing");
    expect(languages["x-default"]).toBe("https://suplymate.com/en/pricing");
  });
});

describe("locales configuration", () => {
  it("includes all required locale codes", () => {
    const expected = [
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
    ];
    expect([...locales]).toEqual(expected);
  });
});
