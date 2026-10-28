import { locales, type Locale } from "@/i18n/routing";
import { cleanLandingPath, cleanReferrer, cleanUtm } from "@/lib/attribution";

/**
 * Homepage product chips (see HOME_PRODUCT_CATEGORIES). Duplicated here so the
 * signup form does not import the homepage catalogue picker into the client bundle.
 * A unit test fails if the two lists diverge.
 */
export const EARLY_ACCESS_CATEGORIES = [
  "Steel & Metals",
  "Cables & Electrical",
  "Tubes & Pipes",
  "Packaging",
  "Construction",
  "Industrial Parts",
] as const;

/** Same key scheme as `homeCategoryKey`, without importing the homepage picker. */
export function earlyAccessCategoryKey(category: string): string {
  return category
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .map((word, index) => (index === 0 ? word : word[0].toUpperCase() + word.slice(1)))
    .join("");
}

export function parseStoredCategories(raw: string): string[] {
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export const EARLY_ACCESS_ROLES = ["procurement", "engineer", "supplier", "other"] as const;
export type EarlyAccessRole = (typeof EARLY_ACCESS_ROLES)[number];

export const EARLY_ACCESS_LIMITS = {
  name: 80,
  company: 120,
  note: 2000,
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Throwaway inboxes. Ordinary personal domains are allowed; the field is labeled work email. */
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamailblock.com",
  "10minutemail.com",
  "tempmail.com",
  "trashmail.com",
  "yopmail.com",
  "sharklasers.com",
  "dispostable.com",
]);

export type EarlyAccessField = "email" | "name" | "company" | "role" | "categories" | "note";

export type EarlyAccessErrorCode =
  | "emailRequired"
  | "emailInvalid"
  | "nameTooLong"
  | "companyTooLong"
  | "roleInvalid"
  | "categoriesInvalid"
  | "noteTooLong";

export type EarlyAccessErrors = Partial<Record<EarlyAccessField, EarlyAccessErrorCode>>;

export type EarlyAccessData = {
  email: string;
  name: string | null;
  company: string | null;
  role: EarlyAccessRole | null;
  categories: string[];
  note: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  referrer: string | null;
  landingPath: string | null;
  locale: string | null;
};

export type EarlyAccessValidation =
  | { ok: true; data: EarlyAccessData }
  | { ok: false; errors: EarlyAccessErrors };

export const EARLY_ACCESS_ERROR_MESSAGES: Record<EarlyAccessErrorCode, string> = {
  emailRequired: "Please enter your work email.",
  emailInvalid: "Please enter a valid work email.",
  nameTooLong: "Name must be 80 characters or fewer.",
  companyTooLong: "Company must be 120 characters or fewer.",
  roleInvalid: "Please choose a role from the list.",
  categoriesInvalid: "Choose categories from the list.",
  noteTooLong: "Please keep this under 2,000 characters.",
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function first(input: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (key in input && input[key] != null && input[key] !== "") return input[key];
  }
  return undefined;
}

export function cleanLocale(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const locale = value.trim().toLowerCase();
  return locales.includes(locale as Locale) ? locale : null;
}

function isRole(value: string): value is EarlyAccessRole {
  return (EARLY_ACCESS_ROLES as readonly string[]).includes(value);
}

export function validateEarlyAccess(input: Record<string, unknown>): EarlyAccessValidation {
  const errors: EarlyAccessErrors = {};

  const email = text(input.email).toLowerCase();
  if (!email) {
    errors.email = "emailRequired";
  } else if (email.length > 254 || !EMAIL_RE.test(email)) {
    errors.email = "emailInvalid";
  } else {
    const domain = email.slice(email.lastIndexOf("@") + 1);
    if (DISPOSABLE_DOMAINS.has(domain)) errors.email = "emailInvalid";
  }

  const name = text(input.name);
  if (name.length > EARLY_ACCESS_LIMITS.name) errors.name = "nameTooLong";

  const company = text(input.company);
  if (company.length > EARLY_ACCESS_LIMITS.company) errors.company = "companyTooLong";

  const roleRaw = text(input.role);
  let role: EarlyAccessRole | null = null;
  if (roleRaw) {
    if (!isRole(roleRaw)) errors.role = "roleInvalid";
    else role = roleRaw;
  }

  const categoriesRaw = input.categories;
  let categories: string[] = [];
  if (categoriesRaw == null || categoriesRaw === "") {
    categories = [];
  } else if (!Array.isArray(categoriesRaw)) {
    errors.categories = "categoriesInvalid";
  } else {
    const allowed = new Set<string>(EARLY_ACCESS_CATEGORIES);
    const seen = new Set<string>();
    for (const item of categoriesRaw) {
      if (typeof item !== "string" || !allowed.has(item) || seen.has(item)) {
        errors.categories = "categoriesInvalid";
        break;
      }
      seen.add(item);
      categories.push(item);
    }
  }

  const note = text(input.note);
  if (note.length > EARLY_ACCESS_LIMITS.note) errors.note = "noteTooLong";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      email,
      name: name || null,
      company: company || null,
      role,
      categories,
      note: note || null,
      utmSource: cleanUtm(first(input, "utmSource", "utm_source")),
      utmMedium: cleanUtm(first(input, "utmMedium", "utm_medium")),
      utmCampaign: cleanUtm(first(input, "utmCampaign", "utm_campaign")),
      utmContent: cleanUtm(first(input, "utmContent", "utm_content")),
      referrer: cleanReferrer(first(input, "referrer")),
      landingPath: cleanLandingPath(first(input, "landingPath", "landing_path")),
      locale: cleanLocale(first(input, "locale")),
    },
  };
}
