import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Binoculars, Columns3, LineChart } from "lucide-react";
import {
  HOME_PRODUCT_MODULE_LINKS,
  type HomeProductModuleKey,
} from "@/lib/home-product-module-links";

const MODULES: {
  key: HomeProductModuleKey;
  icon: typeof Binoculars;
  href: (typeof HOME_PRODUCT_MODULE_LINKS)[HomeProductModuleKey];
  preview: "scout" | "compare" | "watch";
}[] = [
  {
    key: "scout",
    icon: Binoculars,
    href: HOME_PRODUCT_MODULE_LINKS.scout,
    preview: "scout",
  },
  {
    key: "compare",
    icon: Columns3,
    href: HOME_PRODUCT_MODULE_LINKS.compare,
    preview: "compare",
  },
  {
    key: "watch",
    icon: LineChart,
    href: HOME_PRODUCT_MODULE_LINKS.watch,
    preview: "watch",
  },
];

function ScoutPreview() {
  return (
    <div aria-hidden className="space-y-2 p-4">
      {["Al Gharbia Pipe Co.", "Ispat Alloys & Tube", "AJ STEEL - ICAD2"].map((name, i) => (
        <div
          key={name}
          className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-white px-3 py-2 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan" />
            <span className="text-[10px] font-medium text-ink">{name}</span>
          </div>
          {i === 0 && (
            <span className="rounded-full bg-cyan/10 px-2 py-0.5 text-[9px] font-semibold text-cyan">
              Verified
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function ComparePreview() {
  return (
    <div aria-hidden className="grid grid-cols-3 gap-1.5 p-4">
      {[
        { p: "$14.20", l: "12d" },
        { p: "$13.40", l: "14d" },
        { p: "$15.10", l: "10d" },
      ].map((col) => (
        <div
          key={col.p}
          className="rounded-lg border border-slate-200/80 bg-white p-2 text-center shadow-sm"
        >
          <p className="text-[10px] font-bold tabular-nums text-cyan">{col.p}</p>
          <p className="mt-1 text-[9px] text-ink-dim">MOQ 270m</p>
          <p className="text-[9px] font-medium text-ink-muted">{col.l} lead</p>
        </div>
      ))}
    </div>
  );
}

function WatchPreview() {
  return (
    <div aria-hidden className="space-y-2 p-4">
      <div className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-white px-3 py-2 shadow-sm">
        <span className="text-[10px] font-medium text-ink">HDPE Index</span>
        <span className="rounded-full bg-cyan/10 px-2 py-0.5 text-[9px] font-semibold text-cyan">
          −2.1%
        </span>
      </div>
      <div className="flex gap-2">
        <span className="rounded-full border border-cyan/25 bg-cyan/5 px-2 py-1 text-[9px] font-semibold text-cyan">
          Wait window
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] text-ink-dim">
          Monitor
        </span>
      </div>
    </div>
  );
}

const PREVIEWS = {
  scout: ScoutPreview,
  compare: ComparePreview,
  watch: WatchPreview,
};

export default async function HomeProductModules() {
  const t = await getTranslations("homeModules");

  return (
    <section className="border-b border-slate-100/80 bg-base section-y-tight" aria-labelledby="modules-heading">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="modules-heading" className="font-display text-display text-ink text-balance">
            {t("title")}
          </h2>
          <p className="mt-4 text-body-lg text-ink-muted">{t("subtitle")}</p>
        </div>

        <div className="mt-block-lg grid gap-6 md:grid-cols-3">
          {MODULES.map(({ key, icon: Icon, href, preview }) => {
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
                  <h3 className="mt-4 font-display text-heading-sm text-ink">{t(`${key}Title`)}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">
                    {t(`${key}Description`)}
                  </p>
                  <Link
                    href={href}
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan transition hover:gap-2.5"
                  >
                    {t("readMore")}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
