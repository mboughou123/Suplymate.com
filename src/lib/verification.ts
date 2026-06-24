// Supplier marketplace verification lifecycle.
//
// HONESTY CONTRACT: "VERIFIED" is set ONLY by manual admin action. Everything
// else is an honest description of where the listing stands. Directory rows
// compiled from public sources are "LISTED" — visible, but NOT independently
// verified.

export const MARKETPLACE_STATUSES = [
  "UNLISTED",
  "LISTED",
  "CLAIMED",
  "PENDING_REVIEW",
  "NEEDS_INFORMATION",
  "REVIEWED",
  "VERIFIED",
  "REJECTED",
  "SUSPENDED",
] as const;

export type MarketplaceStatus = (typeof MARKETPLACE_STATUSES)[number];

export function normalizeMarketplaceStatus(value: string | null | undefined): MarketplaceStatus {
  const v = (value ?? "").toUpperCase();
  return (MARKETPLACE_STATUSES as readonly string[]).includes(v)
    ? (v as MarketplaceStatus)
    : "LISTED";
}

// Public-facing label + honest description for each status.
export const STATUS_META: Record<
  MarketplaceStatus,
  { label: string; tone: "neutral" | "info" | "warn" | "success" | "danger"; description: string }
> = {
  UNLISTED: {
    label: "Unlisted",
    tone: "neutral",
    description: "This profile is not publicly listed.",
  },
  LISTED: {
    label: "Listed",
    tone: "neutral",
    description:
      "Compiled from public sources. Not independently verified by Suplymate.",
  },
  CLAIMED: {
    label: "Claimed",
    tone: "info",
    description:
      "A representative has claimed this profile. Not independently verified.",
  },
  PENDING_REVIEW: {
    label: "Pending review",
    tone: "info",
    description: "Submitted for Suplymate review. Verification is in progress.",
  },
  NEEDS_INFORMATION: {
    label: "Needs information",
    tone: "warn",
    description: "Additional information is required before review can continue.",
  },
  REVIEWED: {
    label: "Reviewed",
    tone: "info",
    description:
      "Reviewed by Suplymate. Not yet granted Verified status.",
  },
  VERIFIED: {
    label: "Verified",
    tone: "success",
    description:
      "Passed Suplymate's manual verification. This is not a warranty of performance — do your own due diligence.",
  },
  REJECTED: {
    label: "Rejected",
    tone: "danger",
    description: "This profile did not pass review.",
  },
  SUSPENDED: {
    label: "Suspended",
    tone: "danger",
    description: "This profile is temporarily suspended.",
  },
};

// A supplier is publicly reachable unless explicitly hidden by moderation.
export function isMarketplaceVisible(status: string | null | undefined): boolean {
  const s = normalizeMarketplaceStatus(status);
  return s !== "REJECTED" && s !== "SUSPENDED" && s !== "UNLISTED";
}

// Only VERIFIED earns the trust badge. The legacy boolean `verified` is honored
// for backward-compatibility with already-approved imports.
export function isVerified(opts: {
  marketplaceStatus?: string | null;
  verified?: boolean | null;
  verificationStatus?: string | null;
}): boolean {
  if (normalizeMarketplaceStatus(opts.marketplaceStatus) === "VERIFIED") return true;
  if (opts.verified === true) return true;
  if ((opts.verificationStatus ?? "").toLowerCase() === "verified") return true;
  return false;
}
