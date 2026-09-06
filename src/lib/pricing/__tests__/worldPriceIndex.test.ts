import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { worldPriceIndexProvider, WPI_PROVIDER_ID, wpiRefreshIntervalMs } from "@/lib/pricing/providers/worldPriceIndex";

type Obs = { observed_at: string; value: number | null; unit?: string; cadence?: string };

// Newest-first, like the real API.
const SERIES: Record<string, Obs[]> = {
  "aluminum-palum-usd-monthly": [
    { observed_at: "2026-07-31", value: 2600.5, unit: "USD", cadence: "monthly" },
    { observed_at: "2026-06-30", value: 2550.25, unit: "USD", cadence: "monthly" },
    { observed_at: "2026-05-31", value: 2500, unit: "USD", cadence: "monthly" },
  ],
  "copper-pcopp-usd-monthly": [
    { observed_at: "2026-07-31", value: 9700, unit: "USD", cadence: "monthly" },
    { observed_at: "2026-06-30", value: null, unit: "USD", cadence: "monthly" },
    { observed_at: "2026-05-31", value: 9500, unit: "USD", cadence: "monthly" },
  ],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const calls: { url: string; headers: Record<string, string> }[] = [];

function installFetch(handler: (slug: string) => Response) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, headers: (init?.headers as Record<string, string>) ?? {} });
      const slug = decodeURIComponent(url.match(/commodity-series\/([^?]+)/)?.[1] ?? "");
      return handler(slug);
    }),
  );
}

describe("worldPriceIndexProvider", () => {
  beforeEach(() => {
    calls.length = 0;
    vi.stubEnv("WPI_API_KEY", "test-key");
    vi.stubEnv("WPI_API_BASE_URL", "https://wpi.test");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("is configured only when WPI_API_KEY is set", () => {
    expect(worldPriceIndexProvider.isConfigured()).toBe(true);
    vi.stubEnv("WPI_API_KEY", "");
    expect(worldPriceIndexProvider.isConfigured()).toBe(false);
  });

  it("refreshes daily by default and honours WPI_REFRESH_HOURS", () => {
    expect(wpiRefreshIntervalMs()).toBe(24 * 3_600_000);
    vi.stubEnv("WPI_REFRESH_HOURS", "6");
    expect(wpiRefreshIntervalMs()).toBe(6 * 3_600_000);
    expect(worldPriceIndexProvider.refreshIntervalMs).toBe(6 * 3_600_000);
  });

  it("converts copper from USD/ton to USD/lb and keeps aluminum per ton", async () => {
    installFetch((slug) => jsonResponse({ data: SERIES[slug] ?? [] }));
    const quotes = await worldPriceIndexProvider.fetchLatest(["aluminum", "copper"]);
    const aluminum = quotes.find((q) => q.materialId === "aluminum")!;
    const copper = quotes.find((q) => q.materialId === "copper")!;

    expect(aluminum.price).toBe(2600.5);
    expect(aluminum.unit).toBe("USD/ton");
    expect(aluminum.currency).toBe("USD");
    expect(aluminum.source).toBe(WPI_PROVIDER_ID);
    expect(aluminum.cadence).toBe("monthly");

    expect(copper.unit).toBe("USD/lb");
    expect(copper.price).toBeCloseTo(9700 / 2204.62, 3);
    expect(copper.price).toBeGreaterThan(4);
    expect(copper.price).toBeLessThan(5);
  });

  it("orders history oldest-first, drops null values and dates the quote at the newest observation", async () => {
    installFetch((slug) => jsonResponse({ data: SERIES[slug] ?? [] }));
    const [aluminum] = await worldPriceIndexProvider.fetchLatest(["aluminum"]);
    expect(aluminum.history!.map((p) => p.price)).toEqual([2500, 2550.25, 2600.5]);
    expect(aluminum.history!.map((p) => p.recordedAt.toISOString().slice(0, 10))).toEqual([
      "2026-05-31",
      "2026-06-30",
      "2026-07-31",
    ]);
    expect(aluminum.recordedAt.toISOString().slice(0, 10)).toBe("2026-07-31");
    expect(aluminum.fetchedAt).toBeInstanceOf(Date);

    const [copper] = await worldPriceIndexProvider.fetchLatest(["copper"]);
    expect(copper.history).toHaveLength(2); // null observation skipped
  });

  it("ignores unsupported material ids and does not call the API for them", async () => {
    installFetch((slug) => jsonResponse({ data: SERIES[slug] ?? [] }));
    const quotes = await worldPriceIndexProvider.fetchLatest(["steel", "cement", "aluminum", "unknown-thing"]);
    expect(quotes.map((q) => q.materialId)).toEqual(["aluminum"]);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://wpi.test/v1/commodity-series/aluminum-palum-usd-monthly?limit=24");
    expect(calls[0].headers.Authorization).toBe("Bearer test-key");

    expect(worldPriceIndexProvider.supports("steel")).toBe(false);
    expect(worldPriceIndexProvider.supports("iron-ore")).toBe(true);
    await expect(worldPriceIndexProvider.fetchLatest(["steel"])).resolves.toEqual([]);
  });

  it("throws a clear error when the API key is rejected (401)", async () => {
    installFetch(() => jsonResponse({ error: "unauthorized" }, 401));
    await expect(worldPriceIndexProvider.fetchLatest(["aluminum", "copper"])).rejects.toThrow(
      /World Price Index rejected the API key/,
    );
  });

  it("returns the successful quotes when only some series fail", async () => {
    installFetch((slug) => (slug.startsWith("copper") ? jsonResponse({}, 500) : jsonResponse({ data: SERIES[slug] ?? [] })));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const quotes = await worldPriceIndexProvider.fetchLatest(["aluminum", "copper"]);
    expect(quotes.map((q) => q.materialId)).toEqual(["aluminum"]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("copper: World Price Index HTTP 500"));
    warn.mockRestore();
  });

  it("returns nothing without a key instead of calling the API", async () => {
    vi.stubEnv("WPI_API_KEY", "");
    installFetch(() => jsonResponse({ data: [] }));
    await expect(worldPriceIndexProvider.fetchLatest(["aluminum"])).resolves.toEqual([]);
    expect(calls).toHaveLength(0);
  });
});
