import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import { SITE_NAV, navHrefPathname, navItemLinks, SOLUTIONS_COLUMN_SIZE } from "@/lib/site-nav";

function lookup(key: string): unknown {
  return key.split(".").reduce<unknown>((cur, part) => {
    if (cur && typeof cur === "object") return (cur as Record<string, unknown>)[part];
    return undefined;
  }, en.megaMenu);
}

/** Every i18n key referenced by the nav model, including panel-only copy. */
function collectKeys(): string[] {
  const keys: string[] = [];
  for (const item of SITE_NAV) {
    keys.push(item.labelKey);
    if (item.kind === "products") {
      keys.push(item.intro.headingKey, item.intro.bodyKey);
      keys.push(
        item.featured.titlePrefixKey,
        item.featured.titleAccentKey,
        item.featured.titleSuffixKey,
        item.featured.blurbKey,
      );
    }
    if (item.kind === "columns") keys.push(...item.columns.map((c) => c.titleKey));
    for (const link of navItemLinks(item)) {
      if (link.labelKey) keys.push(link.labelKey);
      if (link.descriptionKey) keys.push(link.descriptionKey);
    }
  }
  return keys;
}

describe("site navigation model", () => {
  it("has the expected top-level order", () => {
    expect(SITE_NAV.map((i) => i.id)).toEqual([
      "products",
      "solutions",
      "suppliers",
      "materials",
      "pricing",
      "company",
    ]);
  });

  it("resolves every i18n key in the megaMenu namespace", () => {
    for (const key of collectKeys()) {
      expect(typeof lookup(key), key).toBe("string");
    }
  });

  it("gives every link either a translated or a literal label", () => {
    for (const item of SITE_NAV) {
      for (const link of navItemLinks(item)) {
        expect(Boolean(link.labelKey || link.label), `${item.id} → ${link.href}`).toBe(true);
      }
    }
  });

  it("only links to existing locale-aware pages", () => {
    for (const item of SITE_NAV) {
      for (const link of navItemLinks(item)) {
        const pathname = navHrefPathname(link.href);
        const file = resolve(process.cwd(), "src/app/[locale]", pathname === "/" ? "page.tsx" : `${pathname.slice(1)}/page.tsx`);
        expect(existsSync(file), `${item.id} → ${link.href}`).toBe(true);
      }
    }
  });

  it("does not expose a cart anywhere in the navigation", () => {
    for (const item of SITE_NAV) {
      for (const link of navItemLinks(item)) {
        expect(link.href).not.toMatch(/cart/i);
      }
    }
  });

  it("fills each Solutions column with up to the configured number of entries", () => {
    const solutions = SITE_NAV.find((i) => i.id === "solutions");
    expect(solutions?.kind).toBe("columns");
    if (solutions?.kind !== "columns") return;
    expect(solutions.columns).toHaveLength(3);
    for (const column of solutions.columns) {
      expect(column.links.length).toBeGreaterThan(0);
      expect(column.links.length).toBeLessThanOrEqual(SOLUTIONS_COLUMN_SIZE);
    }
  });
});
