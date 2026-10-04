// Where a bot-pushed image may come from. Shared by the media-bot worker (to
// fail fast before uploading) and the push endpoint (which re-checks
// everything — the worker's checks are never trusted).
//
// Rule: the page an image was found on (`sourceUrl`) must be on the entity's
// own official website. The image file itself (`imageUrl`) may live on a CDN
// the site uses, but never on a marketplace or competing directory: their
// photos belong to their sellers / to them, and re-hosting them would also
// misrepresent where the picture comes from.

/** Registrable domains (or multi-TLD brand labels) images may never come from. */
export const MARKETPLACE_DOMAINS = [
  "alibaba.com",
  "alibaba.cn",
  "alicdn.com",
  "aliexpress.com",
  "aliexpress.us",
  "aliexpress.ru",
  "1688.com",
  "taobao.com",
  "tmall.com",
  "made-in-china.com",
  "micstatic.com",
  "globalsources.com",
  "indiamart.com",
  "imimg.com",
  "tradeindia.com",
  "exportersindia.com",
  "dhgate.com",
  "ec21.com",
  "ecplaza.net",
  "tradekey.com",
  "go4worldbusiness.com",
  "temu.com",
  "walmart.com",
  "walmartimages.com",
  "etsy.com",
  "etsystatic.com",
  "ebayimg.com",
  "media-amazon.com",
  "ssl-images-amazon.com",
  "thomasnet.com",
  "kompass.com",
  "europages.com",
] as const;

/** Brands whose marketplaces span many TLDs (amazon.de, ebay.co.uk, …). */
const MARKETPLACE_BRAND_LABELS = new Set(["amazon", "ebay", "europages", "alibaba", "aliexpress", "kompass"]);

/** Hosts that appear in source fields but are never a company's own site (maps listings, socials). */
const NON_COMPANY_LABELS = new Set(["google", "goo", "facebook", "fb", "linkedin", "instagram", "youtube", "twitter", "x", "wikipedia", "bing", "yelp", "yellowpages"]);

/** Second-level public suffixes common in supplier websites (enough for matching, not a full PSL). */
const MULTI_PART_SUFFIXES = new Set([
  "co.uk", "org.uk", "ac.uk", "gov.uk", "co.jp", "or.jp", "ne.jp", "co.kr", "or.kr", "co.in", "net.in", "org.in",
  "co.za", "co.nz", "co.id", "co.th", "co.il", "com.au", "net.au", "org.au", "com.br", "com.cn", "net.cn", "org.cn",
  "com.hk", "com.tw", "com.sg", "com.my", "com.mx", "com.ar", "com.co", "com.pe", "com.tr", "com.eg", "com.sa",
  "com.pk", "com.vn", "com.ph", "com.ng", "com.ua", "com.pl", "com.es", "com.pt", "com.gr", "com.ru",
]);

export function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.hostname.toLowerCase().replace(/\.$/, "") || null;
  } catch {
    return null;
  }
}

/** `shop.acme.co.uk` → `acme.co.uk`; IP addresses and single labels are returned as-is. */
export function registrableDomain(host: string): string {
  const h = host.toLowerCase().replace(/^www\./, "");
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.includes(":")) return h;
  const labels = h.split(".").filter(Boolean);
  if (labels.length <= 2) return labels.join(".");
  const lastTwo = labels.slice(-2).join(".");
  return MULTI_PART_SUFFIXES.has(lastTwo) ? labels.slice(-3).join(".") : lastTwo;
}

export function isMarketplaceHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const reg = registrableDomain(host);
  if ((MARKETPLACE_DOMAINS as readonly string[]).includes(reg)) return true;
  return MARKETPLACE_BRAND_LABELS.has(reg.split(".")[0]);
}

export function isMarketplaceUrl(url: string | null | undefined): boolean {
  return isMarketplaceHost(hostOf(url));
}

/**
 * Registrable domains that count as an entity's own site, from its website /
 * source URLs. Marketplace storefronts (`acme.en.alibaba.com`), maps listings
 * and social pages never qualify.
 */
export function officialDomains(urls: (string | null | undefined)[]): string[] {
  const out = new Set<string>();
  for (const u of urls) {
    const host = hostOf(u) ?? hostOf(u && !/^[a-z]+:\/\//i.test(u) ? `https://${u}` : null);
    if (!host || isMarketplaceHost(host)) continue;
    const reg = registrableDomain(host);
    if (NON_COMPANY_LABELS.has(reg.split(".")[0])) continue;
    out.add(reg);
  }
  return [...out].sort();
}

export type ProvenanceVerdict = { ok: true } | { ok: false; reason: string };

export function checkProvenance(input: {
  sourceUrl: string | null | undefined;
  imageUrl?: string | null;
  officialDomains: string[];
}): ProvenanceVerdict {
  const sourceHost = hostOf(input.sourceUrl);
  if (!sourceHost) return { ok: false, reason: "sourceUrl must be the http(s) page on the company's own website where the image appears" };
  if (isMarketplaceHost(sourceHost)) return { ok: false, reason: `images from marketplaces or competing directories (${sourceHost}) are not accepted` };
  if (input.imageUrl) {
    const imageHost = hostOf(input.imageUrl);
    if (!imageHost) return { ok: false, reason: "imageUrl must be an http(s) URL" };
    if (isMarketplaceHost(imageHost)) return { ok: false, reason: `images hosted by marketplaces or competing directories (${imageHost}) are not accepted` };
  }
  if (!input.officialDomains.length) return { ok: false, reason: "no official website on file for this entity, so the image source cannot be checked" };
  const reg = registrableDomain(sourceHost);
  if (!input.officialDomains.includes(reg)) {
    return { ok: false, reason: `sourceUrl (${sourceHost}) is not on the entity's official website (${input.officialDomains.join(", ")})` };
  }
  return { ok: true };
}
