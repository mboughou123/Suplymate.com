import Link from "next/link";

const plans = [
  {
    name: "Starter",
    price: "Free",
    period: "14-day trial",
    features: [
      "Up to 10 supplier searches / month",
      "Basic product comparison",
      "Price charts (3 materials)",
      "5 AI assistant queries / month",
    ],
    cta: "Start free trial",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$149",
    period: "/ month",
    features: [
      "Unlimited supplier & product search",
      "Full comparison tables",
      "All material price charts + alerts",
      "Unlimited AI assistant",
      "Team seats (up to 5)",
    ],
    cta: "Get Pro",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    features: [
      "Dedicated account manager",
      "API access & integrations",
      "Custom supplier onboarding",
      "SLA & priority support",
      "Advanced analytics",
    ],
    cta: "Contact sales",
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="bg-transparent min-h-screen">
      <div className="bg-gradient-to-br from-navy-dark to-navy py-16 text-white text-center">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl font-bold">Pricing</h1>
          <p className="mt-4 text-white/75 max-w-xl mx-auto">
            Plans for procurement teams of every size. MVP preview — no billing connected.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col rounded-2xl border p-8 ${
                plan.highlighted
                  ? "border-mustard bg-slate-50 shadow-cardHover ring-2 ring-mustard/20 scale-[1.02]"
                  : "border-slate-200 bg-slate-50 shadow-card"
              }`}
            >
              {plan.highlighted && (
                <span className="mb-4 inline-flex w-fit rounded-full bg-mustard px-3 py-1 text-xs font-semibold text-ink">
                  Most popular
                </span>
              )}
              <h2 className="text-xl font-semibold text-ink">{plan.name}</h2>
              <p className="mt-4">
                <span className="text-4xl font-bold text-ink">{plan.price}</span>
                <span className="text-ink-dim">{plan.period}</span>
              </p>
              <ul className="mt-8 flex-1 space-y-3 text-sm text-ink-muted">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-mustard">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/suppliers"
                className={`mt-8 block rounded-xl py-3 text-center text-sm font-semibold transition ${
                  plan.highlighted
                    ? "bg-mustard text-ink hover:bg-mustard-light"
                    : "bg-navy text-white hover:bg-navy-mid"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
