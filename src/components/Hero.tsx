import Link from "next/link";
import { Search, Sparkles, TrendingUp, Factory, Bot } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* floating accent orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-[8%] top-24 h-3 w-3 rounded-full bg-cyan/80 shadow-glow animate-float" />
        <div
          className="absolute right-[14%] top-40 h-2 w-2 rounded-full bg-teal shadow-glow animate-float"
          style={{ animationDelay: "-2s" }}
        />
        <div
          className="absolute left-[40%] top-12 h-1.5 w-1.5 rounded-full bg-mustard animate-float"
          style={{ animationDelay: "-4s" }}
        />
      </div>

      <div className="relative container-page py-24 sm:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-cyan/30 bg-cyan/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-cyan">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            AI-powered procurement
          </span>

          <h1
            className="mt-6 animate-fade-up font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl text-balance"
            style={{ animationDelay: "80ms" }}
          >
            Your <span className="gradient-text">AI procurement</span> friend
          </h1>

          <p
            className="mx-auto mt-6 max-w-2xl animate-fade-up text-lg leading-relaxed text-ink-muted"
            style={{ animationDelay: "160ms" }}
          >
            Find suppliers, compare prices, track material markets, and buy at the
            right time — all in one intelligent workspace.
          </p>

          <div
            className="mt-10 flex animate-fade-up flex-wrap justify-center gap-4"
            style={{ animationDelay: "240ms" }}
          >
            <Link href="/suppliers" className="btn-primary px-6 py-3.5">
              <Search className="h-4 w-4" aria-hidden />
              Find suppliers
            </Link>
            <Link href="/ai-assistant" className="btn-ghost px-6 py-3.5">
              <Bot className="h-4 w-4" aria-hidden />
              Ask the AI
            </Link>
          </div>

          <div
            className="mt-12 flex animate-fade-up flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-ink-dim"
            style={{ animationDelay: "320ms" }}
          >
            <span className="inline-flex items-center gap-2">
              <Factory className="h-4 w-4 text-cyan" aria-hidden /> 12k+ suppliers
            </span>
            <span className="inline-flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-teal" aria-hidden /> Live market signals
            </span>
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-mustard" aria-hidden /> 48 countries
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
