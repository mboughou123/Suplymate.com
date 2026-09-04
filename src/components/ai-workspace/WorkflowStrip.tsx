"use client";

import { WORKFLOW_STAGES, type WorkflowStageId } from "@/lib/ai/sourcing-plan";
import { Check } from "lucide-react";

export default function WorkflowStrip({ stage }: { stage: WorkflowStageId | null }) {
  const activeIdx = stage ? WORKFLOW_STAGES.findIndex((s) => s.id === stage) : -1;
  return (
    <ol className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]" aria-label="Sourcing workflow">
      {WORKFLOW_STAGES.map((s, i) => {
        const done = i < activeIdx;
        const active = i === activeIdx;
        return (
          <li key={s.id} className="flex shrink-0 items-center gap-1">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium transition-colors ${
                active
                  ? "border-cyan-glow/60 bg-cyan/20 text-cyan-glow shadow-[0_0_18px_rgba(56,189,248,0.25)]"
                  : done
                    ? "border-white/15 bg-white/5 text-white/70"
                    : "border-white/10 text-white/40"
              }`}
            >
              {done ? (
                <Check className="h-3 w-3" aria-hidden />
              ) : (
                <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-cyan-glow" : "bg-white/25"}`} />
              )}
              {s.label}
            </span>
            {i < WORKFLOW_STAGES.length - 1 && <span className="h-px w-3 bg-white/15" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
