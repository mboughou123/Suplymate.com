// Centralized entitlements + team-permission service.
//
// Plan checks and team-role checks live HERE so they are not scattered across
// routes. Server code calls these helpers; the browser is never trusted.
//
// Source of truth: Amine Boughou plan entitlements (18 Sep 2026).

import { normalizePlanId, type PlanId } from "@/lib/billing";

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

/** Free catalogue: 10 products and 10 suppliers. Everything else locked. */
export const FREE_CATALOGUE_PRODUCTS = 10;
export const FREE_CATALOGUE_SUPPLIERS = 10;

/**
 * Signed-out Mate allowance already in code (`/api/ai` guest limit). Demo path
 * only — no OpenAI / paid API credit.
 */
export const FREE_AI_RUNS = 3;

/**
 * Basic Mate cap. No Basic-specific cap existed in code (signed-in users only
 * had a 20/min abuse limit), so the spec's starting cap of 1 run applies.
 */
export const BASIC_AI_RUNS = 1;

/** Premium is 10× Basic usage for metered Mate runs. */
export const PREMIUM_AI_RUNS = BASIC_AI_RUNS * 10;

/** Rolling window for Mate run quotas. */
export const AI_USAGE_WINDOW_MS = 30 * 24 * 60 * 60_000;

export type AiMode = "demo" | "live";

export type Entitlements = {
  plan: PlanId;
  savedSuppliersLimit: number | null; // null = unlimited
  priceAlerts: boolean;
  watchlists: boolean;
  teamSeats: number; // 1 = solo
  rfqManagement: boolean;
  prioritizedAi: boolean;
  exportReporting: boolean;
  catalogueProductLimit: number | null;
  catalogueSupplierLimit: number | null;
  supplierMessaging: boolean;
  /** Max Mate runs in `AI_USAGE_WINDOW_MS`. null = unlimited (Enterprise). */
  aiRunsLimit: number | null;
  /** demo = sample mills, never spend OpenAI credit. live = real Mate. */
  aiMode: AiMode;
  materialsPriceTracking: boolean;
};

const ENTITLEMENTS: Record<PlanId, Entitlements> = {
  free: {
    plan: "free",
    savedSuppliersLimit: 3,
    priceAlerts: false,
    watchlists: true,
    teamSeats: 1,
    rfqManagement: false,
    prioritizedAi: false,
    exportReporting: false,
    catalogueProductLimit: FREE_CATALOGUE_PRODUCTS,
    catalogueSupplierLimit: FREE_CATALOGUE_SUPPLIERS,
    supplierMessaging: false,
    aiRunsLimit: FREE_AI_RUNS,
    aiMode: "demo",
    materialsPriceTracking: false,
  },
  basic: {
    plan: "basic",
    savedSuppliersLimit: null,
    priceAlerts: true,
    watchlists: true,
    teamSeats: 1,
    rfqManagement: true,
    prioritizedAi: false,
    exportReporting: false,
    catalogueProductLimit: null,
    catalogueSupplierLimit: null,
    supplierMessaging: true,
    aiRunsLimit: BASIC_AI_RUNS,
    aiMode: "demo",
    materialsPriceTracking: false,
  },
  premium: {
    plan: "premium",
    savedSuppliersLimit: null,
    priceAlerts: true,
    watchlists: true,
    teamSeats: 10,
    rfqManagement: true,
    prioritizedAi: true,
    exportReporting: true,
    catalogueProductLimit: null,
    catalogueSupplierLimit: null,
    supplierMessaging: true,
    aiRunsLimit: PREMIUM_AI_RUNS,
    aiMode: "live",
    materialsPriceTracking: true,
  },
  enterprise: {
    plan: "enterprise",
    savedSuppliersLimit: null,
    priceAlerts: true,
    watchlists: true,
    teamSeats: 100,
    rfqManagement: true,
    prioritizedAi: true,
    exportReporting: true,
    catalogueProductLimit: null,
    catalogueSupplierLimit: null,
    supplierMessaging: true,
    aiRunsLimit: null,
    aiMode: "live",
    materialsPriceTracking: true,
  },
};

export function entitlementsFor(plan: string | null | undefined): Entitlements {
  const p = normalizePlanId(plan);
  return ENTITLEMENTS[p] ?? ENTITLEMENTS.free;
}

/**
 * Trial users on Premium/Enterprise stay on demo Mate (no paid credit) until
 * they subscribe. Basic is always demo.
 */
export function resolveEntitlements(
  plan: string | null | undefined,
  planStatus: string | null | undefined,
): Entitlements {
  const ent = entitlementsFor(plan);
  if (ent.aiMode === "live" && planStatus === "trialing") {
    return { ...ent, aiMode: "demo" };
  }
  return ent;
}

export function usesLiveAi(ent: Entitlements): boolean {
  return ent.aiMode === "live";
}
