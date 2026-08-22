"use client";

import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Factory,
  BarChart3,
  TrendingUp,
  Bot,
  type LucideIcon,
} from "lucide-react";
import TiltCard from "@/components/TiltCard";

// Icons are resolved inside this Client Component from a serializable string
// key. A Lucide component (a forwardRef object) must NOT be passed as a prop
// from a Server Component — React cannot serialize functions across the
// server→client boundary, which crashes the render.
export type FeatureIconName =
  | "findSuppliers"
  | "compareProducts"
  | "trackMaterialPrices"
  | "askAiAssistant";

const FEATURE_ICONS: Record<FeatureIconName, LucideIcon> = {
  findSuppliers: Factory,
  compareProducts: BarChart3,
  trackMaterialPrices: TrendingUp,
  askAiAssistant: Bot,
};

type FeatureCardProps = {
  title: string;
  description: string;
  icon: FeatureIconName;
  href: string;
};

export default function FeatureCard({
  title,
  description,
  icon,
  href,
}: FeatureCardProps) {
  const t = useTranslations("common");
  const Icon = FEATURE_ICONS[icon];

  return (
    <TiltCard href={href} className="flex h-full flex-col p-6">
      <span className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-cyan/20 bg-cyan-soft text-cyan">
        <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
      </span>
      <h3 className="relative mt-4 text-lg font-semibold text-ink">{title}</h3>
      <p className="relative mt-2 flex-1 text-sm leading-relaxed text-ink-muted">
        {description}
      </p>
      <span className="relative mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-cyan transition-all group-hover:gap-2.5">
        {t("explore")} <ArrowRight className="h-4 w-4" aria-hidden />
      </span>
    </TiltCard>
  );
}
