import { getTranslations } from "next-intl/server";
import CountUp from "@/components/CountUp";

export default async function HomeStatsRow() {
  const t = await getTranslations("homeStats");

  const stats = [
    { node: <CountUp value={12} suffix="k+" />, label: t("verifiedSuppliers") },
    { node: <CountUp value={48} />, label: t("countries") },
    { node: <CountUp value={4.8} suffix="/5" decimals={1} />, label: t("buyerRating") },
  ];

  return (
    <section className="border-b border-slate-100/80 bg-white">
      <div className="container-page py-16 sm:py-section">
        <dl className="grid divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center px-6 py-8 text-center sm:py-10">
              <dd className="font-display text-display font-bold tabular-nums text-navy sm:text-display-lg">
                {stat.node}
              </dd>
              <dt className="mt-2 text-sm text-ink-muted">{stat.label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
