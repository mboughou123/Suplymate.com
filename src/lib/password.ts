import { hash, compare } from "bcryptjs";
import {
  PASSWORD_MIN_LENGTH,
  SIGNUP_ERROR_MESSAGES,
  validatePassword,
} from "@/lib/validation/signup";

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return compare(password, passwordHash);
}

export { PASSWORD_MIN_LENGTH };

/**
 * Shared password policy used by sign-up and change-password. Delegates to the
 * sign-up validator so both flows enforce the same rule (>= 8 chars with at
 * least one letter and one number). Returns an English error string when
 * invalid, or null when the password meets requirements.
 */
export function validatePasswordStrength(password: string): string | null {
  const code = validatePassword(password);
  return code ? SIGNUP_ERROR_MESSAGES[code] : null;
}
