// companyExtractor — company name, description and contact details.
//
//   name        ← schema.org Organization → og:site_name → <title> → h1 → footer
//   description ← meta description → og:description → schema.org → first about para
//   phone/email ← tel:/mailto: links → schema.org → footer text patterns
//   address     ← schema.org PostalAddress → address tag → footer text
// All fields are optional; missing data yields null (never throws).

import type { CheerioAPI } from "cheerio";

function firstJsonLdOrg($: CheerioAPI): Record<string, unknown> | null {
  let found: Record<string, unknown> | null = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (found) return;
    const raw = $(el).contents().text();
    if (!raw) return;
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }
    const visit = (n: unknown) => {
      if (found) return;
      if (Array.isArray(n)) return n.forEach(visit);
      if (n && typeof n === "object") {
        const obj = n as Record<string, unknown>;
        if (Array.isArray(obj["@graph"])) (obj["@graph"] as unknown[]).forEach(visit);
        const type = obj["@type"];
        const t = Array.isArray(type) ? type.join(",") : String(type ?? "");
        if (/(Organization|LocalBusiness|Corporation|Store)/i.test(t)) found = obj;
      }
    };
    visit(data);
  });
  return found;
}

function clean(text: string | null | undefined, max = 600): string | null {
  if (!text) return null;
  const t = text.replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : null;
}

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_RE = /(\+?\d[\d\s().-]{6,}\d)/;

// Obvious placeholder / template / system emails that are not real contacts.
const PLACEHOLDER_EMAIL =
  /(example\.(com|org|net)|email@address|your@|name@|user@|domain\.com|@2x|sentry|wixpress|@sentry|no-?reply|do-?not-?reply|unchanged)/i;

function validEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const e = email.trim();
  if (!EMAIL_RE.test(e)) return null;
  if (PLACEHOLDER_EMAIL.test(e)) return null;
  return e;
}

export type CompanyInfo = {
  name: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
};

export function extractCompanyInfo($: CheerioAPI): CompanyInfo {
  const org = firstJsonLdOrg($);

  // ---- name ----
  let name: string | null = null;
  if (org && typeof org.name === "string") name = clean(org.name, 120);
  name =
    name ||
    clean($('meta[property="og:site_name"]').attr("content"), 120) ||
    clean($("title").first().text(), 120) ||
    clean($("h1").first().text(), 120);
  // Strip common "| Home" / "- Official Site" suffixes from <title>.
  if (name) name = name.split(/\s[|–—-]\s/)[0].trim() || name;

  // ---- description ----
  let description: string | null = null;
  if (org && typeof org.description === "string") description = clean(org.description);
  description =
    description ||
    clean($('meta[name="description"]').attr("content")) ||
    clean($('meta[property="og:description"]').attr("content")) ||
    clean($("main p, .about p, #about p, section p").first().text());

  // ---- email ---- (skip obvious placeholder/template/system addresses)
  let email: string | null = null;
  const mailtos = $('a[href^="mailto:"]')
    .map((_, a) => $(a).attr("href"))
    .get();
  for (const mt of mailtos) {
    const candidate = validEmail(mt.replace(/^mailto:/i, "").split("?")[0]);
    if (candidate) {
      email = candidate;
      break;
    }
  }
  if (!email && org && typeof org.email === "string") email = validEmail(org.email);
  if (!email) {
    const matches = $("body").text().match(new RegExp(EMAIL_RE, "gi")) ?? [];
    for (const m of matches) {
      const candidate = validEmail(m);
      if (candidate) {
        email = candidate;
        break;
      }
    }
  }

  // ---- phone ----
  let phone: string | null = null;
  const tel = $('a[href^="tel:"]').first().attr("href");
  if (tel) phone = tel.replace(/^tel:/i, "").trim() || null;
  if (!phone && org && typeof org.telephone === "string") phone = org.telephone.trim();
  if (!phone) {
    const footer = $("footer").text() + " " + $('[class*="contact" i]').text();
    const m = footer.match(PHONE_RE);
    if (m) phone = m[1].trim();
  }

  // ---- address ----
  let address: string | null = null;
  if (org && org.address) {
    const a = org.address as Record<string, unknown> | string;
    if (typeof a === "string") address = clean(a, 200);
    else if (a && typeof a === "object") {
      address = clean(
        [a.streetAddress, a.addressLocality, a.postalCode, a.addressRegion, a.addressCountry]
          .filter((x) => typeof x === "string")
          .join(", "),
        200
      );
    }
  }
  address = address || clean($("address").first().text(), 200);

  return { name, description, phone, email, address };
}
