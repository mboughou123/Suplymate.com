// imageExtractor — pulls a logo and de-duplicated image URLs from a page.
//
// Heuristics:
//   - Logo: an <img> inside header/nav (or with "logo" in src/alt/class), else a
//     high-res rel=icon / og:image.
//   - Tiny icons (declared width/height < MIN_PX, or sprite/spacer/pixel names)
//     are dropped UNLESS they look like a trust/certification badge — those are
//     valuable even when small (ISO logos etc.).
//   - data:, javascript:, and tracking pixels are ignored.
//   - Everything is resolved to an absolute URL and de-duplicated.

import type { CheerioAPI } from "cheerio";
import { absoluteUrl } from "./http";

const MIN_PX = 48;

const TRUST_HINT =
  /(cert|iso|certificate|ce-mark|ce_mark|badge|verified|trust|seal|award|accredit|compliance|quality|audit)/i;
// Decorative / navigation / tracking / placeholder imagery that is NOT supplier
// media. Cert/trust badges are exempt (handled by TRUST_HINT before this runs).
const ICON_NOISE =
  /(sprite|spacer|pixel|blank\.gif|1x1|tracking|favicon|loader|placeholder|avatar|(^|[\/_-])ico[-_.]|[\/_-]icon|icons?[\/_-]|arrow|chevron|caret|hamburger|burger|\bmenu\b|search|magnifier|close|cross|times|exit|play[-_]?(button|btn)?|social|share|twitter|facebook|instagram|linkedin|youtube|whatsapp|pinterest|tiktok|flag[-_]|chat[-_]|cookie|scroll|hero[-_]?bg|pattern|dots?\.svg|swatch|spinner)/i;

function imgSrc($: CheerioAPI, el: Parameters<CheerioAPI>[0]): string | null {
  const $el = $(el);
  return (
    $el.attr("src") ||
    $el.attr("data-src") ||
    $el.attr("data-lazy-src") ||
    $el.attr("data-original") ||
    ($el.attr("srcset") || "").split(",")[0]?.trim().split(" ")[0] ||
    null
  );
}

function dimensionAttr(v: string | undefined): number | null {
  if (!v) return null;
  const n = parseInt(v.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
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
    '.navbar img',
    'header img',
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
