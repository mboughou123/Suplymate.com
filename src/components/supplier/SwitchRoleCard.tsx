"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";

type Props = { target: "supplier" | "buyer" };

export default function SwitchRoleCard({ target }: Props) {
  const t = useTranslations("supplierDashboard");
  const tErrors = useTranslations("errors");
  const { update } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function switchRole() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: target }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || tErrors("generic"));
        setBusy(false);
        return;
      }
      await update?.({ role: target });
      const locale = window.location.pathname.split("/")[1] || "en";
      window.location.assign(`/${locale}${data.home ?? "/dashboard"}`);
    } catch {
      setError(tErrors("network"));
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-card">
      <h2 className="font-display text-xl font-bold text-ink">{t("buyerAccountTitle")}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
        {t("buyerAccountBody")}
      </p>
      {error && (
        <p className="mx-auto mt-4 flex max-w-md items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" aria-hidden />
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <button type="button" onClick={switchRole} disabled={busy} className="btn-primary disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {busy ? t("switching") : t("switchToSupplier")}
          {!busy && <ArrowRight className="h-4 w-4" aria-hidden />}
        </button>
        <Link href="/dashboard" className="btn-secondary">
          {t("goToBuyerDashboard")}
        </Link>
      </div>
    </section>
  );
}
