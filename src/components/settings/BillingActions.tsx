"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";

// Checkout / manage-billing actions. The browser only *initiates* billing —
// plan changes are applied by the Stripe webhook (source of truth).

export function ManageBillingButton({
  configured,
  label = "Manage subscription",
}: {
  configured: boolean;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const go = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) window.location.href = data.url;
      else setError(data.error || "Unable to open the billing portal.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  if (!configured) {
    return (
      <button
        type="button"
        disabled
        title="Billing not available yet"
        className="cursor-not-allowed rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/50"
      >
        {label}
      </button>
    );
  }
  return (
    <div className="text-right">
      <button
        type="button"
        onClick={go}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {label}
      </button>
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
    </div>
  );
}

type Labels = { current: string; trial: string; upgrade: string; sales: string };

export function UpgradeButton({
  plan,
  cta,
  current,
  configured,
  labels,
}: {
  plan: string;
  cta: "free" | "trial" | "sales";
  current: boolean;
  configured: boolean;
  labels: Labels;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const go = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) window.location.href = data.url;
      else setError(data.error || "Unable to start checkout.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const disabledClass =
    "mt-5 w-full cursor-default rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-ink-dim";

  if (current) {
    return (
      <button type="button" disabled className={disabledClass}>
        {labels.current}
      </button>
    );
  }
  if (cta === "sales") {
    return (
      <Link href="/contact" className="btn-secondary mt-5 w-full">
        {labels.sales}
      </Link>
    );
  }
  if (cta === "free") {
    return (
      <button type="button" disabled className={disabledClass}>
        {labels.current}
      </button>
    );
  }
  if (!configured) {
    return (
      <button type="button" disabled title="Billing not available yet" className={`${disabledClass} cursor-not-allowed`}>
        {labels.trial}
      </button>
    );
  }
  return (
    <div className="mt-5">
      <button type="button" onClick={go} disabled={busy} className="btn-accent w-full disabled:opacity-60">
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {labels.trial}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
