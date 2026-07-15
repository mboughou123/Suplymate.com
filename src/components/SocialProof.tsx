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
    <section className="border-b border-slate-100 py-20 sm:py-24">
      <div className="container-page">
        <p className="text-center eyebrow text-ink-dim">
          {t("socialProofTitle")}
        </p>

        <div className="mt-8 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
          <div className="flex w-max animate-marquee items-center gap-14 motion-reduce:w-full motion-reduce:flex-wrap motion-reduce:justify-center">
            {[...logos, ...logos].map((logo, i) => (
              <span
                key={`${logo}-${i}`}
                aria-hidden={i >= logos.length}
                className="shrink-0 whitespace-nowrap font-display text-heading-sm font-semibold tracking-tight text-ink-dim"
              >
                {logo}
              </span>
            ))}
          </div>
        </div>

        <Reveal className="mt-14">
          <dl className="grid grid-cols-2 divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card lg:grid-cols-4 lg:divide-x">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col-reverse px-6 py-8 text-center">
                <dt className="mt-1.5 text-body-sm text-ink-muted">{stat.label}</dt>
                <dd className="font-display text-display font-bold text-navy">
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
              className="glass-card glass-hover flex flex-col p-7"
            >
              <div className="flex gap-1 text-mustard-light" role="img" aria-label={common("fiveStars")}>
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="h-4 w-4 fill-current" aria-hidden />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 text-body-sm text-ink-muted">
                &ldquo;{item.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-5">
                <span
                  aria-hidden
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-caption font-bold text-white"
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
