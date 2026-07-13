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

const stats = [
  { node: <CountUp value={12} suffix="k+" />, label: "Verified suppliers" },
  { node: <CountUp value={2.4} prefix="$" suffix="B" decimals={1} />, label: "Sourcing volume tracked" },
  { node: <CountUp value={48} />, label: "Countries covered" },
  { node: <CountUp value={4.8} suffix="/5" decimals={1} />, label: "Average buyer rating" },
];

const testimonials = [
  {
    quote:
      "Suplymate cut our supplier discovery time from weeks to a single afternoon. The price signals alone paid for the subscription.",
    name: "Karim Alaoui",
    role: "Head of Procurement, CasaSteel",
  },
  {
    quote:
      "We compare offers across five countries in one screen. The AI assistant flags risk we used to miss entirely.",
    name: "Élodie Martin",
    role: "Supply Chain Lead, BuildPro",
  },
  {
    quote:
      "Material price tracking helped us time a steel order and save 8%. It's now part of our weekly buying ritual.",
    name: "David Okonkwo",
    role: "Operations Director, VoltLine",
  },
];

export default function SocialProof() {
  return (
    <section className="border-b border-slate-100 py-20 sm:py-24">
      <div className="container-page">
        <p className="text-center eyebrow text-ink-dim">
          Trusted by procurement teams worldwide
        </p>

        {/* Logo marquee — quiet wordmarks */}
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

        {/* Stat band — the trust centerpiece */}
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

        {/* Testimonials */}
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <Reveal
              as="article"
              key={t.name}
              delay={i * 90}
              className="glass-card glass-hover flex flex-col p-7"
            >
              <div className="flex gap-1 text-mustard-light" role="img" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="h-4 w-4 fill-current" aria-hidden />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 text-body-sm text-ink-muted">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-5">
                <span
                  aria-hidden
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-caption font-bold text-white"
                >
                  {t.name
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <span>
                  <p className="text-body-sm font-semibold text-ink">{t.name}</p>
                  <p className="text-caption text-ink-dim">{t.role}</p>
                </span>
              </figcaption>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
