"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MARKETPLACE_STATUSES } from "@/lib/verification";

export default function SupplierStatusControl({
  supplierId,
  current,
}: {
  supplierId: string;
  current: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(current);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setBusy(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/suppliers/${supplierId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketplaceStatus: status }),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
      >
        {MARKETPLACE_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={save}
        disabled={busy || status === current}
        className="rounded-lg bg-cyan px-3 py-1 text-xs font-semibold text-white hover:bg-cyan/90 disabled:opacity-50"
      >
        {busy ? "…" : saved ? "Saved" : "Set"}
      </button>
    </div>
  );
}
