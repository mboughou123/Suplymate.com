/**
 * Careers page data + application payload validation.
 * Kept framework-free so it can be unit-tested and shared by the API route
 * and the client form.
 */

export const CAREER_ROLE_KEYS = [
  "foundingEngineer",
  "dataAnalyst",
  "growthPartnerships",
  "supplierSuccess",
  "general",
] as const;

export type CareerRoleKey = (typeof CAREER_ROLE_KEYS)[number];

export type CareerApplication = {
  name: string;
  email: string;
  phone?: string;
  role: CareerRoleKey;
  location?: string;
  linkedin?: string;
  cvUrl?: string;
  message: string;
};

export type ApplicationFieldError = Partial<Record<keyof CareerApplication, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const URL_RE = /^https?:\/\/[^\s]+$/i;

export const APPLICATION_LIMITS = {
  name: { min: 2, max: 80 },
  email: { max: 160 },
  phone: { max: 40 },
  location: { max: 80 },
  url: { max: 300 },
  message: { min: 30, max: 3000 },
} as const;

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/**
 * Validate and normalise an untrusted payload. Error values are stable keys
 * (not sentences) so the client can map them to translated copy.
 */
export function validateApplication(
  input: unknown,
): { ok: true; data: CareerApplication } | { ok: false; errors: ApplicationFieldError } {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const errors: ApplicationFieldError = {};

  const name = str(raw.name, APPLICATION_LIMITS.name.max);
  if (name.length < APPLICATION_LIMITS.name.min) errors.name = "required";

  const email = str(raw.email, APPLICATION_LIMITS.email.max).toLowerCase();
  if (!EMAIL_RE.test(email)) errors.email = "invalidEmail";

  const phone = str(raw.phone, APPLICATION_LIMITS.phone.max);

  const role = str(raw.role, 40) as CareerRoleKey;
  if (!CAREER_ROLE_KEYS.includes(role)) errors.role = "required";

  const location = str(raw.location, APPLICATION_LIMITS.location.max);

  const linkedin = str(raw.linkedin, APPLICATION_LIMITS.url.max);
  if (linkedin && !URL_RE.test(linkedin)) errors.linkedin = "invalidUrl";

  const cvUrl = str(raw.cvUrl, APPLICATION_LIMITS.url.max);
  if (cvUrl && !URL_RE.test(cvUrl)) errors.cvUrl = "invalidUrl";

  const message = str(raw.message, APPLICATION_LIMITS.message.max);
  if (message.length < APPLICATION_LIMITS.message.min) errors.message = "tooShort";

  if (Object.keys(errors).length) return { ok: false, errors };

  return {
    ok: true,
    data: {
      name,
      email,
      phone: phone || undefined,
      role,
      location: location || undefined,
      linkedin: linkedin || undefined,
      cvUrl: cvUrl || undefined,
      message,
    },
  };
}
