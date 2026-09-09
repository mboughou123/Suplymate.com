import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  Binoculars,
  ChevronRight,
  Columns3,
  LineChart,
  Sparkles,
} from "lucide-react";
import {
  HOME_PRODUCT_MODULE_LINKS,
  type HomeProductModuleKey,
} from "@/lib/home-product-module-links";
import { ComparePreview, ScoutPreview, WatchPreview } from "./ModulePreviews";

const MODULES: {
  key: HomeProductModuleKey;
  icon: typeof Binoculars;
  href: (typeof HOME_PRODUCT_MODULE_LINKS)[HomeProductModuleKey];
  Preview: () => React.JSX.Element;
}[] = [
  { key: "scout", icon: Binoculars, href: HOME_PRODUCT_MODULE_LINKS.scout, Preview: ScoutPreview },
  { key: "compare", icon: Columns3, href: HOME_PRODUCT_MODULE_LINKS.compare, Preview: ComparePreview },
  { key: "watch", icon: LineChart, href: HOME_PRODUCT_MODULE_LINKS.watch, Preview: WatchPreview },
];

/** Faded "other agents" panels that frame the orchestrator, Keelvar-style. */
function GhostPanel({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <div
      aria-hidden
      className={`absolute hidden rounded-2xl border border-cyan/10 bg-white/50 p-5 shadow-glass backdrop-blur-sm lg:block ${className}`}
    >
      <p className="text-sm font-semibold tracking-tight text-cyan/40">
        <span className="text-cyan/60">{label.split(" ")[0]}</span>{" "}
        {label.split(" ").slice(1).join(" ")}
      </p>
      <div className="mt-4 space-y-2">
        <div className="h-2 w-3/4 rounded-full bg-slate-200/70" />
        <div className="h-2 w-1/2 rounded-full bg-slate-200/50" />
      </div>
    </div>
  );
}

/** Three connector curves from the orchestrator down to the module cards. */
function Connectors() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1200 140"
      preserveAspectRatio="none"
      className="mx-auto -mb-2 mt-2 hidden h-28 w-full text-cyan/50 md:block"
      fill="none"
    >
      <path d="M600 0 V40 C600 80 200 60 200 140" stroke="currentColor" strokeWidth="2" />
      <path d="M600 0 V140" stroke="currentColor" strokeWidth="2" />
      <path d="M600 0 V40 C600 80 1000 60 1000 140" stroke="currentColor" strokeWidth="2" />
      <circle cx="600" cy="0" r="4" fill="currentColor" />
    </svg>
  );
}

export default async function HomeOrchestratorSection() {
  const t = await getTranslations("homeOrchestrator");
  const m = await getTranslations("homeModules");

  return (
    <section
      id="ai-demo-walkthrough"
      className="relative overflow-hidden border-b border-slate-100/80 bg-base section-y-tight scroll-mt-28"
      aria-labelledby="orchestrator-heading"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[60%] bg-gradient-to-b from-cyan-soft via-white/60 to-transparent" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(3,105,161,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(3,105,161,0.08) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse at 50% 30%, black 20%, transparent 70%)",
          }}
        />
      </div>

      <div className="container-page relative">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow text-cyan">{t("eyebrow")}</p>
          <h2
            id="orchestrator-heading"
            className="mt-3 font-display text-display text-ink text-balance"
          >
            {t("title")}
          </h2>
          <p className="mt-4 text-body-lg text-ink-muted">{t("subtitle")}</p>
        </div>

        <div className="relative mx-auto mt-block-lg max-w-5xl">
          <GhostPanel label={t("ghostLeft")} className="left-0 top-4 w-56 -rotate-1" />
          <GhostPanel label={t("ghostRight")} className="right-0 top-16 w-56 rotate-1" />

          <div className="relative mx-auto max-w-2xl">
            <div className="rounded-[1.75rem] border border-cyan/15 bg-white/80 p-1.5 shadow-[0_24px_80px_-32px_rgba(3,105,161,0.35)] backdrop-blur-xl">
              <div className="rounded-[1.4rem] bg-gradient-to-b from-cyan-soft to-white px-6 pb-6 pt-8 text-center sm:px-10">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-cyan/20 bg-white text-cyan shadow-sm">
                  <Sparkles className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-heading-lg text-ink sm:text-[2rem] sm:leading-tight">
                  {t("cardTitlePrefix")}{" "}
                  <span className="gradient-text">{t("cardTitleAccent")}</span>{" "}
                  {t("cardTitleSuffix")}
                </h3>
                <Link
                  id="ai-demo-run"
                  href="/ai-assistant"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-cyan px-4 py-1.5 text-xs font-semibold text-white shadow-glow transition hover:bg-[#075985]"
                >
                  {t("learnMore")}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>

                <div className="mt-6 rounded-2xl border border-slate-200/70 bg-white p-4 text-left shadow-card">
                  <div className="space-y-3 text-sm">
                    <div className="motion-safe:animate-fade-up">
                      <p className="inline-block max-w-[85%] rounded-2xl rounded-bl-md bg-slate-100 px-3.5 py-2 font-medium text-ink">
                        {t("askWhat")}
                      </p>
                    </div>
                    <div className="flex justify-end motion-safe:animate-fade-up" style={{ animationDelay: "120ms" }}>
                      <p className="inline-block max-w-[85%] rounded-2xl rounded-br-md bg-cyan/10 px-3.5 py-2 font-medium text-ink">
                        {t("userAsk")}
                      </p>
                    </div>
                    <div className="motion-safe:animate-fade-up" style={{ animationDelay: "240ms" }}>
                      <p className="inline-block max-w-[85%] rounded-2xl rounded-bl-md bg-slate-100 px-3.5 py-2 font-medium text-ink">
                        {t("recommend")}
                      </p>
                    </div>
                    <div className="motion-safe:animate-fade-up" style={{ animationDelay: "360ms" }}>
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-cyan/25 bg-cyan-soft px-2.5 py-1 text-[11px] font-semibold text-cyan">
                        <Binoculars className="h-3 w-3" aria-hidden />
                        {t("agentChip")}
                        <ChevronRight className="h-3 w-3" aria-hidden />
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-3 rounded-full border border-slate-200 bg-white py-2 pl-4 pr-2 text-left shadow-card">
                  <p className="flex-1 truncate text-sm text-ink-muted">{t("inputHint")}</p>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan text-white">
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Connectors />

          <div className="mt-8 grid gap-6 md:mt-0 md:grid-cols-3">
            {MODULES.map(({ key, icon: Icon, href, Preview }) => (
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
                  <h3 className="mt-4 font-display text-heading-sm text-ink">{m(`${key}Title`)}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">
                    {m(`${key}Description`)}
                  </p>
                  <Link
                    href={href}
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan transition hover:gap-2.5"
                  >
                    {m("readMore")}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
