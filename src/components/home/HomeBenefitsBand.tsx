import { getTranslations } from "next-intl/server";
import CountUp from "@/components/CountUp";
import { buildHomeBenefits, type HomeBenefitInputs } from "@/lib/home-benefits";

/**
 * Alternating vertical offsets so the cards read as "floating" on desktop.
 * Index-based so the stagger survives a dropped card.
 */
const FLOAT_OFFSETS = ["lg:translate-y-4", "lg:-translate-y-3", "lg:translate-y-1", "lg:-translate-y-4", "lg:translate-y-3"];

export default async function HomeBenefitsBand(inputs: HomeBenefitInputs) {
  const t = await getTranslations("homeBenefits");
  const items = buildHomeBenefits(inputs);

  return (
    <section
      className="relative overflow-hidden border-b border-slate-100/80 section-y-tight"
      aria-labelledby="home-benefits-heading"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white via-cyan-soft to-base">
        <div className="absolute left-[15%] top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-cyan-glow/20 blur-[120px]" />
        <div className="absolute right-[12%] top-1/3 h-64 w-64 rounded-full bg-navy/10 blur-[120px]" />
      </div>

      <div className="container-page relative">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-cyan">{t("eyebrow")}</p>
          <h2 id="home-benefits-heading" className="mt-3 font-display text-display text-ink text-balance">
            {t("title")}
          </h2>
          <p className="mt-4 text-body-lg text-ink-muted">{t("subtitle")}</p>
        </div>

        <ul
          className="-mx-4 mt-block-lg flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-6 pt-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-5 lg:gap-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label={t("title")}
        >
          {items.map((item, i) => (
            <li
              key={item.key}
              className={`flex w-[16.5rem] shrink-0 snap-center flex-col rounded-2xl border border-white/90 bg-white/70 p-6 shadow-glass backdrop-blur-xl transition-all duration-300 ease-cinema hover:-translate-y-1 hover:border-cyan/25 hover:shadow-cardHover sm:w-auto ${FLOAT_OFFSETS[i % FLOAT_OFFSETS.length]}`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-dim">{t(`items.${item.key}.label`)}</p>
              <p className="mt-4 font-display text-display font-bold tabular-nums text-navy sm:text-display-lg">
                {item.value === null ? (
                  item.display
                ) : (
                  <CountUp value={item.value} prefix={item.prefix} suffix={item.suffix} />
                )}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">{t(`items.${item.key}.note`)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
