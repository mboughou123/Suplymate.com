import { getTranslations } from "next-intl/server";
import { BadgeCheck, Binoculars, Columns3, LineChart } from "lucide-react";
import { HOME_ADVANTAGES, type HomeAdvantageKey } from "@/lib/home-advantages";

const ICONS: Record<HomeAdvantageKey, typeof BadgeCheck> = {
  verifiedNetwork: BadgeCheck,
  fasterShortlists: Binoculars,
  offerCompare: Columns3,
  priceWindows: LineChart,
};

function NetworkPreview() {
  return (
    <div aria-hidden className="space-y-2 p-4">
      {[
        { name: "Al Gharbia Pipe Co.", verified: true, region: "UAE" },
        { name: "Ferrite Structural", verified: true, region: "India" },
        { name: "Foliflex Wires", verified: true, region: "India" },
      ].map((row) => (
        <div
          key={row.name}
          className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-white px-3 py-2 shadow-sm"
        >
          <div className="min-w-0">
            <p className="truncate text-[10px] font-medium text-ink">{row.name}</p>
            <p className="text-[9px] text-ink-dim">{row.region}</p>
          </div>
          {row.verified && (
            <span className="shrink-0 rounded-full bg-cyan/10 px-2 py-0.5 text-[9px] font-semibold text-cyan">
              Verified
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function ScoutPreview() {
  return (
    <div aria-hidden className="space-y-2 p-4">
      <div className="rounded-lg border border-cyan/20 bg-cyan/5 px-3 py-2">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-cyan">Scout</p>
        <p className="mt-1 text-[10px] font-medium text-ink">LSAW pipe · UAE · 12d lead</p>
      </div>
      {["Match 94%", "Match 88%", "Match 81%"].map((score, i) => (
        <div
          key={score}
          className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-white px-3 py-2 shadow-sm"
        >
          <span className="text-[10px] text-ink-muted">Supplier {i + 1}</span>
          <span className="text-[10px] font-bold tabular-nums text-navy">{score}</span>
        </div>
      ))}
    </div>
  );
}

function ComparePreview() {
  return (
    <div aria-hidden className="overflow-hidden rounded-lg border border-slate-200/80 bg-white p-3 shadow-sm mx-4 my-4">
      <div className="grid grid-cols-4 gap-1 border-b border-slate-100 pb-2 text-[8px] font-semibold uppercase tracking-wide text-ink-dim">
        <span>Offer</span>
        <span className="text-right">Price</span>
        <span className="text-right">MOQ</span>
        <span className="text-right">Lead</span>
      </div>
      {[
        { o: "A", p: "$13.40", m: "270m", l: "12d", best: true },
        { o: "B", p: "$14.20", m: "500m", l: "14d", best: false },
        { o: "C", p: "$15.10", m: "300m", l: "10d", best: false },
      ].map((row) => (
        <div
          key={row.o}
          className={`grid grid-cols-4 gap-1 py-1.5 text-[9px] ${row.best ? "font-semibold text-cyan" : "text-ink-muted"}`}
        >
          <span>{row.o}</span>
          <span className="text-right tabular-nums">{row.p}</span>
          <span className="text-right">{row.m}</span>
          <span className="text-right">{row.l}</span>
        </div>
      ))}
    </div>
  );
}

function WatchPreview() {
  return (
    <div aria-hidden className="space-y-3 p-4">
      <div className="flex items-end justify-between gap-1 px-1">
        {[42, 58, 51, 47, 39, 44].map((h, i) => (
          <div
            key={i}
            className="w-full rounded-sm bg-gradient-to-t from-cyan/30 to-cyan/10"
            style={{ height: `${h}px` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border border-cyan/25 bg-cyan/5 px-2 py-1 text-[9px] font-semibold text-cyan">
          Wait window
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] text-ink-dim">
          HDPE −2.1%
        </span>
      </div>
    </div>
  );
}

const PREVIEWS = {
  network: NetworkPreview,
  scout: ScoutPreview,
  compare: ComparePreview,
  watch: WatchPreview,
};

export default async function HomeAdvantagesSection() {
  const t = await getTranslations("homeAdvantages");

  return (
    <section
      className="border-b border-slate-100/80 bg-white section-y-tight"
      aria-labelledby="advantages-heading"
    >
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-cyan">{t("eyebrow")}</p>
          <h2
            id="advantages-heading"
            className="mt-3 font-display text-display text-ink text-balance"
          >
            {t("title")}
          </h2>
          <p className="mt-4 text-body-lg text-ink-muted">{t("subtitle")}</p>
        </div>

        <div className="mt-block-lg grid gap-6 sm:grid-cols-2">
          {HOME_ADVANTAGES.map(({ key, preview }) => {
            const Icon = ICONS[key];
            const Preview = PREVIEWS[preview];
            return (
              <article
                key={key}
                className="panel-glass panel-glass-hover flex flex-col overflow-hidden"
              >
                <div className="border-b border-slate-100 bg-gradient-to-br from-cyan/5 via-white to-slate-50">
                  <Preview />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cyan/20 bg-cyan/5 text-cyan">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <h3 className="mt-4 font-display text-heading-sm text-ink">
                    {t(`${key}Title`)}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">
                    {t(`${key}Description`)}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
