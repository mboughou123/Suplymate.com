"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export default function OnboardingPage() {
  const t = useTranslations("onboarding");
  const common = useTranslations("common");
  const forms = useTranslations("forms");
  const router = useRouter();
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [role, setRole] = useState<"buyer" | "supplier">("buyer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, jobTitle, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      // Hard navigation: the role may have changed and the workspace is chosen
      // server-side from the stored account role.
      const locale = window.location.pathname.split("/")[1] || "en";
      window.location.assign(
        `/${locale}${role === "supplier" ? "/supplier-dashboard" : "/dashboard"}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <h1 className="font-display text-2xl font-bold text-ink">{t("welcome")}</h1>
      <p className="mt-2 text-sm text-ink-muted">{t("welcomeSubtitle")}</p>
      <form onSubmit={submit} className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <label className="block text-sm">
          <span className="text-ink-muted">{forms("company")}</span>
          <input
            required
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-ink-muted">{forms("fullName")} ({common("optional")})</span>
          <input
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </label>
        <fieldset>
          <legend className="text-sm text-ink-muted">{t("stepProfile")}</legend>
          <div className="mt-2 flex gap-3">
            {(["buyer", "supplier"] as const).map((r) => (
              <label key={r} className="flex items-center gap-2 text-sm capitalize">
                <input type="radio" name="role" checked={role === r} onChange={() => setRole(r)} />
                {r}
              </label>
            ))}
          </div>
        </fieldset>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-cyan px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan/90 disabled:opacity-60"
        >
          {busy ? forms("saving") : t("getStarted")}
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="w-full text-sm text-ink-muted hover:text-ink"
        >
          {t("skipForNow")}
        </button>
      </form>
    </div>
  );
}
