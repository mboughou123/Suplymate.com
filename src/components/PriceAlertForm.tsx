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
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState<{ contact: string; reached: boolean } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!session) {
      setError("Sign in to save price alerts to your account.");
      return;
    }

    const contact = notifyType === "Email" ? email || session.user?.email || "" : phone;

    setLoading(true);
    const res = await fetch("/api/price-alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        materialId: material,
        targetPrice: Number(targetPrice),
        notifyType,
        contact,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; reached?: boolean };
    setLoading(false);

    if (res.status === 401) {
      setError("Please sign in to create alerts.");
      return;
    }
    if (!res.ok) {
      setError(data.error ?? "Could not create alert. Try again.");
      return;
    }

    setSubmitted({ contact, reached: Boolean(data.reached) });
  }

  if (submitted) {
    const materialName = materials.find((m) => m.id === material)?.name;
    const channel = notifyType === "SMS" ? "a text message" : "an email";
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-lg font-semibold text-emerald-800">Alert saved</p>
        <p className="mt-2 text-sm text-emerald-700">
          {submitted.reached
            ? `${materialName} is already at your target — we just sent ${channel} to ${submitted.contact}.`
            : `We sent ${channel} to ${submitted.contact} to confirm. You'll get another when ${materialName} reaches your target.`}
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block text-sm font-medium text-emerald-800 underline"
        >
          View dashboard
        </Link>
        <button
          type="button"
          onClick={() => setSubmitted(null)}
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

        {notifyType === "Email" ? (
          <div>
            <label htmlFor="alert-email" className="text-xs font-medium text-ink-muted">
              Email
            </label>
            <input
              id="alert-email"
              type="email"
              autoComplete="email"
              required={!session?.user?.email}
              placeholder={session?.user?.email ?? "you@company.com"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-mustard focus:outline-none focus:ring-2 focus:ring-mustard/20"
            />
          </div>
        ) : (
          <div>
            <label htmlFor="alert-phone" className="text-xs font-medium text-ink-muted">
              Mobile number
            </label>
            <input
              id="alert-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              placeholder="+212 6 12 34 56 78"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-mustard focus:outline-none focus:ring-2 focus:ring-mustard/20"
            />
            <p className="mt-1 text-xs text-ink-muted">Include the country code.</p>
          </div>
        )}

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
