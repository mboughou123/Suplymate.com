// Minimal validation helpers for server actions.
//
// The project has no validation library and adding one was out of scope, so
// these cover the cases the public forms actually need. Every helper returns
// the cleaned value or null, so callers branch on null rather than inspecting
// raw FormData.

/** Shape returned by every public form action, consumed via useActionState. */
export type FormState = {
  status: "idle" | "success" | "error";
  /** Form-level message (submission failed, rate limited, etc.). */
  message?: string;
  /** Per-field messages keyed by input name. */
  fieldErrors?: Record<string, string>;
};

export const idleFormState: FormState = { status: "idle" };

/**
 * Deliberately permissive: the goal is to catch typos and obvious junk, not to
 * adjudicate RFC 5322. Over-strict patterns reject valid addresses, and the
 * only real proof an address works is sending to it.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function readString(
  formData: FormData,
  field: string,
  maxLength: number
): string | null {
  const raw = formData.get(field);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  return trimmed;
}

export function readOptionalString(
  formData: FormData,
  field: string,
  maxLength: number
): string | null {
  const raw = formData.get(field);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

export function readEmail(formData: FormData, field: string): string | null {
  const value = readString(formData, field, 254);
  if (!value) return null;
  const normalised = value.toLowerCase();
  return EMAIL_PATTERN.test(normalised) ? normalised : null;
}

export function readChoice<T extends string>(
  formData: FormData,
  field: string,
  allowed: readonly T[],
  fallback: T
): T {
  const raw = formData.get(field);
  return typeof raw === "string" && (allowed as readonly string[]).includes(raw)
    ? (raw as T)
    : fallback;
}

/**
 * True when a hidden honeypot input was filled, which only a bot does.
 *
 * Cheap and privacy-preserving compared with a captcha. It is not a complete
 * defence — it stops naive form-filling bots, not a targeted attacker.
 */
export function isHoneypotTripped(formData: FormData, field = "website"): boolean {
  const raw = formData.get(field);
  return typeof raw === "string" && raw.trim().length > 0;
}
