"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ExternalLink, ShieldCheck, X } from "lucide-react";
import { logisticsDirectoryHref, logisticsProviderHref } from "@/data/logistics-providers";
import { pickShipmentInsurers, type ShipmentLane } from "@/lib/logistics-insurance";
import ProviderBadge from "./ProviderBadge";

const DISMISS_KEY = "suplymate:insure-card-dismissed";

type Props = ShipmentLane & {
  /** "rfq" words the card for a buyer who just sent / is reviewing an RFQ. */
  context?: "supplier" | "rfq";
  /** "wide" lays the insurers out in a row for full-width page columns. */
  variant?: "card" | "wide" | "compact";
  className?: string;
};

/**
 * Referral-only prompt listing a few cargo insurers from the Logistics &
 * Insurance directory. Suplymate sells no policies and takes no commission.
 */
export default function InsureShipmentCard({
  origin,
  destination,
  seed,
  context = "supplier",
  variant = "card",
  className = "",
}: Props) {
  const t = useTranslations("logistics");
  const [dismissed, setDismissed] = useState(false);
  const insurers = useMemo(
    () => pickShipmentInsurers({ origin, destination, seed }, variant === "compact" ? 2 : 3),
    [origin, destination, seed, variant],
  );

  useEffect(() => {
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
    } catch {
      // storage unavailable: keep showing
    }
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  }

  if (dismissed || insurers.length < 2) return null;

  if (variant === "compact") {
    return (
      <aside
        className={`flex items-start gap-2 border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-xs ${className}`}
        aria-label={t("insureTitle")}
        data-testid="insure-shipment-card"
      >
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-ink-muted">
            <span className="font-semibold text-ink">{t("insureTitle")}:</span>{" "}
            {insurers.map((p, i) => (
              <span key={p.id} className="inline-flex items-center gap-1 align-middle">
                {i > 0 && <span aria-hidden>·</span>}
                <ProviderBadge provider={p} size="sm" />
                <Link href={logisticsProviderHref(p.id)} className="font-medium text-cyan hover:underline">
                  {p.name}
                </Link>
              </span>
            ))}
            {" · "}
            <Link href={logisticsDirectoryHref("insurance")} className="text-ink-muted hover:text-cyan hover:underline">
              {t("insureMore")}
            </Link>
          </p>
          <p className="mt-0.5 text-[10px] text-ink-dim">{t("disclaimer")}</p>
        </div>
        <button type="button" onClick={dismiss} aria-label={t("dismiss")} className="text-ink-dim hover:text-ink">
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </aside>
    );
  }

  return (
    <aside
      className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-card ${className}`}
      aria-labelledby="insure-shipment-title"
      data-testid="insure-shipment-card"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 id="insure-shipment-title" className="inline-flex items-center gap-1.5 text-sm font-bold text-ink">
          <ShieldCheck className="h-4 w-4 text-cyan" aria-hidden />
          {t("insureTitle")}
        </h3>
        <button type="button" onClick={dismiss} aria-label={t("dismiss")} className="text-ink-dim hover:text-ink">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <p className="mt-1 text-xs text-ink-muted">{context === "rfq" ? t("insureBodyRfq") : t("insureBody")}</p>
      <ul className={variant === "wide" ? "mt-3 grid gap-2 sm:grid-cols-3" : "mt-3 divide-y divide-slate-100"}>
        {insurers.map((p) => (
          <li
            key={p.id}
            className={`flex min-w-0 items-center justify-between gap-2 ${
              variant === "wide" ? "rounded-xl border border-slate-200 px-3 py-2" : "py-2"
            }`}
          >
            <div className="flex min-w-0 items-center gap-2">
              <ProviderBadge provider={p} size="sm" />
              <div className="min-w-0">
                <Link
                  href={logisticsProviderHref(p.id)}
                  className="block truncate text-sm font-semibold text-ink hover:text-cyan"
                  title={p.name}
                >
                  {p.name}
                </Link>
                <p className="truncate text-[11px] text-ink-dim">{t(`kind.${p.kind}`)}</p>
              </div>
            </div>
            {p.quoteUrl && (
              <a
                href={p.quoteUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                aria-label={t("requestQuoteAria", { name: p.name })}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-ink-muted transition hover:border-cyan/40 hover:text-cyan"
              >
                {t("requestQuote")}
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            )}
          </li>
        ))}
      </ul>
      <Link
        href={logisticsDirectoryHref("insurance")}
        className="mt-2 inline-block text-xs font-medium text-cyan hover:underline"
      >
        {t("insureMore")}
      </Link>
      <p className="mt-2 border-t border-slate-100 pt-2 text-[10px] leading-snug text-ink-dim">
        {t("orderNote")} {t("disclaimer")}
      </p>
    </aside>
  );
}
