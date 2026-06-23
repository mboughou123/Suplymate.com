// productExtractor — pulls products + product images from a public page.
//
// Prefers schema.org Product JSON-LD (structured, reliable) and falls back to
// common product-card markup, then to a single-product page layout. Captures
// name, price, image(s), description, link, SKU, MOQ and shipping hints where
// present. Real product images are selected/cleaned by imageExtractor (logos,
// nav icons, banners and placeholders are rejected). Never throws on malformed
// markup.

import type { CheerioAPI } from "cheerio";
import { absoluteUrl } from "./http";
import { extractProductImages } from "./imageExtractor";
import type { ScrapedSupplierProduct } from "./types";

function parsePrice(text: string | undefined | null): {
  price: number | null;
  currency: string | null;
} {
  if (!text) return { price: null, currency: null };
  const currencyMatch = text.match(/(USD|EUR|GBP|CNY|AED|SAR|\$|€|£|¥)/i);
  const currencyMap: Record<string, string> = { $: "USD", "€": "EUR", "£": "GBP", "¥": "CNY" };
  const cur = currencyMatch
    ? currencyMap[currencyMatch[1]] ?? currencyMatch[1].toUpperCase()
    : null;
  const m = text.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return { price: m ? Number(m[1]) : null, currency: cur };
}

/** Pull a "per ton / per piece" unit out of a price string when present. */
function parsePriceUnit(text: string | undefined | null): string | null {
  if (!text) return null;
  const m = text.match(/\/\s*([a-z]{1,12})\b/i) || text.match(/per\s+([a-z]{1,12})\b/i);
  return m ? m[1].toLowerCase() : null;
}

