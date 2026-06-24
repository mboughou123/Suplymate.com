// Pure, client-safe helper to extract a numeric minimum order quantity from a
// free-form string like "100 pcs" / "1 ton" / "500". Returns null when no
// number is present.
export function parseMoq(moq: string | number | null | undefined): number | null {
  if (typeof moq === "number") return moq > 0 ? Math.floor(moq) : null;
  if (!moq) return null;
  const m = String(moq).replace(/,/g, "").match(/\d+(\.\d+)?/);
  if (!m) return null;
  const n = Math.floor(Number(m[0]));
  return n > 0 ? n : null;
}
