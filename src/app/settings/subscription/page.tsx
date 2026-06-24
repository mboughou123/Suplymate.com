import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { getCurrentAccount } from "@/lib/account";
import { PLANS, getBillingState } from "@/lib/billing";
import { ManageBillingButton, UpgradeButton } from "@/components/settings/BillingActions";

export default async function SubscriptionPage() {
  const { authenticated, user } = await getCurrentAccount();
  if (!authenticated || !user) redirect("/login?callbackUrl=/settings/subscription");

  const billing = getBillingState(user);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-ink">Current plan</h2>
            <p className="mt-2 text-2xl font-bold text-ink">{billing.plan.name}</p>
            <p className="mt-1 text-sm text-ink-muted">{billing.plan.description}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {billing.status.charAt(0).toUpperCase() + billing.status.slice(1)}
              </span>
              <span className="text-ink-dim">
                {billing.renewalDate
                  ? `Renews ${billing.renewalDate}`
                  : "No renewal date — free plan"}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <ManageBillingButton configured={billing.providerConfigured} />
          </div>
        </div>
        {!billing.providerConfigured && (
          <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-ink-muted">
            Online billing isn&apos;t available yet. Plan changes and payments are
            coming soon — your plan won&apos;t change until then.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold text-ink">Available plans</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((plan) => {
            const current = plan.id === billing.plan.id;
            return (
              <div
                key={plan.id}
                className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm ${
                  current ? "border-gold ring-1 ring-gold/30" : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-ink">{plan.name}</h3>
                  {current && (
                    <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-ink">
                      Current
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xl font-bold text-ink">{plan.priceLabel}</p>
                <ul className="mt-4 flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-ink-muted">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
                <UpgradeButton
                  plan={plan.id}
                  current={current}
                  configured={billing.providerConfigured}
                />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
