// @vitest-environment node
import { describe, expect, it } from "vitest";
import { allowsAlibabaStorePhoto, checkProvenance, isMarketplaceHost, isMarketplaceUrl, officialDomains, registrableDomain } from "../provenance";

describe("registrableDomain", () => {
  it("strips subdomains and keeps multi-part public suffixes", () => {
    expect(registrableDomain("www.posco.com")).toBe("posco.com");
    expect(registrableDomain("newsroom.posco.com")).toBe("posco.com");
    expect(registrableDomain("shop.acme.co.uk")).toBe("acme.co.uk");
    expect(registrableDomain("baosteel.com.cn")).toBe("baosteel.com.cn");
    expect(registrableDomain("localhost")).toBe("localhost");
  });
});

describe("marketplace denylist", () => {
  it.each([
    "https://acme.en.alibaba.com/product/1.html",
    "https://sc04.alicdn.com/kf/abc.jpg",
    "https://www.aliexpress.com/item/1.html",
    "https://detail.1688.com/offer/1.html",
    "https://acme.en.made-in-china.com/",
    "https://www.indiamart.com/acme/",
    "https://5.imimg.com/data5/x.jpg",
    "https://www.amazon.de/dp/B000",
    "https://www.ebay.co.uk/itm/1",
    "https://www.globalsources.com/acme",
    "https://www.dhgate.com/product/1.html",
  ])("blocks %s", (url) => {
    expect(isMarketplaceUrl(url)).toBe(true);
  });

  it("does not block ordinary company sites", () => {
    expect(isMarketplaceHost("www.posco.com")).toBe(false);
    expect(isMarketplaceHost("cdn.shopify.com")).toBe(false);
    expect(isMarketplaceUrl("https://www.alibaba-steel-example.org/")).toBe(false);
  });
});

describe("officialDomains", () => {
  it("drops marketplace storefronts, maps listings and socials", () => {
    expect(
      officialDomains([
        "https://www.posco.com/",
        "https://acme.en.alibaba.com/",
        "https://maps.google.com/?cid=1",
        "https://www.linkedin.com/company/posco",
        "posco-international.com",
        null,
      ])
    ).toEqual(["posco-international.com", "posco.com"]);
  });
});

describe("checkProvenance", () => {
  const domains = ["posco.com"];

  it("accepts an image found on the company's own site, even when the file is on a CDN", () => {
    expect(checkProvenance({ sourceUrl: "https://newsroom.posco.com/en/plant", imageUrl: "https://cdn.example-cdn.net/p.jpg", officialDomains: domains })).toEqual({ ok: true });
  });

  it("rejects pages on other sites", () => {
    const v = checkProvenance({ sourceUrl: "https://steel-news.example/posco", officialDomains: domains });
    expect(v.ok).toBe(false);
  });

  it("rejects marketplaces, as page or as image host", () => {
    expect(checkProvenance({ sourceUrl: "https://posco.en.alibaba.com/", officialDomains: domains }).ok).toBe(false);
    const v = checkProvenance({ sourceUrl: "https://www.posco.com/", imageUrl: "https://sc04.alicdn.com/kf/a.jpg", officialDomains: domains });
    expect(v).toEqual({ ok: false, reason: expect.stringMatching(/marketplaces/) });
  });

  it("rejects when the entity has no official website", () => {
    expect(checkProvenance({ sourceUrl: "https://www.posco.com/", officialDomains: [] })).toEqual({ ok: false, reason: expect.stringMatching(/no official website/) });
  });

  it("allows Alibaba only when the image is from that supplier's own store", () => {
    const store = "acme.en.alibaba.com";
    expect(
      checkProvenance({
        sourceUrl: "https://acme.en.alibaba.com/product/coil.html",
        imageUrl: "https://sc04.alicdn.com/kf/coil.jpg",
        officialDomains: [],
        alibabaStoreHost: store,
      }),
    ).toEqual({ ok: true, photoSource: "alibaba-store" });
    expect(allowsAlibabaStorePhoto({ sourceUrl: "https://www.alibaba.com/store/acme", imageUrl: "https://sc04.alicdn.com/kf/a.jpg", alibabaStoreHost: "alibaba.com/store/acme" })).toBe(true);
    expect(
      checkProvenance({
        sourceUrl: "https://other.en.alibaba.com/product/1.html",
        imageUrl: "https://sc04.alicdn.com/kf/x.jpg",
        officialDomains: [],
        alibabaStoreHost: store,
      }).ok,
    ).toBe(false);
    expect(
      checkProvenance({
        sourceUrl: "https://acme.en.made-in-china.com/product/1.html",
        officialDomains: ["acme.com"],
        alibabaStoreHost: store,
      }).ok,
    ).toBe(false);
    expect(checkProvenance({ sourceUrl: "https://www.alibaba.com/", officialDomains: [], alibabaStoreHost: null }).ok).toBe(false);
    expect(checkProvenance({ sourceUrl: "https://www.indiamart.com/acme/", officialDomains: [], alibabaStoreHost: store }).ok).toBe(false);
  });
});
