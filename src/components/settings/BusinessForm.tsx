"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, AlertCircle, Loader2 } from "lucide-react";
import { INDUSTRIES } from "@/data/industries";
import TagInput from "@/components/ui/TagInput";

type Initial = {
  company: string;
  companyType: string;
  industry: string;
  location: string;
  bio: string;
  procurementInterests: string[];
  preferredMaterials: string[];
};

const COMPANY_TYPES = ["manufacturer", "distributor", "contractor", "startup", "procurement", "other"] as const;

const input =
  "mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-ink focus:border-cyan/60 focus:outline-none focus:ring-2 focus:ring-cyan/20";

export default function BusinessForm({ initial }: { initial: Initial }) {
  const t = useTranslations("settings");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function set<K extends keyof Initial>(key: K, value: Initial[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSuccess(false);
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || tErrors("generic"));
        return;
      }
      setSuccess(true);
      router.refresh();
    } catch {
      setError(tErrors("network"));
    } finally {
      setSaving(false);
    }
  }

  const materialSuggestions = INDUSTRIES.find((i) => i.id === form.industry)?.subcategories ?? [];

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
      <h2 className="text-sm font-bold text-ink">{t("business")}</h2>
      <p className="mt-1 text-xs text-ink-muted">{t("businessSubtitle")}</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="company" className="text-xs font-medium text-ink-muted">{t("companyName")}</label>
          <input id="company" value={form.company} onChange={(e) => set("company", e.target.value)} className={input} />
        </div>
        <div>
          <label htmlFor="companyType" className="text-xs font-medium text-ink-muted">{t("companyType")}</label>
          <select id="companyType" value={form.companyType} onChange={(e) => set("companyType", e.target.value)} className={input}>
            <option value="">—</option>
            {COMPANY_TYPES.map((ct) => (
              <option key={ct} value={ct}>{t(`companyTypes.${ct}`)}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="industry" className="text-xs font-medium text-ink-muted">{t("industry")}</label>
          <select id="industry" value={form.industry} onChange={(e) => set("industry", e.target.value)} className={input}>
            <option value="">—</option>
            {INDUSTRIES.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="location" className="text-xs font-medium text-ink-muted">{t("location")}</label>
          <input id="location" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="City, Country" className={input} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="bio" className="text-xs font-medium text-ink-muted">{t("businessDescription")}</label>
          <textarea id="bio" rows={4} value={form.bio} onChange={(e) => set("bio", e.target.value)} className={input} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="interests" className="text-xs font-medium text-ink-muted">{t("procurementInterests")}</label>
          <TagInput
            id="interests"
            value={form.procurementInterests}
            onChange={(v) => set("procurementInterests", v)}
            placeholder="e.g. structural steel, packaging, CNC parts"
            suggestions={INDUSTRIES.map((i) => i.name)}
            max={30}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="materials" className="text-xs font-medium text-ink-muted">{t("preferredMaterials")}</label>
          <TagInput
            id="materials"
            value={form.preferredMaterials}
            onChange={(v) => set("preferredMaterials", v)}
            placeholder="e.g. 6061 aluminum, 304 stainless"
            suggestions={materialSuggestions}
            max={30}
          />
        </div>
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
          {t("businessSaved")}
        </p>
      )}

      <div className="mt-6 flex justify-end">
        <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
          {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {t("saveChanges")}
        </button>
      </div>
    </form>
  );
}
