import type { ReactNode } from "react";

type Stat = {
  value: ReactNode;
  label: string;
};

type Props = {
  eyebrow?: string;
  title: string;
  subtitle: string;
  stats?: Stat[];
};

/**
 * Shared light header for public directory pages.
 * Matches homepage rhythm (eyebrow → display heading → lede) without
 * the marketing hero scale.
 */
export default function ListingPageHeader({
  eyebrow,
  title,
  subtitle,
  stats,
}: Props) {
  return (
    <header className="relative overflow-hidden border-b border-slate-100/80 hero-ambient">
      <div className="container-page section-y-tight">
        {eyebrow ? <p className="eyebrow text-cyan">{eyebrow}</p> : null}
        <h1
          className={`font-display text-display text-balance text-navy sm:text-display-lg ${
            eyebrow ? "mt-3" : ""
          }`}
        >
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-body-lg text-ink-muted">{subtitle}</p>
        {stats && stats.length > 0 ? (
          <dl className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="glass-card px-4 py-3.5">
                <dd className="font-display text-heading-lg tabular-nums text-navy">
                  {stat.value}
                </dd>
                <dt className="mt-0.5 text-xs text-ink-muted">{stat.label}</dt>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </header>
  );
}
