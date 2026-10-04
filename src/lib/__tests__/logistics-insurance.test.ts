import { describe, expect, it } from "vitest";
import { getLogisticsProvider, isInsuranceProvider } from "@/data/logistics-providers";
import { laneScore, marketsInText, pickShipmentInsurers } from "@/lib/logistics-insurance";

describe("marketsInText", () => {
  it("maps countries and ports to regional markets", () => {
    expect(marketsInText("Houston, United States")).toEqual(["north-america"]);
    expect(marketsInText("Rotterdam, Netherlands")).toEqual(["europe"]);
    expect(marketsInText("Shanghai")).toEqual(["asia-pacific"]);
    expect(marketsInText("São Paulo, Brazil")).toEqual(["latin-america"]);
  });

  it("matches whole words only", () => {
    expect(marketsInText("Eureka Industrial")).toEqual([]);
    expect(marketsInText("Kenya and Germany")).toEqual(expect.arrayContaining(["europe", "middle-east-africa"]));
    expect(marketsInText(null)).toEqual([]);
  });
});

describe("pickShipmentInsurers", () => {
  it("lists three insurers and never a forwarder", () => {
    const picks = pickShipmentInsurers({ origin: "China", destination: "Hamburg, Germany", seed: "rfq-1" });
    expect(picks).toHaveLength(3);
    for (const p of picks) expect(isInsuranceProvider(p), p.id).toBe(true);
  });

  it("prefers insurers that sell on the lane and keeps one worldwide insurer", () => {
    const lane = { origin: "United States", destination: "Chicago, USA", seed: "s1" };
    const picks = pickShipmentInsurers(lane);
    expect(picks.slice(0, 2).every((p) => p.markets.includes("north-america"))).toBe(true);
    expect(picks.some((p) => p.markets.includes("global"))).toBe(true);
  });

  it("never suggests a single-region insurer off its region", () => {
    const brazilOnly = getLogisticsProvider("swiss-re-corporate-solutions-brasil-cargo")!;
    expect(laneScore(brazilOnly, { origin: "India", destination: "Germany" })).toBe(0);
    expect(laneScore(brazilOnly, { origin: "Brazil" })).toBeGreaterThan(2);
    for (const seed of ["a", "b", "c", "d", "e"]) {
      expect(pickShipmentInsurers({ origin: "India", destination: "Germany", seed }).map((p) => p.id)).not.toContain(
        brazilOnly.id,
      );
    }
  });

  it("is deterministic per seed and rotates equally relevant insurers", () => {
    const lane = { origin: "Unknown" };
    const first = pickShipmentInsurers({ ...lane, seed: "supplier-a" }).map((p) => p.id);
    expect(pickShipmentInsurers({ ...lane, seed: "supplier-a" }).map((p) => p.id)).toEqual(first);
    const seen = new Set(
      ["a", "b", "c", "d", "e", "f", "g", "h"].flatMap((seed) => pickShipmentInsurers({ ...lane, seed }).map((p) => p.id)),
    );
    expect(seen.size).toBeGreaterThan(3);
  });

  it("respects the requested count", () => {
    expect(pickShipmentInsurers({ origin: "Japan" }, 2)).toHaveLength(2);
    expect(pickShipmentInsurers({ origin: "Japan" }, 0)).toHaveLength(0);
  });
});
