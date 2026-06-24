"use client";

import { useState } from "react";

// Checkout / manage-billing actions. The browser only *initiates* billing —
// plan changes are applied by the Stripe webhook (source of truth).
export function ManageBillingButton({ configured }: { configured: boolean }) {
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.url) window.location.href = data.url;
      else alert(data.error || "Unable to open billing portal.");
    } finally {
      setBusy(false);
    }
  };
  if (!configured) {
    return (
      <button type="button" disabled title="Coming soon" className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-ink-dim">
        Manage billing
      </button>
    );
  }
  return (
    <button type="button" onClick={go} disabled={busy} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-slate-50 disabled:opacity-60">
      {busy ? "Opening…" : "Manage billing"}
    </button>
  );
}

export function UpgradeButton({
  plan,
  current,
  configured,
}: {
  plan: string;
  current: boolean;
  configured: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (res.ok && data.url) window.location.href = data.url;
      else alert(data.error || "Unable to start checkout.");
    } finally {
      setBusy(false);
    }
  };

  if (current) {
    return (
      <button type="button" disabled className="mt-5 cursor-default rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-ink-dim">
        Your plan
      </button>
    );
  }
  if (plan === "free") {
    return (
      <button type="button" disabled className="mt-5 cursor-default rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-ink-dim">
        Free plan
      </button>
    );
  }
  if (!configured) {
    return (
      <button type="button" disabled title="Coming soon" className="mt-5 cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-ink-dim">
        Coming soon
      </button>
    );
  }
  return (
    <button type="button" onClick={go} disabled={busy} className="mt-5 rounded-xl bg-cyan px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan/90 disabled:opacity-60">
      {busy ? "Starting…" : "Upgrade"}
    </button>
  );
}
