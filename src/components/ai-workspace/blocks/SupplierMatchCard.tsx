"use client";

import { Link } from "@/i18n/navigation";
import { BadgeCheck, MapPin, ArrowUpRight, MessageCircle, AlertCircle } from "lucide-react";
import type { SupplierMatch } from "@/lib/ai/supplier-matching";
import MatchScoreBars from "@/components/ai-workspace/MatchScoreBars";
import Beam from "@/components/fx/Beam";
import { glass } from "@/components/ai-workspace/types";

export default function SupplierMatchCard({ match, rank }: { match: SupplierMatch; rank: number }) {
  const s = match.supplier;
  const card = (
    <article className={`${glass} p-4 sm:p-5`}>
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5 text-sm font-bold text-white/80">
          {s.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.logoUrl} alt="" className="h-full w-full object-contain" />
          ) : (
            s.name.slice(0, 2).toUpperCase()
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-sm font-semibold text-white">{s.name}</h4>
            {s.verified ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                <BadgeCheck className="h-3 w-3" aria-hidden /> Verified
              </span>
            ) : (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/55">
                Listed
              </span>
            )}
          </div>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-white/55">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden />
            {s.country ?? s.location}
            {s.category ? ` · ${s.category}` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-bold tabular-nums leading-none text-white">
            {match.overall}
            <span className="text-sm text-white/50">%</span>
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-white/45">#{rank} match</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr]">
        <MatchScoreBars breakdown={match.breakdown} compact />
        <div className="space-y-1.5 text-xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Why</p>
          <ul className="space-y-1 text-white/75">
            {match.reasons.slice(0, 3).map((r) => (
              <li key={r} className="flex gap-1.5">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-cyan-glow" />
                {r}
              </li>
            ))}
          </ul>
          {match.gaps.length > 0 && (
            <p className="flex items-start gap-1.5 pt-1 text-amber-200/80">
              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
              {match.gaps[0]}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3 text-xs">
        {s.moq && s.moq !== "Contact supplier" && <span className="text-white/60">MOQ {s.moq}</span>}
        <span className="ml-auto flex gap-2">
          <Link
            href={`/supplier/${s.id}`}
            className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 font-medium text-white/85 transition hover:bg-white/10"
          >
            Profile <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
          <Link
            href={`/supplier/${s.id}#contact`}
            className="inline-flex items-center gap-1 rounded-lg bg-cyan px-3 py-1.5 font-semibold text-white transition hover:bg-cyan-glow hover:text-navy-deep"
          >
            <MessageCircle className="h-3.5 w-3.5" aria-hidden /> Contact
          </Link>
        </span>
      </div>
    </article>
  );

  return rank === 1 ? (
    <Beam size="md" colorVariant="ocean" strength={0.55}>
      {card}
    </Beam>
  ) : (
    card
  );
}
