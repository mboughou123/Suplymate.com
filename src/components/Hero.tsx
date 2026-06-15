"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Search,
  Sparkles,
  Factory,
  Package,
  BadgeCheck,
  TrendingDown,
  ShieldCheck,
  Bot,
} from "lucide-react";
import HeroCard from "@/components/HeroCard";
import TrustBadge from "@/components/TrustBadge";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Futuristic background: grid + animated gradient blobs + glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 ai-grid-bg opacity-[0.6]" />
        <div className="absolute -left-24 top-0 h-[28rem] w-[28rem] rounded-full bg-cyan/20 blur-3xl animate-aurora-drift" />
        <div
          className="absolute right-[-6rem] top-24 h-[26rem] w-[26rem] rounded-full bg-teal/20 blur-3xl animate-aurora-drift"
          style={{ animationDelay: "-6s" }}
        />
        <div
          className="absolute left-1/3 bottom-[-8rem] h-[24rem] w-[24rem] rounded-full bg-mustard/10 blur-3xl animate-aurora-drift"
          style={{ animationDelay: "-11s" }}
        />
        {/* floating accent dots */}
        <div className="absolute left-[8%] top-24 h-3 w-3 rounded-full bg-cyan/80 shadow-glow animate-float" />
        <div
          className="absolute right-[44%] top-16 h-2 w-2 rounded-full bg-teal shadow-glow animate-float"
          style={{ animationDelay: "-2s" }}
        />
        <div
          className="absolute left-[46%] bottom-20 h-1.5 w-1.5 rounded-full bg-mustard animate-float"
          style={{ animationDelay: "-4s" }}
        />
      </div>

      <div className="relative container-page py-20 sm:py-24 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-10">
          {/* Left: copy + CTAs */}
          <div className="max-w-xl text-center lg:text-left">
            <span className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-cyan/30 bg-cyan/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-cyan">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              AI + human sourcing experts
            </span>

            <h1
              className="mt-6 animate-fade-up font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl text-balance"
              style={{ animationDelay: "80ms" }}
            >
              Your <span className="gradient-text">AI-powered</span> business
              sourcing partner
            </h1>

            <p
              className="mx-auto mt-6 max-w-xl animate-fade-up text-lg leading-relaxed text-ink-muted lg:mx-0"
              style={{ animationDelay: "160ms" }}
            >
              Find verified suppliers, compare products, track market prices, and
              source smarter with AI-powered procurement tools and real human
              expertise.
            </p>

            <div
              className="mt-9 flex animate-fade-up flex-wrap justify-center gap-4 lg:justify-start"
              style={{ animationDelay: "240ms" }}
            >
              <Link href="/suppliers" className="btn-primary px-6 py-3.5">
                <Search className="h-4 w-4" aria-hidden />
                Find Suppliers
              </Link>
              <Link href="/products" className="btn-ghost px-6 py-3.5">
                <Package className="h-4 w-4" aria-hidden />
                Explore Products
              </Link>
            </div>

            <div
              className="mt-9 flex animate-fade-up flex-wrap items-center justify-center gap-2.5 lg:justify-start"
              style={{ animationDelay: "320ms" }}
            >
              <TrustBadge icon={BadgeCheck} label="Verified network" />
              <TrustBadge icon={Bot} label="AI matching" />
              <TrustBadge icon={ShieldCheck} label="Procurement support" />
            </div>
          </div>

          {/* Right: hero image + floating cards */}
          <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
            <div className="relative animate-fade-up" style={{ animationDelay: "200ms" }}>
              {/* glow frame */}
              <div
                aria-hidden
                className="absolute -inset-4 rounded-[2rem] bg-gradient-to-tr from-cyan/30 via-teal/20 to-mustard/20 blur-2xl"
              />
              <div className="relative overflow-hidden rounded-3xl border border-white/70 shadow-cardHover ring-1 ring-black/5">
                <Image
                  src="/hero-handshake.png"
                  alt="A supplier and a business owner shaking hands on a modern factory floor"
                  width={1024}
                  height={683}
                  priority
                  className="h-full w-full object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-navy-dark/35 via-transparent to-transparent"
                />
              </div>

              {/* Floating supplier card — top left */}
              <HeroCard
                className="absolute -left-4 top-8 w-56 sm:-left-8"
                icon={Factory}
                iconGradient="from-navy to-cyan"
                title="Atlas Steel Co."
                subtitle="Metal supplier · Verified"
                floatDelay={0}
                trailing={
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    <BadgeCheck className="h-3 w-3" aria-hidden />
                    94
                  </span>
                }
              />

              {/* Floating price card — bottom right */}
              <HeroCard
                className="absolute -right-3 bottom-10 w-52 sm:-right-6"
                icon={TrendingDown}
                iconGradient="from-emerald to-teal"
                title="Steel · −8.2%"
                subtitle="Good time to buy"
                floatDelay={1.4}
              />

              {/* Floating AI card — bottom left */}
              <HeroCard
                className="absolute -bottom-5 left-6 hidden w-48 sm:flex"
                icon={Sparkles}
                iconGradient="from-cyan to-ai-glow"
                title="AI match found"
                subtitle="3 suppliers · ≤2h reply"
                floatDelay={2.6}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
