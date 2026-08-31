"use client";

import { Link } from "@/i18n/navigation";

type Props = {
  title: string;
  subtitle: string;
  tryLabel: string;
  plansLabel: string;
};

export default function HomeCloseSection({ title, subtitle, tryLabel, plansLabel }: Props) {
  const scrollToDemo = () => {
    const section = document.getElementById("ai-demo-walkthrough");
    section?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => {
      document.getElementById("ai-demo-run")?.focus();
    }, 450);
  };

  return (
    <section className="pb-section pt-4 sm:pb-section-lg">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-3xl bg-navy-gradient px-8 py-16 text-center shadow-glow-panel sm:px-12 sm:py-20">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(44rem_22rem_at_50%_-6rem,rgba(56,189,248,0.2),transparent_70%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(28rem_18rem_at_100%_100%,rgba(20,184,166,0.08),transparent_65%)]" />
            <div
              className="absolute inset-0 opacity-[0.35]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
                backgroundSize: "56px 56px",
              }}
            />
          </div>
          <h2 className="relative font-display text-display text-white text-balance">{title}</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-body-lg text-white/75">{subtitle}</p>
          <div className="relative mt-10 flex flex-wrap justify-center gap-4">
            <button
              type="button"
              onClick={scrollToDemo}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-navy shadow-cardHover transition-all duration-200 ease-cinema hover:bg-cyan-soft active:translate-y-px cursor-pointer"
            >
              {tryLabel}
            </button>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 ease-cinema hover:border-white/40 hover:bg-white/10 active:translate-y-px cursor-pointer"
            >
              {plansLabel}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
