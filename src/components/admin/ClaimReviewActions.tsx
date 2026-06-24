"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ClaimReviewActions({ claimId }: { claimId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const act = async (status: "APPROVED" | "REJECTED" | "NEEDS_INFORMATION") => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/supplier-claims/${claimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNote: note }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note to claimant (optional)"
        className="min-w-48 flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
      />
      <button type="button" disabled={busy} onClick={() => act("APPROVED")} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
        Approve
      </button>
      <button type="button" disabled={busy} onClick={() => act("NEEDS_INFORMATION")} className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-60">
        Needs info
      </button>
      <button type="button" disabled={busy} onClick={() => act("REJECTED")} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-ink-muted hover:bg-slate-50 disabled:opacity-60">
        Reject
      </button>
    </div>
  );
}
