import Link from "next/link";
import {
  Factory,
  BarChart3,
  TrendingUp,
  Bot,
  Search,
  GitCompare,
  CheckCircle2,
} from "lucide-react";
import Hero from "@/components/Hero";
import FeatureCard from "@/components/FeatureCard";
import SocialProof from "@/components/SocialProof";
import HomepageSupplierSection from "@/components/HomepageSupplierSection";
import HomepageProductSection from "@/components/HomepageProductSection";
import TrustAiSection from "@/components/TrustAiSection";
import Reveal from "@/components/Reveal";

const features = [
  {
    title: "Find suppliers",
    description:
      "Discover verified industrial suppliers by industry, region, and reliability score.",
    icon: Factory,
    href: "/suppliers",
  },
  {
    title: "Compare products",
    description:
      "Search materials and parts, then compare offers from multiple suppliers side by side.",
    icon: BarChart3,
    href: "/products",
  },
  {
    title: "Track material prices",
    description:
      "Monitor steel, copper, oil, and more — know when to buy with AI market signals.",
    icon: TrendingUp,
    href: "/price-charts",
  },
  {
    title: "Ask the AI assistant",
    description:
      "Get procurement recommendations on price, delivery, risk, and timing in seconds.",
    icon: Bot,
    href: "/ai-assistant",
  },
];

const industries = [
  "Metal & Steel",
  "Construction & BTP",
  "Industrial Equipment",
  "Electrotechnical",
  "Plastics & Packaging",
  "Agriculture & Agrofood",
  "Chemicals",
  "Energy & Utilities",
];

const steps = [
  {
    step: "01",
    icon: Search,
    title: "Search",
    text: "Tell us what you need — product, quantity, destination, and timeline.",
  },
  {
    step: "02",
    icon: GitCompare,
    title: "Compare",
    text: "Review suppliers, prices, MOQs, and delivery options in one place.",
  },
  {
    step: "03",
    icon: CheckCircle2,
    title: "Decide",
    text: "Use price charts and AI signals to buy at the right time.",
  },
];

export default function HomePage() {
  return (
    <>
      <Hero />

      <section className="container-page py-20 sm:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-display text-ink">
            Everything you need to source smarter
          </h2>
          <p className="mt-4 text-body-lg text-ink-muted">
            One platform for suppliers, products, market intelligence, and AI guidance.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 100}>
              <FeatureCard {...f} />
            </Reveal>
          ))}
        </div>
      </section>

      <HomepageSupplierSection />

      <HomepageProductSection />

      <TrustAiSection />

      <SocialProof />

      <section className="py-20 sm:py-24">
        <div className="container-page">
          <Reveal>
            <h2 className="text-center font-display text-display text-ink">
              Industries we cover
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-body-lg text-ink-muted">
              From raw materials to specialized equipment — built for B2B procurement teams.
            </p>
          </Reveal>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {industries.map((ind, i) => (
              <Reveal key={ind} delay={i * 40}>
                <Link
                  href="/suppliers"
                  className="inline-block rounded-full border border-slate-200 bg-white px-5 py-2.5 text-body-sm font-medium text-ink-muted shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 ease-cinema hover:border-cyan/40 hover:bg-cyan-soft hover:text-cyan cursor-pointer"
                >
                  {ind}
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-20 sm:py-24">
        <Reveal>
          <h2 className="text-center font-display text-display text-ink">
            How it works
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal as="div" key={s.step} delay={i * 100} className="glass-card glass-hover relative p-8">
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-soft text-cyan ring-1 ring-inset ring-cyan/15">
                  <s.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </span>
                <span
                  aria-hidden
                  className="font-display text-display font-bold tabular-nums text-slate-200"
                >
                  {s.step}
                </span>
              </div>
              <h3 className="mt-6 text-heading-sm text-ink">{s.title}</h3>
              <p className="mt-2 text-body-sm text-ink-muted">{s.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="pb-24 pt-4">
        <div className="container-page">
          <Reveal className="relative overflow-hidden rounded-3xl bg-navy px-8 py-16 text-center">
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 bg-[radial-gradient(40rem_20rem_at_50%_-4rem,rgba(56,189,248,0.18),transparent)]" />
            </div>
            <h2 className="relative font-display text-display text-white">
              Ready to make smarter buying decisions?
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-body-lg text-white/75">
              Join procurement teams using Suplymate to reduce costs and de-risk supply chains.
            </p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/suppliers"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-navy shadow-cardHover transition-all duration-200 ease-cinema hover:bg-cyan-soft active:translate-y-px cursor-pointer"
              >
                Explore suppliers
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition-all duration-200 ease-cinema hover:border-white/40 hover:bg-white/10 active:translate-y-px cursor-pointer"
              >
                View pricing
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
