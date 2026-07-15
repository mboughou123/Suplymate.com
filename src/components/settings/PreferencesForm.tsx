"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, AlertCircle } from "lucide-react";
import { locales, localeNames, type Locale } from "@/i18n/routing";
import { type UserPreferences } from "@/lib/preferences";

const TOGGLE_KEYS: {
  key: keyof UserPreferences;
  labelKey:
    | "inAppNotifications"
    | "emailNotifications"
    | "priceAlerts"
    | "supplierMessages"
    | "productUpdates";
  descKey:
    | "inAppNotificationsDesc"
    | "emailNotificationsDesc"
    | "priceAlertsDesc"
    | "supplierMessagesDesc"
    | "productUpdatesDesc";
}[] = [
  {
    key: "inAppNotifications",
    labelKey: "inAppNotifications",
    descKey: "inAppNotificationsDesc",
  },
  {
    key: "emailNotifications",
    labelKey: "emailNotifications",
    descKey: "emailNotificationsDesc",
  },
  {
    key: "priceAlerts",
    labelKey: "priceAlerts",
    descKey: "priceAlertsDesc",
  },
  {
    key: "supplierMessages",
    labelKey: "supplierMessages",
    descKey: "supplierMessagesDesc",
  },
  {
    key: "productUpdates",
    labelKey: "productUpdates",
    descKey: "productUpdatesDesc",
  },
];

export default function PreferencesForm({ initial }: { initial: UserPreferences }) {
  const t = useTranslations("settings");
  const tForms = useTranslations("forms");
  const tErrors = useTranslations("errors");
  const [prefs, setPrefs] = useState<UserPreferences>(initial);
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleToggle(key: keyof UserPreferences) {
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
        setError(data?.error || tErrors("savePreferencesFailed"));
        return;
      }
      setSuccess(true);
    } catch {
      setError(tErrors("network"));
    } finally {
      setStatus("idle");
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card"
    >
      <h2 className="text-sm font-bold text-ink">{t("preferences")}</h2>
      <p className="mt-1 text-xs text-ink-muted">{t("preferencesSubtitle")}</p>

      <div className="mt-5 divide-y divide-slate-100">
        {TOGGLE_KEYS.map((item) => (
          <div key={item.key} className="flex items-center justify-between gap-4 py-3.5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">{t(item.labelKey)}</p>
              <p className="text-xs text-ink-muted">{t(item.descKey)}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(prefs[item.key])}
              onClick={() => handleToggle(item.key)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                prefs[item.key] ? "bg-gold" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                  prefs[item.key] ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-5 max-w-xs">
        <label htmlFor="language" className="text-xs font-medium text-ink-muted">
          {t("language")}
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
          {locales.map((locale) => (
            <option key={locale} value={locale}>
              {localeNames[locale as Locale]}
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
          {t("preferencesSaved")}
        </p>
      )}

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-gold-light disabled:opacity-60"
        >
          {status === "saving" ? tForms("saving") : t("savePreferences")}
        </button>
      </div>
    </form>
  );
}
