import { describe, expect, it } from "vitest";
import { shouldEnableVisualFx } from "@/lib/fx-enabled";

const desktop = {
  webgl: true,
  prefersReducedMotion: false,
  saveData: false,
  coarsePointer: false,
  narrowViewport: false,
  lowCpu: false,
};

describe("shouldEnableVisualFx", () => {
  it("allows WebGL chrome on a capable desktop", () => {
    expect(shouldEnableVisualFx(desktop)).toBe(true);
  });

  it("stays off on phones and other coarse/narrow viewports", () => {
    expect(shouldEnableVisualFx({ ...desktop, coarsePointer: true })).toBe(false);
    expect(shouldEnableVisualFx({ ...desktop, narrowViewport: true })).toBe(false);
  });

  it("respects reduced motion, Save-Data, missing WebGL and low-end CPUs", () => {
    expect(shouldEnableVisualFx({ ...desktop, prefersReducedMotion: true })).toBe(false);
    expect(shouldEnableVisualFx({ ...desktop, saveData: true })).toBe(false);
    expect(shouldEnableVisualFx({ ...desktop, webgl: false })).toBe(false);
    expect(shouldEnableVisualFx({ ...desktop, lowCpu: true })).toBe(false);
  });
});
