import { describe, expect, it } from "vitest";
import {
  getPasswordChecks,
  getPasswordStrength,
  isValidEmail,
  normalizeEmail,
  normalizeSignupRole,
  SIGNUP_ERROR_MESSAGES,
  splitName,
  validatePassword,
  validateSignup,
} from "@/lib/validation/signup";

const valid = {
  name: "Ada Lovelace",
  email: "Ada@Example.com",
  password: "engine1842",
  confirmPassword: "engine1842",
  acceptTerms: true,
  role: "buyer",
  company: "",
};

describe("validateSignup", () => {
  it("accepts a standard buyer sign-up and normalizes fields", () => {
    const result = validateSignup({ ...valid, name: "  Ada   Lovelace " });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "engine1842",
      role: "buyer",
      company: null,
    });
  });

  it("requires a name between 2 and 80 characters", () => {
    expect(validateSignup({ ...valid, name: "" })).toMatchObject({
      ok: false,
      errors: { name: "nameRequired" },
    });
    expect(validateSignup({ ...valid, name: "A" })).toMatchObject({
      ok: false,
      errors: { name: "nameTooShort" },
    });
    expect(validateSignup({ ...valid, name: "x".repeat(81) })).toMatchObject({
      ok: false,
      errors: { name: "nameTooLong" },
    });
    expect(validateSignup({ ...valid, name: 42 })).toMatchObject({
      ok: false,
      errors: { name: "nameRequired" },
    });
  });

  it("requires a valid, normalized email", () => {
    expect(validateSignup({ ...valid, email: "   " })).toMatchObject({
      ok: false,
      errors: { email: "emailRequired" },
    });
    expect(validateSignup({ ...valid, email: "not-an-email" })).toMatchObject({
      ok: false,
      errors: { email: "emailInvalid" },
    });
    expect(validateSignup({ ...valid, email: "a@b" })).toMatchObject({
      ok: false,
      errors: { email: "emailInvalid" },
    });
  });

  it("enforces password rules: min 8 chars, a letter and a number", () => {
    expect(validateSignup({ ...valid, password: "", confirmPassword: "" })).toMatchObject({
      ok: false,
      errors: { password: "passwordRequired", confirmPassword: "confirmRequired" },
    });
    expect(
      validateSignup({ ...valid, password: "abc1", confirmPassword: "abc1" }),
    ).toMatchObject({ ok: false, errors: { password: "passwordTooShort" } });
    expect(
      validateSignup({ ...valid, password: "12345678", confirmPassword: "12345678" }),
    ).toMatchObject({ ok: false, errors: { password: "passwordNeedsLetter" } });
    expect(
      validateSignup({ ...valid, password: "abcdefgh", confirmPassword: "abcdefgh" }),
    ).toMatchObject({ ok: false, errors: { password: "passwordNeedsNumber" } });
    // Lowercase-only + digit is fine — no forced uppercase/symbol.
    expect(
      validateSignup({ ...valid, password: "password1", confirmPassword: "password1" }).ok,
    ).toBe(true);
  });

  it("requires the confirmation to match", () => {
    expect(validateSignup({ ...valid, confirmPassword: "engine1843" })).toMatchObject({
      ok: false,
      errors: { confirmPassword: "confirmMismatch" },
    });
    expect(validateSignup({ ...valid, confirmPassword: undefined })).toMatchObject({
      ok: false,
      errors: { confirmPassword: "confirmRequired" },
    });
    expect(
      validateSignup({ ...valid, confirmPassword: undefined }, { requireConfirm: false }).ok,
    ).toBe(true);
  });

  it("requires accepting the terms (strict boolean true)", () => {
    expect(validateSignup({ ...valid, acceptTerms: false })).toMatchObject({
      ok: false,
      errors: { acceptTerms: "termsRequired" },
    });
    expect(validateSignup({ ...valid, acceptTerms: "true" })).toMatchObject({
      ok: false,
      errors: { acceptTerms: "termsRequired" },
    });
    expect(validateSignup({ ...valid, acceptTerms: undefined }, { requireTerms: false }).ok).toBe(
      true,
    );
  });

  it("validates roles and never allows admin", () => {
    expect(validateSignup({ ...valid, role: undefined }).ok).toBe(true);
    expect(validateSignup({ ...valid, role: "admin" })).toMatchObject({
      ok: false,
      errors: { role: "roleInvalid" },
    });
    expect(validateSignup({ ...valid, role: "wizard" })).toMatchObject({
      ok: false,
      errors: { role: "roleInvalid" },
    });
  });

  it("requires a company for supplier accounts only", () => {
    expect(validateSignup({ ...valid, role: "supplier", company: "  " })).toMatchObject({
      ok: false,
      errors: { company: "companyRequired" },
    });
    const ok = validateSignup({ ...valid, role: "supplier", company: " Acme Steel " });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.data.company).toBe("Acme Steel");
    expect(validateSignup({ ...valid, company: "x".repeat(121) })).toMatchObject({
      ok: false,
      errors: { company: "companyTooLong" },
    });
  });

  it("collects errors for every failing field at once", () => {
    const result = validateSignup({});
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(
      ["acceptTerms", "confirmPassword", "email", "name", "password"].sort(),
    );
  });

  it("has an English message for every error code", () => {
    const result = validateSignup({ role: "admin", company: "x".repeat(200) });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    for (const code of Object.values(result.errors)) {
      expect(SIGNUP_ERROR_MESSAGES[code]).toBeTruthy();
    }
    expect(SIGNUP_ERROR_MESSAGES.emailTaken).toMatch(/already exists/);
  });
});

describe("password helpers", () => {
  it("reports the live checklist", () => {
    expect(getPasswordChecks("")).toEqual({ minLength: false, hasLetter: false, hasNumber: false });
    expect(getPasswordChecks("abc12345")).toEqual({
      minLength: true,
      hasLetter: true,
      hasNumber: true,
    });
    expect(getPasswordChecks("çava1234").hasLetter).toBe(true);
  });

  it("returns the first failing rule", () => {
    expect(validatePassword(undefined)).toBe("passwordRequired");
    expect(validatePassword("short1")).toBe("passwordTooShort");
    expect(validatePassword("a".repeat(129) + "1")).toBe("passwordTooLong");
    expect(validatePassword("abcdefgh1")).toBeNull();
  });

  it("scores strength monotonically", () => {
    expect(getPasswordStrength("")).toEqual({ score: 0, label: "empty" });
    expect(getPasswordStrength("abc").label).toBe("weak");
    expect(getPasswordStrength("abcdefg1").label).toBe("fair");
    expect(getPasswordStrength("Abcdefgh12").label).toBe("good");
    expect(getPasswordStrength("Abcdefgh12345!").label).toBe("strong");
  });
});

describe("misc helpers", () => {
  it("normalizes emails", () => {
    expect(normalizeEmail("  Foo@Bar.COM ")).toBe("foo@bar.com");
    expect(normalizeEmail(null)).toBe("");
    expect(isValidEmail("foo@bar.com")).toBe(true);
    expect(isValidEmail("foo bar@bar.com")).toBe(false);
  });

  it("normalizes roles", () => {
    expect(normalizeSignupRole(undefined)).toBe("buyer");
    expect(normalizeSignupRole("supplier")).toBe("supplier");
    expect(normalizeSignupRole("admin")).toBeNull();
  });

  it("splits names", () => {
    expect(splitName("Ada")).toEqual({ firstName: "Ada", lastName: null });
    expect(splitName("Ada  King Lovelace")).toEqual({
      firstName: "Ada",
      lastName: "King Lovelace",
    });
  });
});