function jsonLdImageList(img: unknown, pageUrl: string): string[] {
  const toUrl = (v: unknown): string | null => {
    if (typeof v === "string") return absoluteUrl(pageUrl, v);
    if (v && typeof v === "object") {
      const u = (v as Record<string, unknown>).url;
      if (typeof u === "string") return absoluteUrl(pageUrl, u);
    }
    return null;
  };
  if (Array.isArray(img)) return img.map(toUrl).filter((u): u is string => !!u);
  const single = toUrl(img);
  return single ? [single] : [];
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

      const offers = (Array.isArray(node.offers) ? node.offers[0] : node.offers) as
        | Record<string, unknown>
        | undefined;
      const priceRaw = offers && (offers.price ?? offers.lowPrice);
      const { price } = parsePrice(priceRaw != null ? String(priceRaw) : null);
      const currency =
        offers && typeof offers.priceCurrency === "string" ? offers.priceCurrency : null;

      const ldImages = jsonLdImageList(node.image, pageUrl);
      // Clean JSON-LD images through the shared product-image rules.
      const images = extractProductImages($, pageUrl, {
        jsonLdImages: ldImages,
        productName: node.name,
      });

      const sku =
        typeof node.sku === "string"
          ? node.sku
          : typeof node.mpn === "string"
            ? node.mpn
            : null;

      out.push({
        name: node.name,
        description: typeof node.description === "string" ? node.description : null,
        price,
        currency,
        priceUnit: null,
        imageUrl: images[0] ?? ldImages[0] ?? null,
        images: images.length ? images : ldImages,
        productUrl: typeof node.url === "string" ? absoluteUrl(pageUrl, node.url) : pageUrl,
        minimumOrderQuantity: null,
        shippingInfo: null,
        sku,
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
    ".product-tile",
    ".thumbnail",
    ".card",
  ];
  const seen = new Set<string>();

  for (const sel of selectors) {
    $(sel).each((_, el) => {
      const $el = $(el);
      const name =
        $el
          .find(".title, .product-title, .card-title, h2, h3, h4, [itemprop='name']")
          .first()
          .text()
          .trim() ||
        $el.find("a[title]").first().attr("title") ||
        "";
      if (!name || seen.has(name.toLowerCase())) return;

      const priceText =
        $el.find(".price, .product-price, .card-price, [itemprop='price']").first().text().trim() ||
        $el.find("[data-price]").first().attr("data-price") ||
        "";
      const { price, currency } = parsePrice(priceText);

      const imgEl = $el.find("img").first();
      const image = absoluteUrl(
        pageUrl,
        imgEl.attr("srcset")?.split(",").pop()?.trim().split(/\s+/)[0] ||
          imgEl.attr("src") ||
          imgEl.attr("data-src") ||
          imgEl.attr("data-lazy-src")
      );
      const description = $el.find(".description, .card-text, p").first().text().trim();
      const link = absoluteUrl(pageUrl, $el.find("a").first().attr("href"));

      const text = $el.text();
      const moqMatch =
        text.match(/\bMOQ[:\s]*([^\n.;]{2,40})/i) ||
        text.match(/minimum order[:\s]*([^\n.;]{2,40})/i);
      const shipMatch = text.match(/\b(?:ship|delivery|lead time)[:\s]*([^\n.;]{2,40})/i);
      const skuMatch = text.match(/\b(?:SKU|Model|Art(?:icle)?\.?\s*(?:no)?)[:\s#]*([A-Za-z0-9._\-\/]{3,30})/i);

      seen.add(name.toLowerCase());
      // Card images are typically thumbnails; keep them but reject logos/icons.
      const clean = /(logo|sprite|icon|placeholder|no[-_]?image)/i;
      const cardImages = image && !clean.test(image) ? [image] : [];
      out.push({
        name,
        description: description || null,
        price,
        currency,
        priceUnit: parsePriceUnit(priceText),
        imageUrl: cardImages[0] ?? null,
        images: cardImages,
        productUrl: link,
        minimumOrderQuantity: moqMatch ? moqMatch[1].trim() : null,
        shippingInfo: shipMatch ? shipMatch[1].trim() : null,
        sku: skuMatch ? skuMatch[1].trim() : null,
        sourceUrl: pageUrl,
      });
    });
    if (out.length) break; // first selector that yields results wins
  }
  return out;
}

/**
 * Single-product page fallback: when the page is itself one product (an <h1>
 * title + a price + a gallery) rather than a listing of cards.
 */
function extractSingleProduct($: CheerioAPI, pageUrl: string): ScrapedSupplierProduct[] {
  const name =
    $("h1[itemprop='name']").first().text().trim() ||
    $(".product-title, .product_title, .product-name").first().text().trim() ||
    $("h1").first().text().trim();
  if (!name || name.length > 160) return [];

  const images = extractProductImages($, pageUrl, { productName: name });
  if (!images.length) return [];

  const priceText =
    $("[itemprop='price'], .price, .product-price, .product_price").first().text().trim() || "";
  const { price, currency } = parsePrice(priceText);
  const description =
    $("[itemprop='description'], .product-description, .description, .product__description")
      .first()
      .text()
      .trim() || null;

  const bodyText = $("body").text();
  const moqMatch =
    bodyText.match(/\bMOQ[:\s]*([^\n.;]{2,40})/i) ||
    bodyText.match(/minimum order[:\s]*([^\n.;]{2,40})/i);
  const shipMatch = bodyText.match(/\b(?:ship|delivery|lead time)[:\s]*([^\n.;]{2,40})/i);
  const skuMatch =
    $("[itemprop='sku']").first().text().trim() ||
    bodyText.match(/\b(?:SKU|Model)[:\s#]*([A-Za-z0-9._\-\/]{3,30})/i)?.[1] ||
    null;

  return [
    {
      name,
      description,
      price,
      currency,
      priceUnit: parsePriceUnit(priceText),
      imageUrl: images[0] ?? null,
      images,
      productUrl: pageUrl,
      minimumOrderQuantity: moqMatch ? moqMatch[1].trim() : null,
      shippingInfo: shipMatch ? shipMatch[1].trim() : null,
      sku: typeof skuMatch === "string" ? skuMatch.trim() || null : null,
      sourceUrl: pageUrl,
    },
  ];
}

export function extractProducts($: CheerioAPI, pageUrl: string): ScrapedSupplierProduct[] {
  const jsonLd = extractJsonLd($, pageUrl);
  if (jsonLd.length) return jsonLd;
  const cards = extractCards($, pageUrl);
  if (cards.length) return cards;
  return extractSingleProduct($, pageUrl);
}
