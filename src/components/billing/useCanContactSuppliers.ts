"use client";

import { useEffect, useState } from "react";

export function useCanContactSuppliers(): boolean {
  const [canContact, setCanContact] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/entitlements")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setCanContact(Boolean(data?.entitlements?.supplierMessaging));
      })
      .catch(() => {
        if (!cancelled) setCanContact(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return canContact;
}
