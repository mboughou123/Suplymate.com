// Tiny in-memory rate limiter (per-process). Good enough for app-level abuse
// protection on a single serverless instance; for multi-region scale move this
// to a shared store (e.g. Upstash/Redis). Never throws.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetInSeconds: number;
};

/**
 * Sliding fixed-window limiter.
 * @param key    unique caller key (e.g. `ai:${userId}`)
 * @param limit  max requests per window
 * @param windowMs window length in milliseconds
 */
export function rateLimit(
  key: string,
  limit = 20,
  windowMs = 60_000
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now > existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetInSeconds: windowMs / 1000 };
  }

  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);
  const resetInSeconds = Math.ceil((existing.resetAt - now) / 1000);

  // Opportunistic cleanup so the map can't grow unbounded.
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) {
      if (now > b.resetAt) buckets.delete(k);
    }
  }

  return { ok: existing.count <= limit, remaining, resetInSeconds };
}
