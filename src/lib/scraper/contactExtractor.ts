// contactExtractor — support phone + contact email from a supplier's OWN website.
//
// Stricter than companyExtractor because these values are shown to buyers as
// "call" / "email" actions:
//   phone ← tel: links → schema.org telephone (never free-text digit runs)
//   email ← mailto: links → schema.org email → Cloudflare-protected addresses →
//           addresses in page text, but only on the supplier's own domain
// Free-mail addresses (gmail, yahoo, …) are accepted only from an explicit
// mailto: link or schema.org on the official site. Nothing is ever guessed.

import type { CheerioAPI } from "cheerio";

export type ContactCandidates = { phones: string[]; emails: string[] };

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,24}/gi;

const PLACEHOLDER_EMAIL =
  /(example\.(com|org|net)|email@address|^your|^name@|^user@|^email@|^test@|domain\.com|yourdomain|yoursite|mysite|company\.com|@2x|\.(png|jpe?g|gif|svg|webp|css|js)$|no-?reply|do-?not-?reply|unchanged|^xxx|^abc@)/i;

// Addresses that belong to site builders, analytics, plugins or agencies —
// they appear on supplier sites but never reach the supplier.
const VENDOR_EMAIL_DOMAINS = [
  "wix.com",
  "wixpress.com",
  "sentry.io",
  "sentry-next.wixpress.com",
  "shopify.com",
  "squarespace.com",
  "godaddy.com",
  "wordpress.com",
  "wordpress.org",
  "w3.org",
  "schema.org",
  "cloudflare.com",
  "google.com",
  "facebook.com",
  "jquery.com",
  "gravatar.com",
  "mailchimp.com",
  "hubspot.com",
  "elementor.com",
  "weebly.com",
  "jimdo.com",
];

const FREEMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.in",
  "yahoo.co.uk",
  "yahoo.fr",
  "hotmail.com",
  "hotmail.fr",
  "outlook.com",
  "live.com",
  "msn.com",
  "aol.com",
  "icloud.com",
  "me.com",
  "rediffmail.com",
  "163.com",
  "126.com",
  "qq.com",
  "sina.com",
  "yandex.ru",
  "mail.ru",
  "gmx.de",
  "gmx.net",
  "web.de",
  "t-online.de",
  "libero.it",
  "orange.fr",
  "free.fr",
  "naver.com",
  "daum.net",
]);

/** Lower-cased host without a leading "www.". */
export function siteHost(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

// Two hosts belong to the same organisation when one is a subdomain of the
// other or they share the same name on different TLDs (acme.de vs acme.com).
function sameOrganisation(emailDomain: string, host: string): boolean {
  if (emailDomain === host) return true;
  if (emailDomain.endsWith(`.${host}`) || host.endsWith(`.${emailDomain}`)) return true;
  const label = (d: string) => {
    const parts = d.split(".");
    const sld = parts.length >= 3 && parts[parts.length - 2].length <= 3 ? parts[parts.length - 3] : parts[parts.length - 2];
    return sld ?? d;
  };
  return label(emailDomain).length >= 4 && label(emailDomain) === label(host);
}

export function normalizeEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let e = raw.trim();
  try {
    e = decodeURIComponent(e);
  } catch {
    // keep the raw value
  }
  e = e.replace(/^mailto:/i, "").split("?")[0].trim().toLowerCase();
  const m = e.match(new RegExp(`^${EMAIL_RE.source}$`, "i"));
  if (!m) return null;
  if (PLACEHOLDER_EMAIL.test(e)) return null;
  const domain = e.split("@")[1];
  if (VENDOR_EMAIL_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))) return null;
  return e;
}

/**
 * Normalise a phone number for display. Keeps digits, a leading "+", spaces,
 * dashes, dots and parentheses; rejects anything that is not 7–15 digits
 * (the E.164 limit) or is an obvious filler like 0000000.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let p = raw.trim();
  try {
    p = decodeURIComponent(p);
  } catch {
    // keep the raw value
  }
  p = p.replace(/^(tel|callto):/i, "").split(/[;,]/)[0].replace(/\s+/g, " ").trim();
  if (!/^\+?[\d\s().\-/]+$/.test(p)) return null;
  const digits = p.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  if (/^(\d)\1+$/.test(digits) || digits === "1234567890" || digits.startsWith("1234567")) return null;
  return p.replace(/\s*\/\s*/g, " ").replace(/^\+\s+/, "+");
}

/** "tel:" href for a display phone number (digits and a leading +). */
export function telHref(phone: string): string {
  const trimmed = phone.trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  // "+44 (0)20 …": the bracketed trunk zero is not dialled internationally.
  const dialled = plus ? trimmed.replace(/\(0\)/g, "") : trimmed;
  return `tel:${plus}${dialled.replace(/\D/g, "")}`;
}

// Cloudflare "email protection" hex-encodes addresses into data-cfemail.
export function decodeCfEmail(hex: string): string | null {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length < 4 || hex.length % 2) return null;
  const key = parseInt(hex.slice(0, 2), 16);
  let out = "";
  for (let i = 2; i < hex.length; i += 2) {
    out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
  }
  return out;
}

