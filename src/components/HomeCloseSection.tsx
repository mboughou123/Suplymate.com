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
    document.getElementById("ai-demo-walkthrough")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    window.setTimeout(() => document.getElementById("ai-demo-run")?.focus(), 450);
  };

  return (
    <section className="bg-base pb-section pt-4 sm:pb-section-lg">
      <div className="container-page">
        <div className="panel-glass rounded-3xl px-8 py-14 text-center sm:px-12 sm:py-16">
          <h2 className="font-display text-display text-navy text-balance">{title}</h2>
          <p className="mx-auto mt-4 max-w-xl text-body-lg text-ink-muted">{subtitle}</p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <button type="button" onClick={scrollToDemo} className="btn-accent px-6 py-3.5">
              {tryLabel}
            </button>
            <Link href="/pricing" className="btn-secondary px-6 py-3.5">
              {plansLabel}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
