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
import SupplierShowcaseSection from "@/components/SupplierShowcaseSection";
import ProductShowcaseSection from "@/components/ProductShowcaseSection";
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

      <section className="relative z-10 -mt-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="glass rounded-2xl p-2 shadow-cardHover">
          <form action="/products" className="flex flex-col gap-2 sm:flex-row">
            <div className="flex flex-1 items-center gap-2 px-3">
              <Search className="h-5 w-5 shrink-0 text-cyan" aria-hidden />
              <input
                type="search"
                name="q"
                placeholder="Search steel, cables, cement, packaging, machinery…"
                className="w-full bg-transparent py-4 text-sm text-ink placeholder:text-ink-dim focus:outline-none"
              />
            </div>
            <button type="submit" className="btn-primary px-8 py-4 sm:shrink-0">
              Search products
            </button>
          </form>
        </div>
      </section>

      <section className="container-page py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
            Everything you need to source smarter
          </h2>
          <p className="mt-3 text-ink-muted">
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

      <SupplierShowcaseSection />

      <ProductShowcaseSection />

      <TrustAiSection />

      <SocialProof />

      <section className="py-20">
        <div className="container-page">
          <Reveal>
            <h2 className="text-center font-display text-3xl font-bold text-ink sm:text-4xl">
              Industries we cover
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-ink-muted">
              From raw materials to specialized equipment — built for B2B procurement teams.
            </p>
          </Reveal>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {industries.map((ind, i) => (
              <Reveal key={ind} delay={i * 60}>
                <Link
                  href="/suppliers"
                  className="inline-block rounded-full border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-medium text-ink-muted backdrop-blur transition-all duration-300 ease-cinema hover:border-cyan/50 hover:text-cyan hover:shadow-glow cursor-pointer"
                >
                  {ind}
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-20">
        <Reveal>
          <h2 className="text-center font-display text-3xl font-bold text-ink sm:text-4xl">
            How it works
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal as="div" key={s.step} delay={i * 120} className="glass-card glass-hover relative p-8">
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan/20 bg-gradient-to-br from-cyan/10 to-teal/10 text-cyan">
                  <s.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="font-display text-4xl font-bold text-slate-200">
                  {s.step}
                </span>
              </div>
              <h3 className="mt-5 text-xl font-semibold text-ink">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{s.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="py-16">
        <div className="container-page">
          <Reveal className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-cyan/10 via-teal/10 to-mustard/10 px-8 py-14 text-center backdrop-blur-xl">
            <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
              Ready to make smarter buying decisions?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-ink-muted">
              Join procurement teams using Suplymate to reduce costs and de-risk supply chains.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link href="/suppliers" className="btn-primary px-6 py-3.5">
                Explore suppliers
              </Link>
              <Link href="/pricing" className="btn-ghost px-6 py-3.5">
                View pricing
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
