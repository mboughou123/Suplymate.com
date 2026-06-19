// Compliance guardrails for the supplier-website scraper.
//
// The scraper indexes ONLY public company websites. This module is the single
// place that encodes what we will NEVER touch, so the policy is auditable:
//   - No social networks (LinkedIn, X/Twitter, Facebook, Instagram, TikTok…).
//   - No private / authenticated / paywalled areas (login, account, checkout,
//     admin, cart, wishlist, api endpoints…).
//   - No anti-bot / captcha circumvention — we simply refuse blocked pages.
// Combined with robotsChecker (robots.txt) and rate limiting in the orchestrator
// these keep the crawler well-behaved and legally defensible.

/** Hostnames (or suffixes) we must never scrape. */
const BLOCKED_HOST_SUFFIXES = [
  "linkedin.com",
  "x.com",
  "twitter.com",
  "facebook.com",
  "fb.com",
  "instagram.com",
  "tiktok.com",
  "youtube.com",
  "pinterest.com",
  "snapchat.com",
  "reddit.com",
  "wa.me",
  "t.me",
  "whatsapp.com",
];

/** Path fragments that indicate a private / authenticated / transactional area. */
const BLOCKED_PATH_PATTERNS = [
  /\/login(\b|\/|$)/i,
  /\/signin(\b|\/|$)/i,
  /\/sign-in(\b|\/|$)/i,
  /\/signup(\b|\/|$)/i,
  /\/register(\b|\/|$)/i,
  /\/account(\b|\/|$)/i,
  /\/my-account(\b|\/|$)/i,
  /\/admin(\b|\/|$)/i,
  /\/dashboard(\b|\/|$)/i,
  /\/checkout(\b|\/|$)/i,
  /\/cart(\b|\/|$)/i,
  /\/basket(\b|\/|$)/i,
  /\/wishlist(\b|\/|$)/i,
  /\/wp-admin(\b|\/|$)/i,
  /\/wp-login/i,
  /\/api(\b|\/|$)/i,
  /\/oauth(\b|\/|$)/i,
  /\/logout(\b|\/|$)/i,
];

export type SafetyVerdict = { allowed: true } | { allowed: false; reason: string };

/** Returns whether a URL is permitted by our own (non-robots) safety policy. */
export function checkUrlSafety(rawUrl: string): SafetyVerdict {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { allowed: false, reason: "invalid URL" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { allowed: false, reason: `unsupported protocol ${url.protocol}` };
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  for (const suffix of BLOCKED_HOST_SUFFIXES) {
    if (host === suffix || host.endsWith(`.${suffix}`)) {
      return { allowed: false, reason: `social/private network (${suffix}) is not scraped` };
    }
  }

  // Disallow obvious credential/query-auth on the URL.
  if (/[?&](token|auth|session|password|api[_-]?key)=/i.test(url.search)) {
    return { allowed: false, reason: "URL carries authentication parameters" };
  }

  const path = url.pathname;
  for (const pattern of BLOCKED_PATH_PATTERNS) {
    if (pattern.test(path)) {
      return { allowed: false, reason: `private/transactional path (${path})` };
    }
  }

  return { allowed: true };
}

/** True if the host is a social/private network we refuse outright. */
export function isBlockedHost(rawUrl: string): boolean {
  const verdict = checkUrlSafety(rawUrl);
  return !verdict.allowed;
}
