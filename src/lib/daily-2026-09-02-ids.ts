/**
 * Daily 2026-09-02 mill ids — kept free of Node fs so client sort can import it.
 * Ducab overlays the existing Outscraper row instead of adding a second card.
 */

export const DUCAB_EXISTING_ID = "ducab-dubai-cable-company-pvt-ltd-ae";

export const DAILY_20260902_SLUGS = [
  "posco",
  "nucor",
  "voestalpine",
  "ssab",
  "china-steel",
  "bluescope",
  "outokumpu",
  "gerdau",
  "hyundai-steel",
  "nippon-steel",
  "arcelormittal",
  "salzgitter",
  "sail",
  "tenaris",
  "vallourec",
  "youfa",
  "jiuli",
  "ducab",
  "nexans",
  "prysmian",
  "havells",
  "finolex-cables",
  "far-east-cable",
  "hengtong",
  "oman-cables",
  "ls-cable",
  "holcim",
  "shree-cement",
  "dangote-cement",
  "jsw-cement",
  "dalmia-bharat",
  "jk-cement",
  "scg",
  "interarch",
  "crh",
  "timken",
  "nsk",
  "ksb",
  "wilo",
  "lyc-bearing",
  "shakti-pumps",
  "flowserve",
  "skf",
  "amcor",
  "yuto",
  "mondi",
  "huhtamaki",
  "greif",
  "ball",
  "tetra-pak",
] as const;

export function dailySupplierIdForSlug(slug: string): string {
  return slug === "ducab" ? DUCAB_EXISTING_ID : slug;
}

export const DAILY_20260902_SUPPLIER_IDS: ReadonlySet<string> = new Set(
  DAILY_20260902_SLUGS.map(dailySupplierIdForSlug),
);

export function isDaily20260902Supplier(
  supplier: { id: string } | string | null | undefined,
): boolean {
  if (!supplier) return false;
  const id = typeof supplier === "string" ? supplier : supplier.id;
  return DAILY_20260902_SUPPLIER_IDS.has(id);
}
