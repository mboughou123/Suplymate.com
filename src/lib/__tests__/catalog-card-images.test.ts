// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isNavigationTitle } from "@/lib/catalog-junk";
import {
  fullSizeCandidates,
  proxiedProductImageUrl,
  verifyProxiedImage,
} from "@/lib/remote-product-image";
import { cleanHint, resolveCardImage } from "@/lib/public-products";
import { resolveCatalogSupplier } from "@/lib/catalog-supplier";

const fetchRemoteImage = vi.fn();
vi.mock("@/lib/media-fetch", async (orig) => ({
  ...(await orig<typeof import("@/lib/media-fetch")>()),
  fetchRemoteImage: (...a: unknown[]) => fetchRemoteImage(...a),
}));

const { GET } = await import("@/app/api/product-image/[sig]/[encoded]/route");

const NYLON = "https://www.allmetalindia.in/wp-content/uploads/2022/02/nylon-rod-250x250-1-100x100.jpg";

beforeEach(() => {
  vi.stubEnv("IMAGE_PROXY_SECRET", "test-secret");
  fetchRemoteImage.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe("isNavigationTitle", () => {
  it.each(["Buy Metals", "Our Products", "Buildings", "Distribution", "Transmission", "  power   grid ", "Shop Products", ""])(
    "rejects %j",
    (name) => expect(isNavigationTitle(name)).toBe(true),
  );
  it.each(["Nylon Rod", "SIMATIC S7-1500", "Power Transmission Cable 33kV", "Distribution Transformer"])(
    "keeps %j",
    (name) => expect(isNavigationTitle(name)).toBe(false),
  );
});

describe("signed product image proxy", () => {
  it("round-trips a signed URL and rejects tampering", () => {
    const proxied = proxiedProductImageUrl(NYLON)!;
    const [, , , sig, encoded] = proxied.split("/");
    expect(proxied.startsWith("/api/product-image/")).toBe(true);
    expect(verifyProxiedImage(sig, encoded)).toBe(NYLON);
    const other = Buffer.from("http://169.254.169.254/latest").toString("base64url");
    expect(verifyProxiedImage(sig, other)).toBeNull();
    expect(verifyProxiedImage("x".repeat(32), encoded)).toBeNull();
  });

  it("does not proxy without a signing secret", () => {
    vi.stubEnv("IMAGE_PROXY_SECRET", "");
    vi.stubEnv("AUTH_SECRET", "");
    vi.stubEnv("NEXTAUTH_SECRET", "");
    expect(proxiedProductImageUrl(NYLON)).toBeNull();
  });

  it("tries the full-size original before the scraped thumbnail", () => {
    expect(fullSizeCandidates(NYLON)).toEqual([
      "https://www.allmetalindia.in/wp-content/uploads/2022/02/nylon-rod-250x250-1.jpg",
      NYLON,
    ]);
    expect(fullSizeCandidates("https://cableshouse-me.com/7554-small_default/b150106fls-blk.jpg")[0]).toBe(
      "https://cableshouse-me.com/7554-large_default/b150106fls-blk.jpg",
    );
  });

  it("serves the first candidate that is a real raster image", async () => {
    fetchRemoteImage
      .mockResolvedValueOnce({ ok: false, error: "Source returned HTTP 404." })
      .mockResolvedValueOnce({ ok: true, buffer: Buffer.from([1, 2, 3]), contentType: "image/jpeg", finalUrl: NYLON });
    const [, , , sig, encoded] = proxiedProductImageUrl(NYLON)!.split("/");
    const res = await GET(new Request("http://x"), { params: Promise.resolve({ sig, encoded }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("cache-control")).toMatch(/s-maxage=/);
    expect(fetchRemoteImage).toHaveBeenLastCalledWith(NYLON);
  });

  it("404s on a bad signature without fetching", async () => {
    const res = await GET(new Request("http://x"), {
      params: Promise.resolve({ sig: "bad", encoded: Buffer.from(NYLON).toString("base64url") }),
    });
    expect(res.status).toBe(404);
    expect(fetchRemoteImage).not.toHaveBeenCalled();
  });
});

describe("resolveCardImage", () => {
  it("re-hosts a scraped product's own photo", () => {
    const r = resolveCardImage({
      id: "scraped-allmetalindia-in-nylon-rod",
      images: [NYLON],
      supplierId: "allmetalindia-in",
      productName: "Nylon Rod",
      category: "Steel & Metals",
    });
    expect(r.hasRealPhoto).toBe(true);
    expect(r.imageUrl).toMatch(/^\/api\/product-image\//);
  });

  it("prefers the product's own photo over a still borrowed from the supplier folder", () => {
    const r = resolveCardImage({
      id: "scraped-nexans-com-medium-voltage-cable",
      images: ["https://www.nexans.com/app/uploads/2024/01/mv-cable.jpg"],
      supplierId: "nexans",
      productName: "Medium Voltage Cable",
      category: "Cables & Electrical",
    });
    expect(r.imageUrl).toMatch(/^\/api\/product-image\//);
    expect(r.imageUrl).not.toMatch(/ampacity-test/);
  });

  it("keeps a curated local still and falls back to the category tile", () => {
    const local = "/images/products/packaging/dongguan-caicheng-printing/folding-gift-box.jpg";
    expect(
      resolveCardImage({ images: [local], productName: "Folding Gift Box", category: "Packaging" }).imageUrl,
    ).toBe(local);
    const none = resolveCardImage({ images: [], productName: "Swagelok Fittings", category: "Tubes & Pipes" });
    expect(none).toEqual({ imageUrl: "/images/products/pipes.svg", hasRealPhoto: false });
  });
});

describe("catalogue supplier links", () => {
  const profiles = new Map([
    ["nexans", "Nexans S.A."],
    ["smc-corporation", "SMC Corporation"],
    ["cables-house-wires-and-cables-trading-llc-ae", "CABLES HOUSE WIRES AND CABLES TRADING LLC"],
  ]);

  it("maps scraped domain ids onto the directory profile", () => {
    expect(resolveCatalogSupplier("nexans-com", "Nexans", profiles)).toEqual({
      id: "nexans",
      name: "Nexans S.A.",
      hasProfile: true,
    });
    expect(resolveCatalogSupplier("smcusa-com", "Smcusa", profiles).id).toBe("smc-corporation");
  });

  it("hides View supplier when no profile page exists, but fixes the name", () => {
    expect(resolveCatalogSupplier("siemens-com", "Siemens", profiles)).toEqual({
      id: "siemens-com",
      name: "Siemens",
      hasProfile: false,
    });
    expect(resolveCatalogSupplier("products-swagelok-com", "Products", profiles).name).toBe("Swagelok");
    expect(resolveCatalogSupplier("rockwellautomation-com", "Rockwellautomation", profiles).hasProfile).toBe(false);
  });

  it("keeps ids that already have a profile", () => {
    const r = resolveCatalogSupplier("cables-house-wires-and-cables-trading-llc-ae", "CABLES HOUSE", profiles);
    expect(r.hasProfile).toBe(true);
    expect(r.id).toBe("cables-house-wires-and-cables-trading-llc-ae");
  });
});

describe("scraped placeholders and fragments", () => {
  it("never uses a slider dummy as the card photo", () => {
    const r = resolveCardImage({
      images: ["https://cableshouse-me.com/modules/revsliderprestashop/public/assets/assets/dummy.png"],
      productName: "10GXE02",
      category: "Cables & Electrical",
    });
    expect(r).toEqual({ imageUrl: "/images/products/electrical.svg", hasRealPhoto: false });
  });

  it("drops MOQ/shipping text that is a cut-off sentence", () => {
    expect(cleanHint("& Shipping")).toBeNull();
    expect(cleanHint("ping anywhere in Canada and the US!")).toBeNull();
    expect(cleanHint("500 pieces")).toBe("500 pieces");
    expect(cleanHint("MOQ Not published")).toBe("MOQ Not published");
  });
});
