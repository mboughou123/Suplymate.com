import { createHmac, timingSafeEqual } from "node:crypto";

// Scraped product photos live on supplier websites. Rendering them directly
// breaks (hotlink protection, mixed content, no next/image allowlist), so
// cards point at /api/product-image/<sig>/<encoded-url> instead: a signed,
// CDN-cached passthrough. The signature keeps the route from being an open proxy.

const ROUTE = "/api/product-image";

function secret(): string | null {
  return (
    process.env.IMAGE_PROXY_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || null
  );
}

function sign(url: string, key: string): string {
  return createHmac("sha256", key).update(url).digest("base64url").slice(0, 32);
}

/** First-party URL for a remote product photo, or null when signing is unavailable. */
export function proxiedProductImageUrl(remoteUrl: string): string | null {
  const key = secret();
  if (!key) return null;
  const encoded = Buffer.from(remoteUrl, "utf8").toString("base64url");
  return `${ROUTE}/${sign(remoteUrl, key)}/${encoded}`;
}

/** Decodes and verifies a proxied URL's path segments; null when tampered with. */
export function verifyProxiedImage(sig: string, encoded: string): string | null {
  const key = secret();
  if (!key) return null;
  let url: string;
  try {
    url = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const expected = Buffer.from(sign(url, key));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return url;
}

/**
 * WordPress / PrestaShop scrapes often capture a 100px thumbnail
 * (`…-100x100.jpg`, `…-small_default/…`). Try the full-size original first.
 */
export function fullSizeCandidates(url: string): string[] {
  const upgrades = [
    url.replace(/-\d{2,4}x\d{2,4}(\.(?:jpe?g|png|webp))(\?|$)/i, "$1$2"),
    url.replace(/-(small|medium|home|cart)_default\//i, "-large_default/"),
  ].filter((u) => u !== url);
  return [...new Set([...upgrades, url])];
}
