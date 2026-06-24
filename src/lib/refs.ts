// Human-friendly public reference generation, e.g. "RFQ-2026-000123".
//
// Uniqueness is ultimately guaranteed by the DB unique constraint on the
// `publicRef` columns; callers should generate, attempt the insert, and retry
// on a unique-violation. This helper produces a deterministic-ish, readable ref
// from a sequence number plus the current year.

export function formatPublicRef(prefix: string, seq: number, year = new Date().getFullYear()): string {
  const padded = String(Math.max(1, seq)).padStart(6, "0");
  return `${prefix}-${year}-${padded}`;
}

// Build a candidate ref from an existing count. Add a small jitter on retries so
// concurrent inserts converge quickly without scanning.
export function nextPublicRef(prefix: string, existingCount: number, attempt = 0): string {
  return formatPublicRef(prefix, existingCount + 1 + attempt);
}
