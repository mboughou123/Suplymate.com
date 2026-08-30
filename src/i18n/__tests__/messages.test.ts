import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";

/** Recursively collect all leaf string keys from a nested object. */
function collectKeys(
  obj: Record<string, unknown>,
  prefix = "",
): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      keys.push(path);
    } else if (value && typeof value === "object") {
      keys.push(...collectKeys(value as Record<string, unknown>, path));
    }
  }
  return keys;
}

describe("messages/en.json", () => {
  it("has required top-level namespaces", () => {
    const namespaces = [
      "metadata",
      "navigation",
      "footer",
      "languageSelector",
      "common",
      "home",
      "homeAiDemo",
      "authentication",
      "errors",
      "suppliers",
      "products",
      "supplierProfile",
    ];
    for (const ns of namespaces) {
      expect(en).toHaveProperty(ns);
    }
  });

  it("has no empty translation values", () => {
    const keys = collectKeys(en as Record<string, unknown>);
    const empty = keys.filter((k) => {
      const parts = k.split(".");
      let cur: unknown = en;
      for (const part of parts) {
        cur = (cur as Record<string, unknown>)[part];
      }
      return typeof cur === "string" && cur.trim() === "";
    });
    expect(empty).toEqual([]);
  });

  it("uses ICU placeholders for pluralization examples", () => {
    expect(en.suppliers.suppliersFound).toContain("plural");
    expect(en.products.productCount).toContain("plural");
  });
});
