"use client";

import { useTranslations } from "next-intl";
import {
  EARLY_BIRD,
  formatUsdCents,
  planPriceCents,
  type BillingInterval,
  type Plan,
  type PaidPlanId,
} from "@/lib/billing";

type Props = { plan: Plan; interval: BillingInterval; size?: "lg" | "md" };

function isPaid(id: Plan["id"]): id is PaidPlanId {
  return id !== "free";
}

export default function PlanPrice({ plan, interval, size = "lg" }: Props) {
  const t = useTranslations("pricing");
  const amountClass =
    size === "lg"
      ? "font-display text-4xl font-bold tabular-nums tracking-tight text-ink"
      : "font-display text-2xl font-bold tabular-nums text-ink";

  if (!isPaid(plan.id)) {
    return (
      <div>
        <p>
          <span className={amountClass}>{plan.priceLabel}</span>
          <span className="text-sm text-ink-dim"> {t("forever")}</span>
        </p>
        <p className="mt-1 h-4 text-xs text-ink-dim">{t("noCard")}</p>
      </div>
    );
  }

  const monthly = planPriceCents(plan.id, "month");
  if (interval === "year") {
    const yearly = planPriceCents(plan.id, "year");
    return (
      <div>
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className={amountClass}>{formatUsdCents(Math.round(yearly / 12))}</span>
          <span className="text-sm text-ink-dim">{t("perMonth")}</span>
          <span className="text-sm text-ink-dim line-through">{formatUsdCents(monthly)}</span>
        </p>
        <p className="mt-1 h-4 text-xs font-semibold text-emerald-700">
          {t("billedYearly", { amount: formatUsdCents(yearly) })}
        </p>
      </div>
    );
  }

  return (
    <div>
      <p>
        <span className={amountClass}>{formatUsdCents(monthly)}</span>
        <span className="text-sm text-ink-dim"> {t("perMonth")}</span>
      </p>
      <p className="mt-1 h-4 text-xs font-semibold text-cyan">
        {t("earlyBirdPrice", {
          amount: formatUsdCents(Math.round((monthly * (100 - EARLY_BIRD.percentOff)) / 100)),
          months: EARLY_BIRD.durationMonths,
        })}
      </p>
    </div>
  );
}
