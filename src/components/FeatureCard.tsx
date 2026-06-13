import { ArrowRight, type LucideIcon } from "lucide-react";
import TiltCard from "@/components/TiltCard";

type FeatureCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
};

export default function FeatureCard({
  title,
  description,
  icon: Icon,
  href,
}: FeatureCardProps) {
  return (
    <TiltCard href={href} className="flex h-full flex-col p-6">
      <span className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-cyan/20 bg-gradient-to-br from-cyan/10 to-teal/10 text-cyan transition-transform duration-300 group-hover:scale-110">
        <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
      </span>
      <h3 className="relative mt-4 text-lg font-semibold text-ink">{title}</h3>
      <p className="relative mt-2 flex-1 text-sm leading-relaxed text-ink-muted">
        {description}
      </p>
      <span className="relative mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-cyan transition-all group-hover:gap-2.5">
        Explore <ArrowRight className="h-4 w-4" aria-hidden />
      </span>
    </TiltCard>
  );
}
