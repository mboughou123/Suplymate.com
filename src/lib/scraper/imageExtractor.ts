// imageExtractor — pulls a logo and de-duplicated image URLs from a page.
//
// Heuristics:
//   - Logo: an <img> inside header/nav (or with "logo" in src/alt/class), else a
//     high-res rel=icon / og:image.
//   - Tiny icons (declared width/height < MIN_PX, or sprite/spacer/pixel names)
//     are dropped UNLESS they look like a trust/certification badge — those are
//     valuable even when small (ISO logos etc.).
//   - Lazy-loaded images are resolved via src / data-src / data-lazy-src /
//     data-original and the LARGEST candidate from srcset.
//   - data:, javascript:, and tracking pixels are ignored.
//   - Everything is resolved to an absolute URL and de-duplicated.
//
// Product-image selection (extractProductImages) additionally pulls JSON-LD
// Product images, Open Graph images, the product gallery and images near the
// product title, then rejects logos / nav icons / banners / placeholders and
// prefers genuine product photographs. When nothing qualifies it returns [],
// which the pipeline treats as "keep the product PENDING (do not publish)".

import type { CheerioAPI } from "cheerio";
import { absoluteUrl } from "./http";

const MIN_PX = 48;

const TRUST_HINT =
  /(cert|iso|certificate|ce-mark|ce_mark|badge|verified|trust|seal|award|accredit|compliance|quality|audit)/i;
// Decorative / navigation / tracking / placeholder imagery that is NOT supplier
// media. Cert/trust badges are exempt (handled by TRUST_HINT before this runs).
const ICON_NOISE =
  /(sprite|spacer|pixel|blank\.gif|1x1|tracking|beacon|analytics|gtm|gif;base64|favicon|loader|loading|placeholder|no[-_]?image|noimage|default[-_]image|avatar|(^|[\/_-])ico[-_.]|[\/_-]icon|icons?[\/_-]|arrow|chevron|caret|hamburger|burger|\bmenu\b|search|magnifier|close|cross|times|exit|play[-_]?(button|btn)?|social|share|twitter|facebook|instagram|linkedin|youtube|whatsapp|pinterest|tiktok|flag[-_]|chat[-_]|cookie|consent|scroll|hero[-_]?bg|banner|carousel[-_]?bg|background|bg[-_]|pattern|dots?\.svg|swatch|spinner|payment|visa|mastercard|paypal|amex)/i;
// Things that are explicitly the brand logo, never a product photo.
const LOGO_NOISE = /(logo|brandmark|wordmark|header[-_]?img|site[-_]?icon)/i;

