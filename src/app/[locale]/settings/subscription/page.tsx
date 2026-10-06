import { localeRedirect } from "@/i18n/redirect";
import { getTranslations } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import { getCurrentAccount } from "@/lib/account";
import { prisma } from "@/lib/prisma";
import { getBillingState, isPaidPlanId, normalizeBillingInterval } from "@/lib/billing";
import { hasFullAccessEmail } from "@/lib/full-access";
import { ManageBillingButton } from "@/components/settings/BillingActions";
import SubscriptionPlansPicker from "@/components/settings/SubscriptionPlansPicker";
import { formatInvoiceAmount, listCustomerInvoices } from "@/lib/stripe-invoices";

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; checkout?: string; interval?: string }>;
}) {
  const query = await searchParams;
  const requestedPlan = isPaidPlanId(query.plan) ? query.plan : null;
  const requestedInterval = normalizeBillingInterval(query.interval);
  const { authenticated, user } = await getCurrentAccount();
  if (!authenticated || !user) {
    const callback = `/settings/subscription${
      requestedPlan ? `?plan=${requestedPlan}${requestedInterval === "year" ? "&interval=year" : ""}` : ""
    }`;
    return await localeRedirect(`/login?callbackUrl=${encodeURIComponent(callback)}`);
  }

  const t = await getTranslations("settings");
  const billing = getBillingState(user);
  const statusLabel = billing.status.charAt(0).toUpperCase() + billing.status.slice(1);

  let invoices: Awaited<ReturnType<typeof listCustomerInvoices>> = [];
  try {
    const billingIds = await prisma.user.findUnique({
      where: { id: user.id },
      select: { stripeCustomerId: true },
    });
    if (billingIds?.stripeCustomerId) {
      invoices = await listCustomerInvoices(billingIds.stripeCustomerId);
    }
  } catch {
    invoices = [];
  }

  const ownerAccess = hasFullAccessEmail(user.email);

  return (
    <div className="space-y-6">
      {ownerAccess && (
        <p className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {t("ownerAccess")}
        </p>
      )}
      {query.checkout === "success" && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Payment details received. Your plan updates here as soon as Stripe confirms it — usually within a few seconds.
        </p>
      )}
      {query.checkout === "cancelled" && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Checkout was cancelled. You have not been charged.
        </p>
      )}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-navy p-6 text-white shadow-card">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan/25 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow text-cyan-glow">{t("currentPlan")}</p>
            <p className="mt-2 font-display text-3xl font-bold">{billing.plan.name}</p>
            <p className="mt-1 max-w-md text-sm text-white/70">{billing.plan.description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold ${
                  billing.trialing
                    ? "border-cyan-glow/40 bg-cyan/20 text-cyan-glow"
                    : "border-emerald-300/40 bg-emerald-400/15 text-emerald-200"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {billing.trialing ? t("trialActive") : statusLabel}
              </span>
              <span className="text-white/60">
                {billing.renewalDate ? t("renews", { date: billing.renewalDate }) : t("noRenewal")}
              </span>
            </div>
          </div>
          <ManageBillingButton configured={billing.providerConfigured} label={t("manageBilling")} />
        </div>
        {!billing.providerConfigured && (
          <p className="relative mt-5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
            {t("billingUnavailable")}
          </p>
        )}
      </section>

      <SubscriptionPlansPicker
        currentPlan={billing.plan.id}
        configured={billing.providerConfigured}
        requestedPlan={requestedPlan}
        initialInterval={requestedInterval}
        autoStart={Boolean(requestedPlan) && !query.checkout}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="text-sm font-bold text-ink">{t("invoicesTitle")}</h2>
        {invoices.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">{t("invoicesEmpty")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {invoices.map((invoice) => (
              <li key={invoice.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <div>
                  <p className="font-medium text-ink">
                    {invoice.number ?? invoice.id} · {formatInvoiceAmount(invoice.amountDue, invoice.currency)}
                  </p>
                  <p className="text-xs text-ink-dim">
                    {new Date(invoice.created * 1000).toISOString().slice(0, 10)} ·{" "}
                    {invoice.status === "paid" ? t("invoicePaid") : invoice.status ?? t("invoiceOpen")}
                  </p>
                </div>
                {invoice.hostedInvoiceUrl && (
                  <a
                    href={invoice.hostedInvoiceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-cyan hover:underline"
                  >
                    {t("invoiceView")}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
