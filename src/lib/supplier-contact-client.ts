"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { ContactView } from "@/lib/supplier-contact";

export type ContactState = ContactView | { access: "none" } | null;

// Cards that mount together (one directory page) share one request.
const MAX_BATCH = 48;
const cache = new Map<string, Promise<ContactState>>();
let queue: { id: string; viewerKey: string; resolve: (v: ContactState) => void }[] = [];
let scheduled = false;

async function flush() {
  scheduled = false;
  const batch = queue;
  queue = [];
  for (let i = 0; i < batch.length; i += MAX_BATCH) {
    const chunk = batch.slice(i, i + MAX_BATCH);
    const ids = [...new Set(chunk.map((c) => c.id))];
    let contacts: Record<string, ContactView> = {};
    try {
      const res = await fetch(`/api/supplier-contacts?ids=${encodeURIComponent(ids.join(","))}`, {
        cache: "no-store",
      });
      if (res.ok) contacts = ((await res.json()) as { contacts: Record<string, ContactView> }).contacts;
    } catch {
      // Network failure: fall through to the Suplymate messaging fallback.
    }
    for (const c of chunk) {
      const view = contacts[c.id];
      if (!view) cache.delete(`${c.viewerKey}:${c.id}`);
      c.resolve(view ?? { access: "none" });
    }
  }
}

export function loadSupplierContact(id: string, viewerKey: string): Promise<ContactState> {
  const key = `${viewerKey}:${id}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const promise = new Promise<ContactState>((resolve) => {
    queue.push({ id, viewerKey, resolve });
    if (!scheduled) {
      scheduled = true;
      setTimeout(flush, 0);
    }
  });
  cache.set(key, promise);
  return promise;
}

/** Phone / email for one supplier as the current viewer is allowed to see it (null while loading). */
export function useSupplierContact(supplierId: string): ContactState {
  const { data, status } = useSession();
  const viewerKey = status === "authenticated" ? (data?.user?.id ?? "user") : "guest";
  const [state, setState] = useState<{ key: string; value: ContactState }>({ key: "", value: null });
  const key = `${viewerKey}:${supplierId}`;

  useEffect(() => {
    if (status === "loading") return;
    let alive = true;
    loadSupplierContact(supplierId, viewerKey).then((value) => {
      if (alive) setState({ key, value });
    });
    return () => {
      alive = false;
    };
  }, [supplierId, viewerKey, status, key]);

  return state.key === key ? state.value : null;
}
