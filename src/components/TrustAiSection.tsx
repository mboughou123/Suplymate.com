import Link from "next/link";
import {
  Bot,
  Headset,
  ShieldCheck,
  LineChart,
  Lightbulb,
  BellRing,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import AnimatedSection from "@/components/AnimatedSection";
import CountUp from "@/components/CountUp";

const capabilities = [
  {
    icon: Bot,
    title: "AI supplier matching",
    text: "Describe what you need and our AI surfaces the best-fit verified suppliers in seconds — ranked by price, reliability, and lead time.",
  },
  {
    icon: Headset,
    title: "Human procurement experts",
    text: "Real sourcing specialists back every match, helping you negotiate, validate quality, and de-risk high-value orders.",
  },
  {
    icon: ShieldCheck,
    title: "Verified supplier network",
    text: "Every supplier is vetted for credentials, reviews, and delivery history so you buy with enterprise-grade confidence.",
  },
  {
    icon: LineChart,
    title: "Market price tracking",
    text: "Monitor steel, aluminum, cement, and more with live market signals that tell you exactly when to buy.",
  },
  {
    icon: Lightbulb,
    title: "Sourcing intelligence",
    text: "Benchmark offers, spot cost-saving opportunities, and forecast delivery reliability with data-driven insights.",
  },
  {
    icon: BellRing,
    title: "Price drop alerts",
    text: "Get notified the moment prices fall on the materials you source — never miss the optimal buying window again.",
  },
];

const stats = [
  { node: <CountUp value={500} suffix="+" />, label: "Verified suppliers" },
  { node: <CountUp value={20} suffix="+" />, label: "Industries covered" },
  { node: <span>AI</span>, label: "Powered matching" },
  { node: <span>24/7</span>, label: "Procurement support" },
];

export default function TrustAiSection() {
  return (
    <section className="relative overflow-hidden bg-navy-dark py-20 text-white sm:py-24">
      {/* Distinct AI surface: deep navy + one radial aurora + faint grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(56rem_30rem_at_50%_-8rem,rgba(56,189,248,0.16),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(40rem_24rem_at_85%_110%,rgba(20,184,166,0.10),transparent_70%)]" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "linear-gradient(to bottom, black, transparent 80%)",
          }}
        />
      </div>

      <div className="relative container-page">
        <AnimatedSection className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-glow/25 bg-cyan-glow/10 px-3.5 py-1.5 eyebrow text-cyan-glow">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            AI + human expertise
          </span>
          <h2 className="mt-5 font-display text-display text-white">
            Source smarter with intelligence on your side
          </h2>
          <p className="mt-4 text-body-lg text-white/70">
            Suplymate blends AI-powered procurement tools with real human experts
            so you find the right supplier, at the right price, every time.
          </p>
        </AnimatedSection>

        {/* Stat band */}
        <div className="mt-14 grid grid-cols-2 divide-white/10 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm sm:grid-cols-4 sm:divide-x">
          {stats.map((stat, i) => (
            <AnimatedSection
              key={stat.label}
              delay={i * 0.06}
              from="up"
              className="px-6 py-7 text-center"
            >
              <p className="font-display text-heading-lg font-bold tabular-nums text-white sm:text-display">
                {stat.node}
              </p>
              <p className="mt-1 text-body-sm text-white/60">{stat.label}</p>
            </AnimatedSection>
          ))}
        </div>

        {/* Capability grid */}
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((cap, i) => (
            <AnimatedSection key={cap.title} delay={(i % 3) * 0.06} from="up">
              <article className="group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition-all duration-300 ease-cinema hover:-translate-y-1 hover:border-cyan-glow/30 hover:bg-white/[0.07] motion-reduce:transform-none">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-glow/20 bg-cyan-glow/10 text-cyan-glow">
                  <cap.icon className="h-5 w-5" strokeWidth={1.8} aria-hidden />
                </span>
                <h3 className="mt-5 text-heading-sm text-white">{cap.title}</h3>
                <p className="mt-2 text-body-sm text-white/65">{cap.text}</p>
              </article>
            </AnimatedSection>
          ))}
        </div>

        <AnimatedSection className="mt-12 flex flex-wrap justify-center gap-4" delay={0.1}>
          <Link
            href="/ai-assistant"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-navy shadow-cardHover transition-all duration-200 ease-cinema hover:bg-cyan-soft active:translate-y-px cursor-pointer"
          >
            <Bot className="h-4 w-4" aria-hidden />
            Try the AI assistant
          </Link>
          <Link
            href="/suppliers"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition-all duration-200 ease-cinema hover:border-white/35 hover:bg-white/10 active:translate-y-px cursor-pointer"
          >
            Browse suppliers
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </AnimatedSection>
      </div>
    </section>
  );
}
