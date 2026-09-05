import { Link } from "@/i18n/navigation";
import { ArrowRight, type LucideIcon } from "lucide-react";

type Props = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: { label: string; href: string };
  children: React.ReactNode;
  className?: string;
  /** Use <aside> instead of <section>. */
  as?: "section" | "aside";
};

/** Light glass card with the shared eyebrow-style header used across the dashboard. */
export default function DashboardCard({
  title,
  description,
  icon: Icon,
  action,
  children,
  className = "",
  as = "section",
}: Props) {
  const Tag = as;
  return (
    <Tag className={`panel-glass p-5 sm:p-6 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan/15 bg-cyan-soft text-cyan">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="font-display text-heading-sm text-ink">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-ink-dim">{description}</p>}
          </div>
        </div>
        {action && (
          <Link
            href={action.href}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-cyan transition hover:text-navy"
          >
            {action.label}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        )}
      </div>
      <div className="mt-5">{children}</div>
    </Tag>
  );
}
