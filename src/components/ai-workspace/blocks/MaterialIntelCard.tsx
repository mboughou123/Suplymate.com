"use client";

import { Link } from "@/i18n/navigation";
import { Atom, ArrowUpRight } from "lucide-react";
import type { MaterialIntel } from "@/lib/ai/aiService";
import { glass } from "@/components/ai-workspace/types";

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">{title}</p>
      <ul className="mt-1.5 space-y-1 text-xs text-white/75">
        {items.slice(0, 4).map((i) => (
          <li key={i} className="flex gap-1.5">
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-cyan-glow" />
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function MaterialIntelCard({ material }: { material: MaterialIntel }) {
  return (
    <article className={`${glass} p-4 sm:p-5`}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan/15 text-cyan-glow">
          <Atom className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-white">{material.name}</h4>
          <p className="mt-0.5 text-xs leading-relaxed text-white/60">{material.summary}</p>
        </div>
        {material.price && (
          <div className="text-right">
            <p className="text-sm font-semibold tabular-nums text-white">
              ${material.price.price.toLocaleString(undefined, { maximumFractionDigits: material.price.price < 10 ? 3 : 0 })}
            </p>
            <p className="text-[10px] text-white/45" title={material.price.sourceLabel}>
              {material.price.unit} · {material.price.isLive ? material.price.source : "reference"}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <List title="Properties" items={material.properties} />
        <List title="Typical applications" items={material.applications} />
        <List title="Common grades" items={material.grades} />
        <List title="Price drivers" items={material.priceDrivers} />
        <div className="sm:col-span-2">
          <List title="Manufacturing considerations" items={material.manufacturingNotes} />
        </div>
      </div>

      {material.alternatives.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-white/10 pt-3 text-xs">
          <span className="text-white/45">Alternatives:</span>
          {material.alternatives.map((a) =>
            a.id ? (
              <Link
                key={a.name}
                href={`/materials?m=${a.id}`}
                className="inline-flex items-center gap-1 rounded-md border border-white/15 px-2 py-0.5 text-white/80 transition hover:border-cyan-glow/50 hover:text-cyan-glow"
              >
                {a.name} <ArrowUpRight className="h-3 w-3" aria-hidden />
              </Link>
            ) : (
              <span key={a.name} className="rounded-md border border-white/10 px-2 py-0.5 text-white/60">
                {a.name}
              </span>
            ),
          )}
        </div>
      )}
    </article>
  );
}
