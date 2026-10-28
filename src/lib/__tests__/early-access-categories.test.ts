import { describe, expect, it } from "vitest";
import { EARLY_ACCESS_CATEGORIES, earlyAccessCategoryKey } from "@/lib/early-access";
import { HOME_PRODUCT_CATEGORIES, homeCategoryKey } from "@/lib/home-products";

describe("early-access categories", () => {
  it("matches the homepage's top categories and their translation keys", () => {
    expect([...EARLY_ACCESS_CATEGORIES]).toEqual([...HOME_PRODUCT_CATEGORIES]);
    for (const category of EARLY_ACCESS_CATEGORIES) {
      expect(earlyAccessCategoryKey(category)).toBe(homeCategoryKey(category));
    }
  });
});