"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { entitlementsFor } from "@/lib/permissions";
import { toPublicEntitlements, type PublicEntitlements } from "@/lib/plan-gating";

const GUEST: PublicEntitlements = toPublicEntitlements(entitlementsFor(null), false);

const cache = new Map<string, Promise<PublicEntitlements>>();

function load(viewerKey: string): Promise<PublicEntitlements> {
  const hit = cache.get(viewerKey);
  if (hit) return hit;
  const promise = fetch("/api/account/entitlements", { cache: "no-store" })
    .then((r) => (r.ok ? (r.json() as Promise<PublicEntitlements>) : GUEST))
    .catch(() => GUEST);
  cache.set(viewerKey, promise);
  return promise;
}

/** The viewer's plan limits; null while a signed-in viewer's plan is loading. */
export function useViewerEntitlements(): PublicEntitlements | null {
  const { data, status } = useSession();
  const viewerKey = status === "authenticated" ? (data?.user?.id ?? "user") : "guest";
  const [state, setState] = useState<{ key: string; value: PublicEntitlements } | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    let alive = true;
    load(viewerKey).then((value) => {
      if (alive) setState({ key: viewerKey, value });
    });
    return () => {
      alive = false;
    };
  }, [status, viewerKey]);

  if (status === "unauthenticated") return GUEST;
  if (status === "loading") return null;
  return state?.key === viewerKey ? state.value : null;
}
