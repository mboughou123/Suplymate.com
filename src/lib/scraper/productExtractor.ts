// productExtractor — pulls products + product images from a public page.
//
// Prefers schema.org Product JSON-LD (structured, reliable) and falls back to
// common product-card markup. Captures name, price, image(s), description, link,
// MOQ and shipping hints where present. Never throws on malformed markup.

import type { CheerioAPI } from "cheerio";
import { absoluteUrl } from "./http";
import type { ScrapedSupplierProduct } from "./types";

function parsePrice(text: string | undefined | null): { price: number | null; currency: string | null } {
  if (!text) return { price: null, currency: null };
  const currencyMatch = text.match(/(USD|EUR|GBP|CNY|AED|SAR|\$|€|£|¥)/i);
  const currencyMap: Record<string, string> = { $: "USD", "€": "EUR", "£": "GBP", "¥": "CNY" };
  const cur = currencyMatch
    ? currencyMap[currencyMatch[1]] ?? currencyMatch[1].toUpperCase()
    : null;
  const m = text.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return { price: m ? Number(m[1]) : null, currency: cur };
}

function extractJsonLd($: CheerioAPI, pageUrl: string): ScrapedSupplierProduct[] {
  const out: ScrapedSupplierProduct[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw) return;
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }
    const nodes: Record<string, unknown>[] = [];
    const visit = (n: unknown) => {
      if (Array.isArray(n)) n.forEach(visit);
      else if (n && typeof n === "object") {
        const obj = n as Record<string, unknown>;
        if (Array.isArray(obj["@graph"])) (obj["@graph"] as unknown[]).forEach(visit);
        nodes.push(obj);
      }
    };
    visit(data);

    for (const node of nodes) {
      const type = node["@type"];
      const isProduct = Array.isArray(type) ? type.includes("Product") : type === "Product";
      if (!isProduct || typeof node.name !== "string") continue;

      const offers = node.offers as Record<string, unknown> | undefined;
      const priceRaw = offers && (offers.price ?? offers.lowPrice);
      const { price } = parsePrice(priceRaw != null ? String(priceRaw) : null);
      const currency = offers && typeof offers.priceCurrency === "string" ? offers.priceCurrency : null;

      const img = node.image;
      const images = Array.isArray(img)
        ? img.map((i) => absoluteUrl(pageUrl, String(i))).filter((u): u is string => !!u)
        : typeof img === "string"
          ? [absoluteUrl(pageUrl, img)].filter((u): u is string => !!u)
          : [];

      out.push({
        name: node.name,
        description: typeof node.description === "string" ? node.description : null,
        price,
        currency,
        imageUrl: images[0] ?? null,
        images,
        productUrl: typeof node.url === "string" ? absoluteUrl(pageUrl, node.url) : null,
        minimumOrderQuantity: null,
        shippingInfo: null,
        sourceUrl: pageUrl,
      });
    }
  });
  return out;
}

function extractCards($: CheerioAPI, pageUrl: string): ScrapedSupplierProduct[] {
  const out: ScrapedSupplierProduct[] = [];
  const selectors = [
    "[itemtype*='Product']",
    "li.product",
    ".product",
    ".product-item",
    ".product-card",
    ".thumbnail",
    ".card",
  ];
  const seen = new Set<string>();

  for (const sel of selectors) {
    $(sel).each((_, el) => {
      const $el = $(el);
      const name =
        $el.find(".title, .product-title, .card-title, h2, h3, h4, [itemprop='name']").first().text().trim() ||
        $el.find("a[title]").first().attr("title") ||
        "";
      if (!name || seen.has(name.toLowerCase())) return;

      const priceText =
        $el.find(".price, .product-price, .card-price, [itemprop='price']").first().text().trim() ||
        $el.find("[data-price]").first().attr("data-price") ||
        "";
      const { price, currency } = parsePrice(priceText);

      const imgEl = $el.find("img").first();
      const image = absoluteUrl(pageUrl, imgEl.attr("src") || imgEl.attr("data-src"));
      const description = $el.find(".description, .card-text, p").first().text().trim();
      const link = absoluteUrl(pageUrl, $el.find("a").first().attr("href"));

      const text = $el.text();
      const moqMatch = text.match(/\bMOQ[:\s]*([^\n.;]{2,40})/i) || text.match(/minimum order[:\s]*([^\n.;]{2,40})/i);
      const shipMatch = text.match(/\b(?:ship|delivery|lead time)[:\s]*([^\n.;]{2,40})/i);

      seen.add(name.toLowerCase());
      out.push({
        name,
        description: description || null,
        price,
        currency,
        imageUrl: image,
        images: image ? [image] : [],
        productUrl: link,
        minimumOrderQuantity: moqMatch ? moqMatch[1].trim() : null,
        shippingInfo: shipMatch ? shipMatch[1].trim() : null,
        sourceUrl: pageUrl,
      });
    });
    if (out.length) break; // first selector that yields results wins
  }
  return out;
}

export function extractProducts($: CheerioAPI, pageUrl: string): ScrapedSupplierProduct[] {
  const jsonLd = extractJsonLd($, pageUrl);
  if (jsonLd.length) return jsonLd;
  return extractCards($, pageUrl);
}
