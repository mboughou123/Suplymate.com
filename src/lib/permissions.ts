// Centralized entitlements + team-permission service.
//
// Plan checks and team-role checks live HERE so they are not scattered across
// routes. Server code calls these helpers; the browser is never trusted.

import { PLAN_LIMITS, normalizePlanId, type PlanId } from "@/lib/billing";
import { hasFullAccessEmail } from "@/lib/full-access";

export type TeamRole =
  | "OWNER"
  | "ADMIN"
  | "PROCUREMENT_MANAGER"
  | "BUYER"
  | "VIEWER";

export const TEAM_ROLES: TeamRole[] = [
  "OWNER",
  "ADMIN",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "VIEWER",
];

// What a role is allowed to do within a team. Server-enforced.
export type TeamCapability =
  | "team.manage" // rename team, manage billing
  | "team.members.manage" // invite/remove/change roles
  | "rfq.create"
  | "rfq.manage"
  | "quote.accept"
  | "view";

const ROLE_CAPS: Record<TeamRole, TeamCapability[]> = {
  OWNER: [
    "team.manage",
    "team.members.manage",
    "rfq.create",
    "rfq.manage",
    "quote.accept",
    "view",
  ],
  ADMIN: [
    "team.members.manage",
    "rfq.create",
    "rfq.manage",
    "quote.accept",
    "view",
  ],
  PROCUREMENT_MANAGER: ["rfq.create", "rfq.manage", "quote.accept", "view"],
  BUYER: ["rfq.create", "view"],
  VIEWER: ["view"],
};

export function roleCan(role: TeamRole | string | null | undefined, cap: TeamCapability): boolean {
  const caps = ROLE_CAPS[(role as TeamRole) ?? "VIEWER"];
  return caps ? caps.includes(cap) : false;
}

// ----- Plan entitlements -----

export type Entitlements = {
  plan: PlanId;
  /** True for the platform owner accounts: every lock and limit is lifted. */
  fullAccess: boolean;
  savedSuppliersLimit: number | null; // null = unlimited
  /** Suppliers a viewer can open per directory category; the rest are locked. */
  suppliersPerCategory: number | null;
  productsPerCategory: number | null;
  aiQuestionsPerMonth: number | null;
  /** Months of price-chart history; null = everything we have. */
  priceHistoryMonths: number | null;
  priceAlerts: boolean;
  watchlists: boolean;
  teamSeats: number; // 1 = solo
  rfqManagement: boolean;
  prioritizedAi: boolean;
  exportReporting: boolean;
  /** Supplier phone / email / website and call / email actions. Free stays on Suplymate messaging. */
  directSupplierContact: boolean;
};

function limits(plan: PlanId) {
  const l = PLAN_LIMITS[plan];
  return {
    savedSuppliersLimit: l.savedSuppliers,
    suppliersPerCategory: l.suppliersPerCategory,
    productsPerCategory: l.productsPerCategory,
    aiQuestionsPerMonth: l.aiQuestionsPerMonth,
    priceHistoryMonths: l.priceHistoryMonths,
  };
}

const ENTITLEMENTS: Record<PlanId, Entitlements> = {
  free: {
    plan: "free",
    fullAccess: false,
    ...limits("free"),
    priceAlerts: false,
    watchlists: true,
    teamSeats: 1,
    rfqManagement: true, // RFQs are core to the marketplace, available to all
    prioritizedAi: false,
    exportReporting: false,
    directSupplierContact: false,
  },
  basic: {
    plan: "basic",
    fullAccess: false,
    ...limits("basic"),
    priceAlerts: true,
    watchlists: true,
    teamSeats: 1,
    rfqManagement: true,
    prioritizedAi: true,
    exportReporting: false,
    directSupplierContact: true,
  },
  premium: {
    plan: "premium",
    fullAccess: false,
    ...limits("premium"),
    priceAlerts: true,
    watchlists: true,
    teamSeats: 10,
    rfqManagement: true,
    prioritizedAi: true,
    exportReporting: true,
    directSupplierContact: true,
  },
  enterprise: {
    plan: "enterprise",
    fullAccess: false,
    ...limits("enterprise"),
    priceAlerts: true,
    watchlists: true,
    teamSeats: 100,
    rfqManagement: true,
    prioritizedAi: true,
    exportReporting: true,
    directSupplierContact: true,
  },
};

const FULL_ACCESS: Entitlements = { ...ENTITLEMENTS.enterprise, fullAccess: true, teamSeats: 1000 };

export type EntitlementSubject = { plan?: string | null; email?: string | null } | null | undefined;

/**
 * Entitlements for a viewer. Pass the user's email so owner accounts get full
 * access regardless of the plan stored on their row.
 */
export function entitlementsFor(subject: EntitlementSubject | string): Entitlements {
  const viewer = typeof subject === "string" ? { plan: subject } : subject;
  if (hasFullAccessEmail(viewer?.email)) return FULL_ACCESS;
  const p = normalizePlanId(viewer?.plan);
  return ENTITLEMENTS[p] ?? ENTITLEMENTS.free;
}
