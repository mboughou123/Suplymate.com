/**
 * Local logo assets under `public/images/suppliers/logos/logo-{slug}.png`.
 * Prefer these over remote CSV `logoUrl` banners whenever a file exists.
 * Later batches drop in as `logo-{slug}.png` and get wired via LOGO_SLUG_BY_ID
 * (or by matching the slug segment of the supplier id).
 */

/** Explicit id → filename slug for the curated logo pack. */
export const LOGO_SLUG_BY_ID: Record<string, string> = {
  "al-gharbia-pipe-company-llc-ae": "al-gharbia",
  "aj-steel-icad2-ae": "aj-steel",
  "jindal-saw-limited-in": "jindal-saw",
  "welspun-corp-limited-in": "welspun",
  "arabian-pipes-company-sa": "arabian-pipes",
  "apl-apollo-tubes-limited-in": "apl-apollo",
  "man-industries-india-limited-in": "man-industries",
  "hebei-huayang-steel-pipe-co-ltd-cn": "huayang",
  "al-jazeera-steel-products-co-saog-om": "al-jazeera",
  "ratnamani-metals-tubes-limited-in": "ratnamani",
  "emsteel-building-materials-pjsc-emsteel-ae": "emsteel",
  "ferrite-structural-steels-pvt-ltd-panvel": "ferrite",
  "qatar-steel-company-q-p-s-c-qa": "qatar-steel",
  "foliflex-wires-cables-delhi": "foliflex",
};

/** White-on-dark reverse logos that need a dark avatar chip. */
export const DARK_CHIP_LOGO_IDS = new Set<string>([
  "al-gharbia-pipe-company-llc-ae",
]);

export function localLogoPathForSupplierId(id: string): string | undefined {
  const slug = LOGO_SLUG_BY_ID[id];
  if (!slug) return undefined;
  return `/images/suppliers/logos/logo-${slug}.png`;
}

export function logoNeedsDarkChip(id: string): boolean {
  return DARK_CHIP_LOGO_IDS.has(id);
}
