"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, Sparkles, Ticket, X } from "lucide-react";
import { PLANS, type BillingInterval, type PlanId } from "@/lib/billing";
import { UpgradeButton } from "@/components/settings/BillingActions";
import BillingIntervalToggle from "@/components/pricing/BillingIntervalToggle";
import PlanPrice from "@/components/pricing/PlanPrice";

type Props = {
  currentPlan: PlanId;
  configured: boolean;
  requestedPlan: PlanId | null;
  initialInterval: BillingInterval;
  autoStart: boolean;
};

type AppliedCoupon = { code: string; percentOff: number | null; amountOff: number | null; free: boolean };

export default function SubscriptionPlansPicker({
  currentPlan,
  configured,
  requestedPlan,
  initialInterval,
  autoStart,
}: Props) {
  const t = useTranslations("settings");
  const [interval, setBillingInterval] = useState<BillingInterval>(initialInterval);
  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [checking, setChecking] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  async function applyCoupon(e: FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    setChecking(true);
    setCouponError(null);
    try {
      const res = await fetch("/api/billing/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.valid) {
        setCoupon({ code: data.code, percentOff: data.percentOff, amountOff: data.amountOff, free: Boolean(data.free) });
      } else {
        setCoupon(null);
        setCouponError(data.error || t("couponInvalid"));
      }
    } catch {
      setCouponError(t("couponInvalid"));
    } finally {
      setChecking(false);
    }
  }

  const couponSummary = coupon
    ? coupon.free
      ? t("couponFree")
      : coupon.percentOff
        ? t("couponPercent", { percent: coupon.percentOff })
        : t("couponApplied")
    : null;

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-ink">{t("availablePlans")}</h2>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan/20 bg-cyan-soft px-3 py-1 text-xs font-semibold text-cyan">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {t("trialNote")}
          </span>
          <BillingIntervalToggle value={interval} onChange={setBillingInterval} />
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <form onSubmit={applyCoupon} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label htmlFor="coupon-code" className="flex items-center gap-1.5 text-xs font-semibold text-ink">
              <Ticket className="h-3.5 w-3.5 text-cyan" aria-hidden />
              {t("couponLabel")}
            </label>
            <input
              id="coupon-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={t("couponPlaceholder")}
              autoComplete="off"
              spellCheck={false}
              disabled={Boolean(coupon)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm uppercase tracking-wide text-ink outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20 disabled:bg-slate-50"
            />
          </div>
          {coupon ? (
            <button
              type="button"
              onClick={() => {
                setCoupon(null);
                setCode("");
              }}
              className="btn-secondary inline-flex items-center gap-1.5 text-sm"
            >
              <X className="h-4 w-4" aria-hidden />
              {t("couponRemove")}
            </button>
          ) : (
            <button
              type="submit"
              disabled={checking || !code.trim() || !configured}
              className="btn-primary inline-flex items-center gap-1.5 text-sm disabled:opacity-60"
            >
              {checking && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {t("couponApply")}
            </button>
          )}
        </form>
        {coupon && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700" role="status">
            <Check className="h-3.5 w-3.5" aria-hidden />
            {coupon.code} · {couponSummary}
          </p>
        )}
        {couponError && (
          <p className="mt-2 text-xs text-red-600" role="alert">
            {couponError}
          </p>
        )}
        {!coupon && !couponError && <p className="mt-2 text-xs text-ink-dim">{t("couponHint")}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((plan) => {
          const current = plan.id === currentPlan;
          return (
            <div
              key={plan.id}
              className={`flex flex-col rounded-2xl border bg-white p-5 shadow-card ${
                current ? "border-cyan ring-1 ring-cyan/30" : plan.highlighted ? "border-navy/30" : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-ink">{plan.name}</h3>
                {current && (
                  <span className="rounded-full bg-cyan-soft px-2 py-0.5 text-[10px] font-semibold text-cyan">
                    {t("yourPlan")}
                  </span>
                )}
              </div>
              <div className="mt-2">
                <PlanPrice plan={plan} interval={interval} size="md" />
              </div>
              <p className="mt-2 text-xs text-ink-muted">{plan.audience}</p>
              <ul className="mt-4 flex-1 space-y-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-ink-muted">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <UpgradeButton
                plan={plan.id}
                cta={plan.cta}
                current={current}
                configured={configured}
                interval={interval}
                coupon={coupon?.code ?? null}
                autoStart={autoStart && plan.id === requestedPlan}
                labels={{
                  current: t("yourPlan"),
                  trial: t("startTrial"),
                  upgrade: t("upgrade"),
                  sales: t("talkToSales"),
                }}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
