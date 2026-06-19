// certificationExtractor — keyword-driven detection of certifications, audits,
// compliance marks, licenses, awards and accreditations on a public page.
//
// Strategy:
//   1) Scan text nodes near certification keywords to capture the cert NAME
//      (e.g. "ISO 9001", "CE", "FDA approved", "SGS audited").
//   2) Treat any image whose alt/src/class hints at a trust/cert badge as a
//      certification IMAGE (these are stored in `certificationImages`).
//   3) Recognise well-known standard codes via a compact regex.
// Resilient: returns empty arrays rather than throwing on odd markup.

import type { CheerioAPI } from "cheerio";
import { absoluteUrl } from "./http";
import type { ScrapedCertification } from "./types";

// Section/keyword triggers (from the product brief).
const CERT_KEYWORDS = [
  "certification",
  "certificate",
  "certified",
  "iso",
  "compliance",
  "compliant",
  "quality assurance",
  "quality management",
  "license",
  "licence",
  "verified",
  "trust",
  "safety",
  "factory audit",
  "accreditation",
  "accredited",
  "awards",
  "standards",
];

// Known standards / authorities → typed for nicer display.
const STANDARD_PATTERNS: { re: RegExp; type: string }[] = [
  { re: /\bISO\s?\d{4,5}(?::\d{4})?\b/gi, type: "ISO" },
  { re: /\bCE\b(?=\s*(mark|marking|certified|conformity)?)/g, type: "CE" },
  { re: /\bRoHS\b/gi, type: "RoHS" },
  { re: /\bREACH\b/g, type: "REACH" },
  { re: /\bFDA\b/g, type: "FDA" },
  { re: /\bGMP\b/g, type: "GMP" },
  { re: /\bHACCP\b/gi, type: "HACCP" },
  { re: /\bFSC\b/g, type: "FSC" },
  { re: /\bSGS\b/g, type: "audit" },
  { re: /\bTÜV\b|\bTUV\b/gi, type: "audit" },
  { re: /\bIntertek\b/gi, type: "audit" },
  { re: /\bBureau Veritas\b/gi, type: "audit" },
  { re: /\bAPI\s?\d{1,3}[A-Z]?\b/g, type: "API" },
  { re: /\bASTM\s?[A-Z]?\d+\b/gi, type: "ASTM" },
  { re: /\bEN\s?\d{3,6}(?:-\d+)?\b/g, type: "EN" },
  { re: /\bUL\b(?=\s*(listed|certified))/gi, type: "UL" },
];

const BADGE_HINT =
  /(cert|iso|certificate|ce-mark|ce_mark|badge|verified|trust|seal|award|accredit|compliance|quality|audit|license|licence)/i;

function classifyName(name: string): string | null {
  for (const { re, type } of STANDARD_PATTERNS) {
    re.lastIndex = 0;
    if (re.test(name)) return type;
  }
  return null;
}

export type CertificationExtraction = {
  certifications: ScrapedCertification[];
  certificationImages: string[];
};

export function extractCertifications(
  $: CheerioAPI,
  pageUrl: string
): CertificationExtraction {
  const certs = new Map<string, ScrapedCertification>();
  const certImages = new Set<string>();

  const add = (name: string, type: string | null, imageUrl: string | null, certUrl: string | null) => {
    const clean = name.replace(/\s+/g, " ").trim();
    if (!clean || clean.length > 80) return;
    const key = clean.toLowerCase();
    const existing = certs.get(key);
    if (existing) {
      if (!existing.imageUrl && imageUrl) existing.imageUrl = imageUrl;
      if (!existing.certificateUrl && certUrl) existing.certificateUrl = certUrl;
      return;
    }
    certs.set(key, {
      name: clean,
      type: type ?? classifyName(clean),
      imageUrl,
      certificateUrl: certUrl,
      sourceUrl: pageUrl,
    });
  };

  // 1) Match known standard codes anywhere in the page text.
  const bodyText = $("body").text().replace(/\s+/g, " ");
  for (const { re, type } of STANDARD_PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    let guard = 0;
    while ((m = re.exec(bodyText)) && guard < 50) {
      guard++;
      add(m[0], type, null, null);
    }
  }

  // 2) Inspect images that look like certification badges.
  $("img").each((_, el) => {
    const $el = $(el);
    const src = $el.attr("src") || $el.attr("data-src") || "";
    const alt = $el.attr("alt") || "";
    const cls = $el.attr("class") || "";
    const haystack = `${src} ${alt} ${cls}`;
    if (!BADGE_HINT.test(haystack)) return;
    const abs = absoluteUrl(pageUrl, src);
    if (!abs) return;
    certImages.add(abs);
    // The alt text frequently names the certificate.
    if (alt && /[a-z]/i.test(alt)) add(alt, classifyName(alt), abs, null);
  });

  // 3) Inspect links to certificate documents (PDFs) within cert-ish sections.
  $('a[href$=".pdf"], a[href*="cert" i], a[href*="certificate" i]').each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();
    const href = absoluteUrl(pageUrl, $el.attr("href"));
    if (!href) return;
    const label = text || "Certificate";
    if (CERT_KEYWORDS.some((k) => `${text} ${href}`.toLowerCase().includes(k))) {
      add(label.slice(0, 80), classifyName(label), null, href);
    }
  });

  return {
    certifications: [...certs.values()],
    certificationImages: [...certImages],
  };
}
