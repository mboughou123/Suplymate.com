import { getTranslations } from "next-intl/server";
import { Star } from "lucide-react";
import Reveal from "@/components/Reveal";
import CountUp from "@/components/CountUp";

const logos = [
  "CasaSteel",
  "Atlas Metals",
  "BuildPro",
  "VoltLine",
  "PackSmart",
  "AgroFresh",
];

export default async function SocialProof() {
  const t = await getTranslations("suppliers");
  const common = await getTranslations("common");

  const stats = [
    { node: <CountUp value={12} suffix="k+" />, label: t("statVerifiedSuppliers") },
    { node: <CountUp value={2.4} prefix="$" suffix="B" decimals={1} />, label: t("statSourcingVolume") },
    { node: <CountUp value={48} />, label: t("statCountriesCovered") },
    { node: <CountUp value={4.8} suffix="/5" decimals={1} />, label: t("statBuyerRating") },
  ];

  const testimonials = [
    {
      quote: t("testimonial1Quote"),
      name: t("testimonial1Name"),
      role: t("testimonial1Role"),
    },
    {
      quote: t("testimonial2Quote"),
      name: t("testimonial2Name"),
      role: t("testimonial2Role"),
    },
    {
      quote: t("testimonial3Quote"),
      name: t("testimonial3Name"),
      role: t("testimonial3Role"),
    },
  ];

  return (
    <section className="border-b border-slate-100 bg-gradient-to-b from-white to-slate-50/60 py-20 sm:py-24">
      <div className="container-page">
        <p className="text-center eyebrow text-ink-dim">
          {t("socialProofTitle")}
        </p>

        <div className="mt-8 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
          <div className="flex w-max animate-marquee items-center gap-4 motion-reduce:w-full motion-reduce:flex-wrap motion-reduce:justify-center sm:gap-5">
            {[...logos, ...logos].map((logo, i) => (
              <span
                key={`${logo}-${i}`}
                aria-hidden={i >= logos.length}
                className="inline-flex shrink-0 items-center rounded-full border border-slate-200/90 bg-white px-5 py-2.5 font-display text-sm font-semibold tracking-tight text-ink-muted shadow-sm"
              >
                {logo}
              </span>
            ))}
          </div>
        </div>

        <Reveal className="mt-14">
          <dl className="grid grid-cols-2 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card lg:grid-cols-4 lg:divide-x lg:divide-y-0">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col-reverse px-5 py-7 text-center sm:px-6 sm:py-8">
                <dt className="mt-1.5 text-body-sm text-ink-muted">{stat.label}</dt>
                <dd className="font-display text-2xl font-bold tabular-nums text-navy sm:text-display">
                  {stat.node}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {testimonials.map((item, i) => (
            <Reveal
              as="article"
              key={item.name}
              delay={i * 90}
              className="glass-card glass-hover flex flex-col p-6 sm:p-7"
            >
              <div className="flex gap-1 text-mustard-light" role="img" aria-label={common("fiveStars")}>
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="h-4 w-4 fill-current" aria-hidden />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 text-body-sm leading-relaxed text-ink-muted">
                &ldquo;{item.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-5">
                <span
                  aria-hidden
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-navy to-navy-mid text-caption font-bold text-white"
                >
                  {item.name
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <span>
                  <p className="text-body-sm font-semibold text-ink">{item.name}</p>
                  <p className="text-caption text-ink-dim">{item.role}</p>
                </span>
              </figcaption>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
