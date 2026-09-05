import { describe, expect, it } from "vitest";
import { HOME_ADVANTAGES } from "@/lib/home-advantages";

describe("home advantages band", () => {
  it("defines four outcome cards in display order", () => {
    expect(HOME_ADVANTAGES.map((entry) => entry.key)).toEqual([
      "verifiedNetwork",
      "fasterShortlists",
      "offerCompare",
      "priceWindows",
    ]);
  });

  it("maps each card to a unique abstract UI preview", () => {
    const previews = HOME_ADVANTAGES.map((entry) => entry.preview);
    expect(new Set(previews).size).toBe(4);
    expect(previews).toEqual(["network", "scout", "compare", "watch"]);
  });
});
