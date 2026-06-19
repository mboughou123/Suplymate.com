// Trust score for imported/scraped suppliers.
//
// Distinct from `supplier-ranking.ts` (which scores public Google-Maps listings
// by rating/reviews). This score measures DATA COMPLETENESS & CONSISTENCY of a
// supplier profile collected via CSV import or the website scraper — i.e. how
// much verifiable, self-consistent information we hold. It is shown to admins
// during review and stored on `Supplier.trustScore`.
//
// Signals (weighted, clamped to 0–100):
//   - has a website                         (+12)
//   - has a business email                  (+12, +4 bonus if domain matches site)
//   - has a phone number                    (+10)
//   - has a postal address                  (+10)
//   - has product images                    (+14)
//   - has certification images              (+16)
//   - has a public description              (+10)
//   - has a source URL (provenance)         (+8)
//   - contact info is internally consistent (+8)

export type TrustScoreInput = {
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  description?: string | null;
  sourceUrl?: string | null;
  /** Supplier/company gallery + product image URLs. */
  productImages?: string[] | null;
  /** Certification / audit badge image URLs. */
  certificationImages?: string[] | null;
};

export type TrustScoreBreakdown = {
  score: number;
  signals: { label: string; points: number; earned: boolean }[];
};

function nonEmpty(v?: string | null): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

function hostOf(value: string): string | null {
  try {
    // Accept bare domains as well as full URLs.
    const url = value.includes("://") ? value : `https://${value}`;
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function emailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 0) return null;
  return email.slice(at + 1).trim().toLowerCase() || null;
}

/**
 * Compute a 0–100 trust score plus a per-signal breakdown so the admin UI can
 * explain WHY a supplier scored the way it did. Pure + resilient: never throws
 * on missing/garbage data.
 */
export function computeTrustScore(input: TrustScoreInput): TrustScoreBreakdown {
  const hasWebsite = nonEmpty(input.website);
  const hasEmail = nonEmpty(input.email);
  const hasPhone = nonEmpty(input.phone);
  const hasAddress = nonEmpty(input.address);
  const hasDescription = nonEmpty(input.description) && (input.description as string).trim().length >= 24;
  const hasSource = nonEmpty(input.sourceUrl);
  const productImages = (input.productImages ?? []).filter(nonEmpty);
  const certImages = (input.certificationImages ?? []).filter(nonEmpty);
  const hasProductImages = productImages.length > 0;
  const hasCertImages = certImages.length > 0;

  // Email looks like a real business address (not a freemail provider).
  const freemail = /^(gmail|yahoo|hotmail|outlook|icloud|aol|gmx|mail|proton(mail)?|yandex)\./i;
  const domain = hasEmail ? emailDomain(input.email as string) : null;
  const businessEmail = hasEmail && !!domain && !freemail.test(domain);

  // Contact consistency: email domain matches the website host.
  let consistent = false;
  if (hasWebsite && hasEmail && domain) {
    const host = hostOf(input.website as string);
    consistent = !!host && (host === domain || host.endsWith(`.${domain}`) || domain.endsWith(`.${host}`));
  }

  const signals: TrustScoreBreakdown["signals"] = [
    { label: "Website", points: 12, earned: hasWebsite },
    { label: "Business email", points: 12, earned: businessEmail },
    // Any email (even freemail) still earns partial credit.
    { label: "Contact email", points: 4, earned: hasEmail && !businessEmail },
    { label: "Phone number", points: 10, earned: hasPhone },
    { label: "Postal address", points: 10, earned: hasAddress },
    { label: "Product images", points: 14, earned: hasProductImages },
    { label: "Certification images", points: 16, earned: hasCertImages },
    { label: "Public description", points: 10, earned: hasDescription },
    { label: "Source URL", points: 8, earned: hasSource },
    { label: "Consistent contact info", points: 8, earned: consistent },
  ];

  const raw = signals.reduce((sum, s) => sum + (s.earned ? s.points : 0), 0);
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  return { score, signals };
}

/** Convenience: just the numeric score. */
export function trustScore(input: TrustScoreInput): number {
  return computeTrustScore(input).score;
}
