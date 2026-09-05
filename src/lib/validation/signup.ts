// Shared sign-up rules used by BOTH the client form and POST /api/auth/register
// so the two can never drift apart again. Pure and framework-free so it is
// trivially unit-testable.

export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 80;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const COMPANY_MAX_LENGTH = 120;

export type SignupRole = "buyer" | "supplier";

export type SignupField =
  | "name"
  | "email"
  | "password"
  | "confirmPassword"
  | "acceptTerms"
  | "role"
  | "company";

export type SignupErrorCode =
  | "nameRequired"
  | "nameTooShort"
  | "nameTooLong"
  | "emailRequired"
  | "emailInvalid"
  | "emailTaken"
  | "passwordRequired"
  | "passwordTooShort"
  | "passwordTooLong"
  | "passwordNeedsLetter"
  | "passwordNeedsNumber"
  | "confirmRequired"
  | "confirmMismatch"
  | "termsRequired"
  | "roleInvalid"
  | "companyRequired"
  | "companyTooLong";

export type SignupFieldErrors = Partial<Record<SignupField, SignupErrorCode>>;

export type SignupInput = {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  confirmPassword?: unknown;
  acceptTerms?: unknown;
  role?: unknown;
  company?: unknown;
};

export type SignupData = {
  name: string;
  email: string;
  password: string;
  role: SignupRole;
  company: string | null;
};

export type SignupValidationResult =
  | { ok: true; data: SignupData }
  | { ok: false; errors: SignupFieldErrors };

/** English copy for API consumers / logs. The UI translates the codes instead. */
export const SIGNUP_ERROR_MESSAGES: Record<SignupErrorCode, string> = {
  nameRequired: "Please enter your full name.",
  nameTooShort: `Name must be at least ${NAME_MIN_LENGTH} characters.`,
  nameTooLong: `Name must be at most ${NAME_MAX_LENGTH} characters.`,
  emailRequired: "Please enter your email address.",
  emailInvalid: "Please enter a valid email address.",
  emailTaken: "An account with this email already exists.",
  passwordRequired: "Please choose a password.",
  passwordTooShort: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
  passwordTooLong: `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`,
  passwordNeedsLetter: "Password must include at least one letter.",
  passwordNeedsNumber: "Password must include at least one number.",
  confirmRequired: "Please confirm your password.",
  confirmMismatch: "Passwords do not match.",
  termsRequired: "You must accept the Terms of Service and Privacy Policy.",
  roleInvalid: "Please choose a valid account type.",
  companyRequired: "Company name is required for supplier accounts.",
  companyTooLong: `Company name must be at most ${COMPANY_MAX_LENGTH} characters.`,
};

// Pragmatic RFC-5322-lite check: something@something.tld, no whitespace.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isValidEmail(value: string): boolean {
  return value.length <= 254 && EMAIL_RE.test(value);
}

export function normalizeSignupRole(value: unknown): SignupRole | null {
  if (value === undefined || value === null || value === "") return "buyer";
  if (value === "buyer" || value === "supplier") return value;
  return null;
}

export type PasswordChecks = {
  minLength: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
};

/** Requirement checklist rendered live under the password field. */
export function getPasswordChecks(password: string): PasswordChecks {
  return {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    hasLetter: /\p{L}/u.test(password),
    hasNumber: /\d/.test(password),
  };
}

export type PasswordStrength = "empty" | "weak" | "fair" | "good" | "strong";

/**
 * Heuristic 0–4 strength score for the meter. Meets-all-requirements is the
 * floor for "fair"; length and character variety push it up from there.
 */
export function getPasswordStrength(password: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: PasswordStrength;
} {
  if (!password) return { score: 0, label: "empty" };
  const checks = getPasswordChecks(password);
  const meetsAll = checks.minLength && checks.hasLetter && checks.hasNumber;
  if (!meetsAll) return { score: 1, label: "weak" };

  let variety = 0;
  if (/[a-z]/.test(password)) variety += 1;
  if (/[A-Z]/.test(password)) variety += 1;
  if (/\d/.test(password)) variety += 1;
  if (/[^\p{L}\d]/u.test(password)) variety += 1;

  if (password.length >= 14 && variety >= 3) return { score: 4, label: "strong" };
  if (password.length >= 10 && variety >= 3) return { score: 3, label: "good" };
  if (password.length >= 12) return { score: 3, label: "good" };
  return { score: 2, label: "fair" };
}

/** Returns the first failing rule for a password, or null when it passes. */
export function validatePassword(password: unknown): SignupErrorCode | null {
  if (typeof password !== "string" || password.length === 0) {
    return "passwordRequired";
  }
  const checks = getPasswordChecks(password);
  if (!checks.minLength) return "passwordTooShort";
  if (password.length > PASSWORD_MAX_LENGTH) return "passwordTooLong";
  if (!checks.hasLetter) return "passwordNeedsLetter";
  if (!checks.hasNumber) return "passwordNeedsNumber";
  return null;
}

export type ValidateSignupOptions = {
  /** Require `confirmPassword` to be present and match. Default: true. */
  requireConfirm?: boolean;
  /** Require `acceptTerms === true`. Default: true. */
  requireTerms?: boolean;
};

export function validateSignup(
  input: SignupInput,
  options: ValidateSignupOptions = {},
): SignupValidationResult {
  const { requireConfirm = true, requireTerms = true } = options;
  const errors: SignupFieldErrors = {};

  const name = typeof input.name === "string" ? input.name.trim().replace(/\s+/g, " ") : "";
  if (!name) errors.name = "nameRequired";
  else if (name.length < NAME_MIN_LENGTH) errors.name = "nameTooShort";
  else if (name.length > NAME_MAX_LENGTH) errors.name = "nameTooLong";

  const email = normalizeEmail(input.email);
  if (!email) errors.email = "emailRequired";
  else if (!isValidEmail(email)) errors.email = "emailInvalid";

  const password = typeof input.password === "string" ? input.password : "";
  const passwordError = validatePassword(password);
  if (passwordError) errors.password = passwordError;

  if (requireConfirm) {
    const confirm = typeof input.confirmPassword === "string" ? input.confirmPassword : "";
    if (!confirm) errors.confirmPassword = "confirmRequired";
    else if (confirm !== password) errors.confirmPassword = "confirmMismatch";
  }

  if (requireTerms && input.acceptTerms !== true) {
    errors.acceptTerms = "termsRequired";
  }

  const role = normalizeSignupRole(input.role);
  if (!role) errors.role = "roleInvalid";

  const company = typeof input.company === "string" ? input.company.trim() : "";
  if (role === "supplier" && !company) errors.company = "companyRequired";
  else if (company.length > COMPANY_MAX_LENGTH) errors.company = "companyTooLong";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      name,
      email,
      password,
      role: role as SignupRole,
      company: company || null,
    },
  };
}

/** Split a display name into first/last for the account profile. */
export function splitName(name: string): { firstName: string | null; lastName: string | null } {
  const [first, ...rest] = name.trim().split(/\s+/);
  return { firstName: first || null, lastName: rest.join(" ") || null };
}
