// Centralized entitlements + team-permission service.
//
// Plan checks and team-role checks live HERE so they are not scattered across
// routes. Server code calls these helpers; the browser is never trusted.

import type { PlanId } from "@/lib/billing";

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
  | "cart.manage"
  | "view";

const ROLE_CAPS: Record<TeamRole, TeamCapability[]> = {
  OWNER: [
    "team.manage",
    "team.members.manage",
    "rfq.create",
    "rfq.manage",
    "quote.accept",
    "cart.manage",
    "view",
  ],
  ADMIN: [
    "team.members.manage",
    "rfq.create",
    "rfq.manage",
    "quote.accept",
    "cart.manage",
    "view",
  ],
  PROCUREMENT_MANAGER: ["rfq.create", "rfq.manage", "quote.accept", "cart.manage", "view"],
  BUYER: ["rfq.create", "cart.manage", "view"],
  VIEWER: ["view"],
};

export function roleCan(role: TeamRole | string | null | undefined, cap: TeamCapability): boolean {
  const caps = ROLE_CAPS[(role as TeamRole) ?? "VIEWER"];
  return caps ? caps.includes(cap) : false;
}

// ----- Plan entitlements -----

export type Entitlements = {
  plan: PlanId;
  savedSuppliersLimit: number | null; // null = unlimited
  priceAlerts: boolean;
  watchlists: boolean;
  teamSeats: number; // 1 = solo
  rfqManagement: boolean;
  prioritizedAi: boolean;
  exportReporting: boolean;
};

const ENTITLEMENTS: Record<PlanId, Entitlements> = {
  free: {
    plan: "free",
    savedSuppliersLimit: 3,
    priceAlerts: false,
    watchlists: true,
    teamSeats: 1,
    rfqManagement: true, // RFQs are core to the marketplace, available to all
    prioritizedAi: false,
    exportReporting: false,
  },
  starter: {
    plan: "starter",
    savedSuppliersLimit: null,
    priceAlerts: true,
    watchlists: true,
    teamSeats: 1,
    rfqManagement: true,
    prioritizedAi: true,
    exportReporting: false,
  },
  pro: {
    plan: "pro",
    savedSuppliersLimit: null,
    priceAlerts: true,
    watchlists: true,
    teamSeats: 10,
    rfqManagement: true,
    prioritizedAi: true,
    exportReporting: true,
  },
};

export function entitlementsFor(plan: string | null | undefined): Entitlements {
  const p = (plan as PlanId) ?? "free";
  return ENTITLEMENTS[p] ?? ENTITLEMENTS.free;
}