function jsonLdContacts($: CheerioAPI): { phones: string[]; emails: string[] } {
  const phones: string[] = [];
  const emails: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    let data: unknown;
    try {
      data = JSON.parse($(el).contents().text());
    } catch {
      return;
    }
    const visit = (n: unknown, depth: number) => {
      if (depth > 6 || !n || typeof n !== "object") return;
      if (Array.isArray(n)) return n.forEach((x) => visit(x, depth + 1));
      const obj = n as Record<string, unknown>;
      const type = String(Array.isArray(obj["@type"]) ? obj["@type"].join(",") : obj["@type"] ?? "");
      if (/(Organization|LocalBusiness|Corporation|Store|ContactPoint|Place)/i.test(type)) {
        for (const v of [obj.telephone].flat()) if (typeof v === "string") phones.push(v);
        for (const v of [obj.email].flat()) if (typeof v === "string") emails.push(v);
      }
      for (const key of ["@graph", "contactPoint", "address", "location", "department"]) {
        if (obj[key]) visit(obj[key], depth + 1);
      }
    };
    visit(data, 0);
  });
  return { phones, emails };
}

function uniq(values: (string | null)[]): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v)))];
}

/** Every acceptable phone / email on one page of the supplier's own site. */
export function extractContactCandidates($: CheerioAPI, pageUrl: string): ContactCandidates {
  const host = siteHost(pageUrl) ?? "";
  const ld = jsonLdContacts($);

  const phones = uniq([
    ...$('a[href^="tel:" i], a[href^="callto:" i]')
      .map((_, a) => $(a).attr("href") ?? "")
      .get()
      .map(normalizePhone),
    ...ld.phones.map(normalizePhone),
  ]);

  const explicit = uniq([
    ...$('a[href^="mailto:" i]')
      .map((_, a) => $(a).attr("href") ?? "")
      .get()
      .map(normalizeEmail),
    ...ld.emails.map(normalizeEmail),
  ]);
  const protectedEmails = uniq(
    $("[data-cfemail]")
      .map((_, el) => decodeCfEmail($(el).attr("data-cfemail") ?? ""))
      .get()
      .map(normalizeEmail),
  );
  $("script, style, noscript, template").remove();
  const inText = uniq(($("body").text().match(EMAIL_RE) ?? []).map(normalizeEmail));

  const onDomain = (e: string) => sameOrganisation(e.split("@")[1], host);
  const isFreemail = (e: string) => FREEMAIL_DOMAINS.has(e.split("@")[1]);
  const emails = uniq([
    ...explicit.filter((e) => onDomain(e) || isFreemail(e)),
    ...protectedEmails.filter((e) => onDomain(e) || isFreemail(e)),
    ...inText.filter(onDomain),
  ]);

  return { phones, emails };
}

const PREFERRED_MAILBOX = /^(sales|info|contact|enquir|inquir|export|office|support|hello|service|kontakt|contacto|vendas|ventas|vertrieb)/i;

// Mailboxes that never handle a buyer enquiry.
const NON_BUYER_MAILBOX = new RegExp(
  "^(?:" +
    [
      "(?:hr|ir|pr|ap|web|admin|legal|media|press|abuse|dpo)[._-]?\\d*@",
      "[^@]*(?:career|jobs?@|recruit|talent|hiring|staffing|privacy|gdpr|data-?protection|webmaster|compliance|investor|communications?@|newsletter|unsubscribe|billing|accounts?-?payable|invoic)",
    ].join("|") +
    ")",
  "i",
);

/** Pick the most buyer-relevant email: a sales/info style mailbox on the supplier's domain first. */
export function pickEmail(emails: string[], websiteUrl: string): string | null {
  const usable = emails.filter((e) => !NON_BUYER_MAILBOX.test(e));
  if (!usable.length) return null;
  const host = siteHost(websiteUrl) ?? "";
  const score = (e: string) => {
    const [local, domain] = e.split("@");
    return (sameOrganisation(domain, host) ? 2 : 0) + (PREFERRED_MAILBOX.test(local) ? 1 : 0);
  };
  return [...usable].sort((a, b) => score(b) - score(a))[0];
}

const CONTACT_LINK =
  /(contact|kontakt|contacto|contato|contatti|contactez|impressum|imprint|get-in-touch|reach-us|enquir|inquir|iletisim|lien-he|liên hệ|联系|聯繫|お問い合わせ|문의)/i;

/** Same-site links that look like a contact / imprint page (max `limit`). */
export function findContactPageUrls($: CheerioAPI, pageUrl: string, limit = 2): string[] {
  const host = siteHost(pageUrl);
  const found: string[] = [];
  $("a[href]").each((_, a) => {
    if (found.length >= limit) return;
    const href = $(a).attr("href") ?? "";
    const text = $(a).text();
    if (!CONTACT_LINK.test(href) && !CONTACT_LINK.test(text)) return;
    let abs: URL;
    try {
      abs = new URL(href, pageUrl);
    } catch {
      return;
    }
    if (!/^https?:$/.test(abs.protocol)) return;
    if (siteHost(abs.toString()) !== host) return;
    abs.hash = "";
    const url = abs.toString();
    if (url === pageUrl || found.includes(url)) return;
    found.push(url);
  });
  return found;
}