function dimensionAttr(v: string | undefined): number | null {
  if (!v) return null;
  const n = parseInt(v.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

/** Pick the highest-resolution URL from a srcset attribute. */
function largestFromSrcset(srcset: string | undefined): string | null {
  if (!srcset) return null;
  let best: { url: string; w: number } | null = null;
  for (const part of srcset.split(",")) {
    const seg = part.trim();
    if (!seg) continue;
    const [url, descriptor] = seg.split(/\s+/, 2);
    if (!url) continue;
    // Descriptor is like "640w" or "2x"; weight width descriptors highest.
    let w = 1;
    if (descriptor) {
      const wm = descriptor.match(/(\d+)w/);
      const xm = descriptor.match(/(\d+(?:\.\d+)?)x/);
      if (wm) w = Number(wm[1]);
      else if (xm) w = Number(xm[1]) * 1000;
    }
    if (!best || w > best.w) best = { url, w };
  }
  return best?.url ?? null;
}

/** Resolve the best raw src for an <img>, accounting for lazy-loading. */
function imgSrc($: CheerioAPI, el: Parameters<CheerioAPI>[0]): string | null {
  const $el = $(el);
  return (
    largestFromSrcset($el.attr("srcset")) ||
    largestFromSrcset($el.attr("data-srcset")) ||
    $el.attr("src") ||
    $el.attr("data-src") ||
    $el.attr("data-lazy-src") ||
    $el.attr("data-lazy") ||
    $el.attr("data-original") ||
    $el.attr("data-image") ||
    null
  );
}

export function extractLogo($: CheerioAPI, baseUrl: string): string | null {
  // 1) Explicit logo image in the header/nav.
  const candidates = [
    'header img[src*="logo" i]',
    'header img[alt*="logo" i]',
    'header img[class*="logo" i]',
    'a[class*="logo" i] img',
    'img[class*="logo" i]',
    'img[id*="logo" i]',
    ".navbar img",
    "header img",
  ];
  for (const sel of candidates) {
    const el = $(sel).first();
    if (el.length) {
      const src = absoluteUrl(baseUrl, imgSrc($, el.get(0)));
      if (src) return src;
    }
  }
  // 2) Fall back to og:image / apple-touch-icon (usually a decent brand image).
  const og = $('meta[property="og:image"]').attr("content");
  const ogAbs = absoluteUrl(baseUrl, og);
  if (ogAbs) return ogAbs;
  const icon = $('link[rel="apple-touch-icon"]').attr("href");
  return absoluteUrl(baseUrl, icon);
}

export type ImageHit = { url: string; alt: string | null; isBadge: boolean };

/**
 * Collect candidate images from the page, dropping tiny icons unless they look
 * like trust/certification badges. Returns de-duplicated absolute URLs.
 */
export function extractImages($: CheerioAPI, baseUrl: string): ImageHit[] {
  const seen = new Set<string>();
  const out: ImageHit[] = [];

  $("img").each((_, el) => {
    const raw = imgSrc($, el);
    const url = absoluteUrl(baseUrl, raw);
    if (!url || seen.has(url)) return;

    const $el = $(el);
    const alt = $el.attr("alt") ?? null;
    const haystack = `${raw ?? ""} ${alt ?? ""} ${$el.attr("class") ?? ""} ${$el.attr("title") ?? ""}`;
    const isBadge = TRUST_HINT.test(haystack);

    if (!isBadge) {
      if (ICON_NOISE.test(raw ?? "")) return;
      const w = dimensionAttr($el.attr("width"));
      const h = dimensionAttr($el.attr("height"));
      if ((w !== null && w < MIN_PX) || (h !== null && h < MIN_PX)) return;
    }

    seen.add(url);
    out.push({ url, alt, isBadge });
  });

  return out;
}

/* ------------------------------------------------------------------ */
/* Product image extraction                                            */
/* ------------------------------------------------------------------ */

const IMG_EXT = /\.(jpe?g|png|webp|avif|gif)(\?|#|$)/i;

/** True for a string that plausibly points at a real raster product photo. */
function looksLikePhoto(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.startsWith("data:")) return false;
  // SVGs are almost always logos/icons/illustrations, not product photos.
  if (/\.svg(\?|#|$)/i.test(lower)) return false;
  if (LOGO_NOISE.test(lower) || ICON_NOISE.test(lower)) return false;
  return true;
}

function pushUnique(list: string[], seen: Set<string>, url: string | null) {
  if (!url) return;
  const key = url.split("#")[0];
  if (seen.has(key)) return;
  seen.add(key);
  list.push(url);
}

/** Open Graph / Twitter card product images (often the canonical hero shot). */
function ogImages($: CheerioAPI, baseUrl: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  $(
    'meta[property="og:image"], meta[property="og:image:url"], meta[property="og:image:secure_url"], meta[name="twitter:image"], meta[name="twitter:image:src"]'
  ).each((_, el) => {
    const abs = absoluteUrl(baseUrl, $(el).attr("content"));
    if (abs && looksLikePhoto(abs)) pushUnique(out, seen, abs);
  });
  return out;
}

/**
 * Collect product photo candidates for a single product, ordered best-first:
 *   JSON-LD images (caller passes them) → gallery near the title → og:image →
 *   in-content product imagery. Logos, nav icons, banners, placeholders, tiny
 *   icons and tracking pixels are rejected. Returns [] when nothing qualifies,
 *   signalling the pipeline to keep the product PENDING.
 */
export function extractProductImages(
  $: CheerioAPI,
  baseUrl: string,
  opts: { jsonLdImages?: string[]; productName?: string } = {}
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const u of opts.jsonLdImages ?? []) {
    if (u && looksLikePhoto(u)) pushUnique(out, seen, u);
  }

  // Gallery / main-image containers commonly used on product pages.
  const gallerySelectors = [
    "[itemprop='image']",
    ".product-gallery img",
    ".product-images img",
    ".product-image img",
    ".product-media img",
    ".woocommerce-product-gallery img",
    ".product-single__photo img",
    ".gallery img",
    "figure.product img",
    "main img",
  ];
  for (const sel of gallerySelectors) {
    $(sel).each((_, el) => {
      const $el = $(el);
      const raw = imgSrc($, el);
      const abs = absoluteUrl(baseUrl, raw);
      if (!abs) return;
      const haystack = `${raw ?? ""} ${$el.attr("alt") ?? ""} ${$el.attr("class") ?? ""}`;
      if (LOGO_NOISE.test(haystack) || ICON_NOISE.test(raw ?? "")) return;
      const w = dimensionAttr($el.attr("width"));
      const h = dimensionAttr($el.attr("height"));
      if ((w !== null && w < MIN_PX) || (h !== null && h < MIN_PX)) return;
      if (looksLikePhoto(abs)) pushUnique(out, seen, abs);
    });
    if (out.length >= 6) break;
  }

  for (const u of ogImages($, baseUrl)) pushUnique(out, seen, u);

  // Prefer URLs that clearly carry an image extension (real raster files) over
  // ambiguous query-string image endpoints, keeping order otherwise stable.
  out.sort((a, b) => Number(IMG_EXT.test(b)) - Number(IMG_EXT.test(a)));
  return out.slice(0, 8);
}
