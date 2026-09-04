"use client";

import { Factory, TrendingUp, Atom, Route } from "lucide-react";
import type { AiBlock, PanelTab } from "@/components/ai-workspace/types";
import { glass } from "@/components/ai-workspace/types";
import SupplierMatchCard from "@/components/ai-workspace/blocks/SupplierMatchCard";
import PriceComparisonTable from "@/components/ai-workspace/blocks/PriceComparisonTable";
import MaterialIntelCard from "@/components/ai-workspace/blocks/MaterialIntelCard";
import SourcingPlanCard from "@/components/ai-workspace/blocks/SourcingPlanCard";

type Props = {
  blocks: AiBlock[];
  tab: PanelTab;
  onTab: (t: PanelTab) => void;
};

const TABS: { id: PanelTab; label: string; icon: typeof Factory; type: AiBlock["type"] }[] = [
  { id: "matches", label: "Supplier matches", icon: Factory, type: "supplier_matches" },
  { id: "prices", label: "Price comparison", icon: TrendingUp, type: "price_comparison" },
  { id: "materials", label: "Material intelligence", icon: Atom, type: "material_intel" },
  { id: "strategy", label: "Sourcing strategy", icon: Route, type: "sourcing_plan" },
];

export default function IntelligencePanel({ blocks, tab, onTab }: Props) {
  const has = (type: AiBlock["type"]) => blocks.some((b) => b.type === type);
  const current = TABS.find((t) => t.id === tab);
  const block = current ? blocks.find((b) => b.type === current.type) : undefined;

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03] p-1">
        {TABS.map((t) => {
          const available = has(t.type);
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onTab(t.id)}
              className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
                active ? "bg-white/10 text-white" : "text-white/55 hover:text-white"
              }`}
            >
              <t.icon className={`h-3.5 w-3.5 ${available ? "text-cyan-glow" : "text-white/30"}`} aria-hidden />
              {t.label}
              {available && !active && <span className="h-1.5 w-1.5 rounded-full bg-cyan-glow" aria-hidden />}
            </button>
          );
        })}
      </div>

      <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {!block ? (
          <div className={`${glass} flex h-48 flex-col items-center justify-center p-6 text-center`}>
            {current && <current.icon className="h-6 w-6 text-white/30" aria-hidden />}
            <p className="mt-3 text-sm text-white/60">
              {tab === "matches" && "Ask for suppliers — e.g. “Find aluminum suppliers in California” — and matches appear here with scores and reasons."}
              {tab === "prices" && "Ask about prices — e.g. “Compare steel and aluminum prices” — to see a comparison table with sources."}
              {tab === "materials" && "Ask about a material — e.g. “6061 vs 7075 aluminum” — for properties, grades and alternatives."}
              {tab === "strategy" && "Ask for a plan — e.g. “I'm starting a manufacturing company” — to get an 8-step sourcing strategy."}
            </p>
          </div>
        ) : block.type === "supplier_matches" ? (
          <>
            <p className="px-1 text-[11px] text-white/45">
              {block.matches.length} shortlisted from {block.totalConsidered} listed suppliers · scores use only data Suplymate holds
            </p>
            {block.matches.map((m, i) => (
              <SupplierMatchCard key={m.supplier.id} match={m} rank={i + 1} />
            ))}
          </>
        ) : block.type === "price_comparison" ? (
          <PriceComparisonTable rows={block.rows} />
        ) : block.type === "material_intel" ? (
          block.materials.map((m) => <MaterialIntelCard key={m.id} material={m} />)
        ) : (
          <SourcingPlanCard steps={block.steps} />
        )}
      </div>
    </div>
  );
}
