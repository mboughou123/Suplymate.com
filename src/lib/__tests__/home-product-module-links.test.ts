import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  HOME_PRODUCT_MODULE_LINKS,
  HOME_PRODUCT_MODULE_PAGE_FILES,
} from "@/lib/home-product-module-links";

describe("home product module Read more links", () => {
  it("points Scout, Compare, and Watch at known app routes", () => {
    expect(HOME_PRODUCT_MODULE_LINKS).toEqual({
      scout: "/suppliers",
      compare: "/products",
      watch: "/materials",
    });
  });

  it("maps each link to an existing locale-aware page file", () => {
    for (const [key, relativePath] of Object.entries(HOME_PRODUCT_MODULE_PAGE_FILES)) {
      const absolutePath = resolve(process.cwd(), relativePath);
      expect(existsSync(absolutePath), `${key} → ${relativePath}`).toBe(true);
    }
  });

  it("does not use placeholder or dead paths", () => {
    for (const href of Object.values(HOME_PRODUCT_MODULE_LINKS)) {
      expect(href.startsWith("#")).toBe(false);
      expect(href).not.toMatch(/^\/?(scout|compare|watch)$/);
    }
  });
});
