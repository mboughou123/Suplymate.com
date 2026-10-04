import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import en from "../../../messages/en.json";
import providersJson from "@/data/logistics-providers.json";
import contactsJson from "@/data/logistics-provider-contacts.json";
import {
  LOGISTICS_PROVIDERS,
  getLogisticsProvider,
  isInsuranceProvider,
  logisticsDirectoryHref,
  providerInitials,
  providerMatches,
} from "@/data/logistics-providers";
import { getFallbackSupplierIds } from "@/lib/data-service";
import { normalizeEmail, normalizePhone } from "@/lib/scraper/contactExtractor";

const host = (url: string) => new URL(url).hostname.replace(/^www\./, "");
/** Last two labels, or three for second-level country domains (co.uk). */
const site = (url: string) => {
  const parts = host(url).split(".");
  return parts.slice(/^(co|com)$/.test(parts[parts.length - 2]) && parts.length > 2 ? -3 : -2).join(".");
};
/** Official quote / source domains that differ from the homepage's. */
const SISTER_DOMAINS: Record<string, string[]> = {
  "ups-capital-cargo-insurance": ["insureshield.com"],
  "falvey-cargo": ["falveycargo.com"],
};

describe("Logistics & Insurance directory data", () => {
  it("has 15–30 providers with unique ids", () => {
    expect(LOGISTICS_PROVIDERS.length).toBeGreaterThanOrEqual(15);
    expect(LOGISTICS_PROVIDERS.length).toBeLessThanOrEqual(30);
    const ids = LOGISTICS_PROVIDERS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("never shares a slug with a supplier (the contact API resolves both)", () => {
    const supplierIds = new Set(getFallbackSupplierIds());
    for (const p of LOGISTICS_PROVIDERS) expect(supplierIds.has(p.id), p.id).toBe(false);
  });

  it("is mostly insurers, with a few forwarders and customs brokers", () => {
    const insurers = LOGISTICS_PROVIDERS.filter(isInsuranceProvider);
    expect(insurers.length).toBeGreaterThanOrEqual(15);
    expect(LOGISTICS_PROVIDERS.length - insurers.length).toBeGreaterThan(0);
  });

  it("only links to each provider's own https site", () => {
    for (const p of LOGISTICS_PROVIDERS) {
      const allowed = new Set([site(p.homepage), ...(SISTER_DOMAINS[p.id] ?? [])]);
      for (const url of [p.website, p.homepage, ...(p.quoteUrl ? [p.quoteUrl] : []), ...p.sourceUrls]) {
        expect(url, p.id).toMatch(/^https:\/\//);
        expect(allowed.has(site(url)), `${p.id}: ${url}`).toBe(true);
      }
      expect(p.sourceUrls.length, p.id).toBeGreaterThan(0);
    }
  });

  it("has real descriptive content for every provider", () => {
    for (const p of LOGISTICS_PROVIDERS) {
      expect(p.description.length, p.id).toBeGreaterThan(60);
      expect(p.coverage.length, p.id).toBeGreaterThanOrEqual(3);
      expect(p.markets.length, p.id).toBeGreaterThan(0);
      expect(providerInitials(p)).toMatch(/^[A-Z0-9]{1,2}$/);
    }
  });

  it("never calls anyone a partner", () => {
    const text = JSON.stringify([providersJson, contactsJson, en.logistics]).toLowerCase();
    expect(text).not.toMatch(/partner/);
  });

  it("keeps phone and email out of the client-safe dataset", () => {
    const text = JSON.stringify(providersJson);
    expect(text).not.toMatch(/"(phone|email)"/);
    for (const c of Object.values(contactsJson.suppliers)) {
      if ("phone" in c) expect(text).not.toContain(c.phone);
      if ("email" in c) expect(text).not.toContain(c.email);
    }
  });

  it("stores only valid, sourced contact details for known providers", () => {
    for (const [id, c] of Object.entries(contactsJson.suppliers) as [string, Record<string, string>][]) {
      const provider = getLogisticsProvider(id);
      expect(provider, id).toBeDefined();
      if (c.phone) {
        expect(normalizePhone(c.phone), `${id} phone`).not.toBeNull();
        expect(site(c.phoneSourceUrl), id).toBe(site(provider!.homepage));
      }
      if (c.email) {
        expect(normalizeEmail(c.email), `${id} email`).not.toBeNull();
        expect(site(c.emailSourceUrl), id).toBe(site(provider!.homepage));
      }
      expect(c.phone || c.email, id).toBeTruthy();
    }
  });

  it("looks providers up case-insensitively and searches their content", () => {
    expect(getLogisticsProvider(" LOADSURE ")?.id).toBe("loadsure");
    expect(getLogisticsProvider("nope")).toBeUndefined();
    const loadsure = getLogisticsProvider("loadsure")!;
    expect(providerMatches(loadsure, "stock throughput")).toBe(true);
    expect(providerMatches(loadsure, "zzz")).toBe(false);
  });

  it("deep-links into the supplier directory", () => {
    expect(logisticsDirectoryHref()).toBe("/suppliers?industry=logistics-insurance");
    expect(logisticsDirectoryHref("insurance")).toBe("/suppliers?industry=logistics-insurance&type=insurance");
  });
});
