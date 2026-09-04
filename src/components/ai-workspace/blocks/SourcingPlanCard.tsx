"use client";

import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import type { PlanStep } from "@/lib/ai/sourcing-plan";
import Beam from "@/components/fx/Beam";
import { glass } from "@/components/ai-workspace/types";

export default function SourcingPlanCard({ steps }: { steps: PlanStep[] }) {
  return (
    <Beam size="md" colorVariant="ocean" strength={0.45}>
      <section className={`${glass} p-4 sm:p-5`}>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">AI sourcing plan</p>
        <ol className="mt-3 space-y-3">
          {steps.map((s) => (
            <li key={s.n} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cyan-glow/40 bg-cyan/15 text-[11px] font-bold text-cyan-glow">
                {s.n}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">{s.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-white/65">{s.detail}</p>
                {s.action && (
                  <Link
                    href={s.action.href}
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-cyan-glow hover:underline"
                  >
                    {s.action.label} <ArrowRight className="h-3 w-3" aria-hidden />
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>
    </Beam>
  );
}
