// Direct supplier contact (support phone + contact email), server side.
//
// Values come only from real collected data: what is stored on the supplier
// (DB / Outscraper Google Maps listing / owner-edited profile) first, then gaps
// filled from the supplier's own website (scripts/supplier-contacts). Nothing
// is generated. Direct contact is a paid entitlement: callers must check
// `canViewSupplierContact` and only ever send availability flags to everyone
// else — never the values.

import websiteContacts from "@/data/generated/supplier-contacts.json";
import { entitlementsFor } from "@/lib/permissions";
import { normalizeEmail, normalizePhone } from "@/lib/scraper/contactExtractor";

export type WebsiteContact = {
  phone?: string;
  phoneSourceUrl?: string;
  email?: string;
  emailSourceUrl?: string;
  collectedAt: string;
};

export type WebsiteContactFile = {
  generatedAt: string;
  method: string;
  suppliers: Record<string, WebsiteContact>;
};

/** "listing" = stored on the supplier record; "website" = supplier's own contact page. */
export type ContactSource = "listing" | "website";

export type SupplierContact = {
  phone: string | null;
  email: string | null;
  phoneSource: ContactSource | null;
  emailSource: ContactSource | null;
};

export type ContactView =
  | ({ access: "full" } & SupplierContact)
  | { access: "locked"; reason: "guest" | "plan"; hasPhone: boolean; hasEmail: boolean };

export type ContactViewer = { signedIn: boolean; plan: string | null | undefined };

type SupplierContactFields = { id: string; phone?: string | null; email?: string | null };

const bundled = websiteContacts as WebsiteContactFile;

export function resolveSupplierContact(
  supplier: SupplierContactFields,
  file: WebsiteContactFile = bundled,
): SupplierContact {
  const scraped = file.suppliers[supplier.id];
  const listingPhone = normalizePhone(supplier.phone);
  const listingEmail = normalizeEmail(supplier.email);
  const websitePhone = normalizePhone(scraped?.phone);
  const websiteEmail = normalizeEmail(scraped?.email);
  return {
    phone: listingPhone ?? websitePhone,
    email: listingEmail ?? websiteEmail,
    phoneSource: listingPhone ? "listing" : websitePhone ? "website" : null,
    emailSource: listingEmail ? "listing" : websiteEmail ? "website" : null,
  };
}

export function canViewSupplierContact(viewer: ContactViewer): boolean {
  return viewer.signedIn && entitlementsFor(viewer.plan).directSupplierContact;
}

export function contactViewFor(supplier: SupplierContactFields, viewer: ContactViewer): ContactView {
  const contact = resolveSupplierContact(supplier);
  if (canViewSupplierContact(viewer)) return { access: "full", ...contact };
  return {
    access: "locked",
    reason: viewer.signedIn ? "plan" : "guest",
    hasPhone: contact.phone !== null,
    hasEmail: contact.email !== null,
  };
}

export type ContactCoverage = { total: number; phone: number; email: number; both: number; either: number };

export function contactCoverage(suppliers: SupplierContactFields[]): ContactCoverage {
  const resolved = suppliers.map((s) => resolveSupplierContact(s));
  return {
    total: suppliers.length,
    phone: resolved.filter((c) => c.phone).length,
    email: resolved.filter((c) => c.email).length,
    both: resolved.filter((c) => c.phone && c.email).length,
    either: resolved.filter((c) => c.phone || c.email).length,
  };
}
