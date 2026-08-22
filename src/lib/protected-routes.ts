// Single source of truth for authenticated-only areas.
//
// Shared by the auth middleware (which redirects anonymous visitors to login)
// and robots.ts (which asks crawlers not to fetch them). Keeping one list
// prevents the two from drifting, which would otherwise leak private routes
// into search results or expose them to crawl budget.
//
// Paths are locale-agnostic: compare against a pathname that has already had
// its locale prefix removed via `stripLocalePrefix`.

export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/settings",
  "/messages",
  "/rfqs",
  "/supplier-dashboard",
  "/onboarding",
  "/notifications",
  "/purchase-orders",
  "/saved",
  "/admin",
] as const;

export const PROTECTED_API_PREFIXES = ["/api/price-alerts", "/api/account"] as const;

/** True when `path` (locale stripped) is the prefix itself or nested under it. */
export function matchesPrefix(
  path: string,
  prefixes: readonly string[]
): boolean {
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`));
}
