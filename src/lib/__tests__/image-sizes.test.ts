import { describe, expect, it } from "vitest";
import {
  IMAGE_DEVICE_SIZES,
  IMAGE_INLINE_SIZES,
  CARD_IMAGE_SIZES,
} from "@/lib/image-sizes";

describe("mobile image srcset budget", () => {
  it("does not advertise 2K/4K variants that bloat listing HTML", () => {
    expect(Math.max(...IMAGE_DEVICE_SIZES)).toBeLessThanOrEqual(1920);
    expect(IMAGE_DEVICE_SIZES).not.toContain(2048);
    expect(IMAGE_DEVICE_SIZES).not.toContain(3840);
    expect(Math.max(...IMAGE_INLINE_SIZES)).toBeLessThanOrEqual(256);
  });

  it("gives cards viewport-aware sizes instead of a 100vw default", () => {
    expect(CARD_IMAGE_SIZES.supplierBanner).toMatch(/640px/);
    expect(CARD_IMAGE_SIZES.productThumb).toBe("120px");
    expect(CARD_IMAGE_SIZES.homeProduct).toMatch(/50vw/);
    expect(CARD_IMAGE_SIZES.factoryTile).not.toBe("100vw");
  });
});
