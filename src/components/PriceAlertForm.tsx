"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import type { Material } from "@/data/materials";

type PriceAlertFormProps = {
  materials: Material[];
};

export default function PriceAlertForm({ materials }: PriceAlertFormProps) {
  const { data: session } = useSession();
  const [material, setMaterial] = useState(materials[0]?.id ?? "");
  const [targetPrice, setTargetPrice] = useState("");
  const [notifyType, setNotifyType] = useState<"Email" | "SMS">("Email");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!session) {
      setError("Sign in to save price alerts to your account.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/price-alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        materialId: material,
        targetPrice: Number(targetPrice),
        notifyType,
      }),
    });
    setLoading(false);

    if (res.status === 401) {
      setError("Please sign in to create alerts.");
      return;
    }
    if (!res.ok) {
      setError("Could not create alert. Try again.");
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-lg font-semibold text-emerald-800">Alert saved</p>
        <p className="mt-2 text-sm text-emerald-700">
          We&apos;ll notify you via {notifyType.toLowerCase()} when {materials.find((m) => m.id === material)?.name} reaches your target (stored in database).
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block text-sm font-medium text-emerald-800 underline"
        >
          View dashboard
        </Link>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-2 block w-full text-sm text-emerald-700"
        >
          Create another alert
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-card"
    >
      <h3 className="text-lg font-semibold text-ink">Price alert</h3>
      <p className="mt-1 text-sm text-ink-dim">
        {session
          ? "Saved to your account when created."
          : "Sign in to save alerts to your account."}
      </p>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}{" "}
          {!session && (
            <Link href="/login" className="font-semibold underline">
              Sign in
            </Link>
          )}
        </p>
      )}

      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor="alert-material" className="text-xs font-medium text-ink-muted">
            Material
          </label>
          <select
            id="alert-material"
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-mustard focus:outline-none focus:ring-2 focus:ring-mustard/20"
          >
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="target-price" className="text-xs font-medium text-ink-muted">
            Target price
          </label>
          <input
            id="target-price"
            type="number"
            step="any"
            required
            placeholder="e.g. 600"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-mustard focus:outline-none focus:ring-2 focus:ring-mustard/20"
          />
        </div>

        <div>
          <span className="text-xs font-medium text-ink-muted">Notification</span>
          <div className="mt-2 flex gap-3">
            {(["Email", "SMS"] as const).map((type) => (
              <label
                key={type}
                className={`flex flex-1 cursor-pointer items-center justify-center rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                  notifyType === type
                    ? "border-navy bg-navy text-white"
                    : "border-slate-200 text-ink-muted hover:border-navy/30"
                }`}
              >
                <input
                  type="radio"
                  name="notify"
                  value={type}
                  checked={notifyType === type}
                  onChange={() => setNotifyType(type)}
                  className="sr-only"
                />
                {type}
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-mustard py-3 text-sm font-semibold text-ink transition hover:bg-mustard-light disabled:opacity-60"
        >
          {loading ? "Saving…" : "Create alert"}
        </button>
      </div>
    </form>
  );
}
