"use client";

import { useState } from "react";
import { Check, AlertCircle } from "lucide-react";
import {
  SUPPORTED_LANGUAGES,
  type UserPreferences,
} from "@/lib/preferences";

const TOGGLES: { key: keyof UserPreferences; label: string; desc: string }[] = [
  {
    key: "inAppNotifications",
    label: "In-app notifications",
    desc: "Show alerts in your notification center for RFQs, quotes, and messages.",
  },
  {
    key: "emailNotifications",
    label: "Email notifications",
    desc: "Receive important account and activity emails.",
  },
  {
    key: "priceAlerts",
    label: "Price alert emails",
    desc: "Get notified when tracked materials hit your targets.",
  },
  {
    key: "supplierMessages",
    label: "Supplier message notifications",
    desc: "Be alerted when a supplier replies to your conversations.",
  },
  {
    key: "productUpdates",
    label: "Product update emails",
    desc: "Occasional news about new Suplymate features.",
  },
];

export default function PreferencesForm({ initial }: { initial: UserPreferences }) {
  const [prefs, setPrefs] = useState<UserPreferences>(initial);
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function toggle(key: keyof UserPreferences) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
    setSuccess(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/account/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || "Could not save preferences.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card"
    >
      <h2 className="text-sm font-bold text-ink">Preferences</h2>
      <p className="mt-1 text-xs text-ink-muted">
        Choose what we notify you about and your language.
      </p>

      <div className="mt-5 divide-y divide-slate-100">
        {TOGGLES.map((t) => (
          <div key={t.key} className="flex items-center justify-between gap-4 py-3.5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">{t.label}</p>
              <p className="text-xs text-ink-muted">{t.desc}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(prefs[t.key])}
              onClick={() => toggle(t.key)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                prefs[t.key] ? "bg-gold" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                  prefs[t.key] ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-5 max-w-xs">
        <label htmlFor="language" className="text-xs font-medium text-ink-muted">
          Language
        </label>
        <select
          id="language"
          value={prefs.language}
          onChange={(e) => {
            setPrefs((p) => ({ ...p, language: e.target.value }));
            setSuccess(false);
          }}
          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-gold/50 focus:outline-none focus:ring-2 focus:ring-gold/15"
        >
          {SUPPORTED_LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
      {success && (
        <p className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <Check className="h-4 w-4 shrink-0" aria-hidden />
          Preferences saved.
        </p>
      )}

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-gold-light disabled:opacity-60"
        >
          {status === "saving" ? "Saving…" : "Save preferences"}
        </button>
      </div>
    </form>
  );
}
