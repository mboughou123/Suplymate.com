"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Action = { label: string; status: string; tone?: "primary" | "danger" | "muted" };

// Generic PATCH-status action row for admin moderation queues (reviews, reports).
export default function ModerationActions({
  endpoint,
  actions,
}: {
  endpoint: string;
  actions: Action[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const act = async (status: string) => {
    setBusy(true);
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => (
        <button
          key={a.status}
          type="button"
          disabled={busy}
          onClick={() => act(a.status)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${
            a.tone === "danger"
              ? "border border-slate-200 text-ink-muted hover:bg-red-50 hover:text-red-600"
              : a.tone === "muted"
                ? "border border-slate-200 text-ink-muted hover:bg-slate-50"
                : "bg-cyan text-white hover:bg-cyan/90"
          }`}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}
