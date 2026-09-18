import { describe, expect, it } from "vitest";
import { applyCatalogueCap } from "@/lib/catalogue-access";

describe("applyCatalogueCap", () => {
  const rows = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  it("passes through when there is no cap", () => {
    const page = applyCatalogueCap(rows.slice(0, 8), 40, 1, 8, null);
    expect(page.items).toHaveLength(8);
    expect(page.hasMore).toBe(true);
    expect(page.visibleLimit).toBeNull();
    expect(page.lockedCount).toBe(0);
  });

  it("keeps the first 10 Free products and locks the rest", () => {
    const page = applyCatalogueCap(rows, 506, 1, 24, 10);
    expect(page.items).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(page.hasMore).toBe(false);
    expect(page.visibleLimit).toBe(10);
    expect(page.lockedCount).toBe(496);
    expect(page.total).toBe(506);
  });

  it("returns no further pages once the Free cap is reached", () => {
    const page = applyCatalogueCap(rows, 506, 2, 10, 10);
    expect(page.items).toEqual([]);
    expect(page.hasMore).toBe(false);
    expect(page.lockedCount).toBe(496);
  });
});
