"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FlagExpiredButton({ count }: { count: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/data-quality/flag-expired", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setMsg(`Flagged ${data.flagged} certification(s)`);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={run}
        disabled={busy || count === 0}
        className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
      >
        {busy ? "Flagging…" : `Flag ${count} expired`}
      </button>
      {msg && <span className="text-xs text-emerald-700">{msg}</span>}
    </div>
  );
}
