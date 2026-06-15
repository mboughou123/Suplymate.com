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
    <section className="relative overflow-hidden bg-gradient-to-br from-navy-dark via-navy to-navy-mid py-24 text-white">
      {/* futuristic background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 ai-grid-bg opacity-[0.12]" />
        <div className="absolute left-[10%] top-10 h-72 w-72 rounded-full bg-cyan/25 blur-3xl animate-aurora-drift" />
        <div
          className="absolute right-[8%] bottom-0 h-80 w-80 rounded-full bg-teal/20 blur-3xl animate-aurora-drift"
          style={{ animationDelay: "-7s" }}
        />
      </div>

      <div className="relative container-page">
        <AnimatedSection className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-glow/30 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-glow">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            AI + human expertise
          </span>
          <h2 className="mt-5 font-display text-3xl font-bold sm:text-4xl">
            Source smarter with intelligence on your side
          </h2>
          <p className="mt-3 text-white/70">
            Suplymate blends AI-powered procurement tools with real human experts
            so you find the right supplier, at the right price, every time.
          </p>
        </AnimatedSection>

        {/* Animated stats */}
        <div className="mt-14 grid grid-cols-2 gap-6 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <AnimatedSection
              key={stat.label}
              delay={i * 0.08}
              from="scale"
              className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-xl"
            >
              <p className="font-display text-3xl font-bold text-cyan-glow sm:text-4xl">
                {stat.node}
              </p>
              <p className="mt-1 text-sm text-white/70">{stat.label}</p>
            </AnimatedSection>
          ))}
        </div>

        {/* Glowing capability cards */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((cap, i) => (
            <AnimatedSection key={cap.title} delay={(i % 3) * 0.08} from="up">
              <article className="group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all duration-300 ease-cinema hover:border-cyan-glow/40 hover:bg-white/[0.08]">
                <div
                  aria-hidden
                  className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-cyan/20 blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />
                <span className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan to-teal text-white shadow-glow">
                  <cap.icon className="h-6 w-6" strokeWidth={1.8} aria-hidden />
                </span>
                <h3 className="relative mt-5 text-lg font-semibold text-white">
                  {cap.title}
                </h3>
                <p className="relative mt-2 text-sm leading-relaxed text-white/70">
                  {cap.text}
                </p>
              </article>
            </AnimatedSection>
          ))}
        </div>

        <AnimatedSection className="mt-12 flex flex-wrap justify-center gap-4" delay={0.1}>
          <Link href="/ai-assistant" className="btn-primary px-6 py-3.5">
            <Bot className="h-4 w-4" aria-hidden />
            Try the AI assistant
          </Link>
          <Link
            href="/suppliers"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur transition-all duration-300 ease-cinema hover:border-cyan-glow/50 hover:bg-white/10"
          >
            Browse suppliers
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </AnimatedSection>
      </div>
    </section>
  );
}
