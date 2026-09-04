// Account roles for the two-sided marketplace.
//
// "buyer"    — business owner / procurement user (default)
// "supplier" — manufacturer / distributor selling on Suplymate
// "admin"    — advisory only; real admin access is gated by ADMIN_EMAILS

export type AccountRole = "buyer" | "supplier" | "admin";

export const ROLE_OPTIONS: { id: Exclude<AccountRole, "admin">; }[] = [
  { id: "buyer" },
  { id: "supplier" },
];

export function normalizeRole(value: unknown): AccountRole {
  if (value === "supplier" || value === "admin") return value;
  return "buyer";
}

/** Where a signed-in user lands after authentication. */
export function homeForRole(role: unknown): "/dashboard" | "/supplier-dashboard" {
  return normalizeRole(role) === "supplier" ? "/supplier-dashboard" : "/dashboard";
}

export function isSupplierRole(role: unknown): boolean {
  return normalizeRole(role) === "supplier";
}
