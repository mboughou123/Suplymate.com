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
    <section className="border-y border-slate-200 py-16">
      <div className="container-page">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-ink-dim">
          Trusted by procurement teams worldwide
        </p>

        {/* Infinite logo marquee */}
        <div className="mt-8 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
          <div className="flex w-max animate-marquee gap-4">
            {[...logos, ...logos].map((logo, i) => (
              <div
                key={`${logo}-${i}`}
                className="flex w-44 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 py-4 text-sm font-semibold text-ink-muted backdrop-blur"
              >
                {logo}
              </div>
            ))}
          </div>
        </div>

        {/* Animated stat counters */}
        <div className="mt-14 grid grid-cols-2 gap-8 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 90} className="text-center">
              <p className="font-display text-3xl font-bold sm:text-4xl">
                <span className="gradient-text">{stat.node}</span>
              </p>
              <p className="mt-1 text-sm text-ink-muted">{stat.label}</p>
            </Reveal>
          ))}
        </div>

        {/* Testimonials */}
        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <Reveal as="article" key={t.name} delay={i * 120} className="glass-card glass-hover flex flex-col p-6">
              <div className="flex gap-0.5 text-mustard" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="h-4 w-4 fill-current" aria-hidden />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-ink-muted">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-5 border-t border-slate-200 pt-4">
                <p className="text-sm font-semibold text-ink">{t.name}</p>
                <p className="text-xs text-ink-dim">{t.role}</p>
              </figcaption>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
