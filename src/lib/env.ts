// Lightweight, NON-FATAL environment validation.
//
// Goals:
//   - Surface misconfiguration early via clear server logs (never secrets).
//   - NEVER throw / crash: local + MVP flows must keep working even with a
//     minimal env (the app already degrades gracefully — DB falls back to the
//     static dataset, optional API keys are no-ops).
//
// Runs once per server process. Safe to import from any server module.

let checked = false;

/** Required for core functionality (warn loudly if missing in production). */
const REQUIRED = ["DATABASE_URL"] as const;

/** Auth secret: Auth.js reads AUTH_SECRET (or NEXTAUTH_SECRET as a fallback). */
const AUTH_SECRET_KEYS = ["AUTH_SECRET", "NEXTAUTH_SECRET"] as const;

/** Optional integrations — absence simply disables the related feature. */
const OPTIONAL = [
  "DIRECT_URL",
  "GOOGLE_PLACES_API_KEY",
  "OPENAI_API_KEY",
  "OUTSCRAPER_API_KEY",
  "ADMIN_EMAILS",
] as const;

function present(name: string): boolean {
  const v = process.env[name];
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * Validate environment variables. Logs warnings (production) / info (dev) but
 * never throws. Returns the list of missing required vars for callers that want
 * to react. Idempotent: only logs on the first call per process.
 */
export function checkEnv(): { missingRequired: string[] } {
  const isProd = process.env.NODE_ENV === "production";
  const missingRequired = REQUIRED.filter((k) => !present(k));
  const hasAuthSecret = AUTH_SECRET_KEYS.some(present);

  if (!checked) {
    checked = true;
    for (const k of missingRequired) {
      console.warn(
        `[env] Missing ${k}. Database features will fall back to the static dataset.`
      );
    }
    if (!hasAuthSecret) {
      console.warn(
        "[env] Missing AUTH_SECRET (or NEXTAUTH_SECRET). Set one in production for stable sessions."
      );
    }
    if (!isProd) {
      const missingOptional = OPTIONAL.filter((k) => !present(k));
      if (missingOptional.length) {
        console.info(
          `[env] Optional vars not set (features disabled): ${missingOptional.join(", ")}.`
        );
      }
    }
  }

  return { missingRequired };
}
