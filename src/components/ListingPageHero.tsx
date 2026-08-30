import type { ReactNode } from "react";

type ListingStat = {
  value: string | number;
  label: string;
};

type ListingPageHeroProps = {
  badge?: ReactNode;
  title: string;
  subtitle: string;
  stats?: ListingStat[];
};

/** Shared navy hero band for marketplace listing routes. */
export default function ListingPageHero({
  badge,
  title,
  subtitle,
  stats,
}: ListingPageHeroProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-navy-dark via-navy to-navy-mid py-14 sm:py-16 text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 ai-grid-bg opacity-[0.07]" />
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan/15 blur-3xl" />
        <div className="absolute -bottom-16 left-1/4 h-48 w-48 rounded-full bg-teal/10 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {badge}
        <h1 className="mt-3 max-w-3xl font-display text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-display text-balance">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-body-lg text-white/75">{subtitle}</p>
        {stats && stats.length > 0 && (
          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-5">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dd className="font-display text-2xl font-bold tabular-nums text-white sm:text-3xl">
                  {stat.value}
                </dd>
                <dt className="mt-0.5 text-sm text-white/60">{stat.label}</dt>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}
