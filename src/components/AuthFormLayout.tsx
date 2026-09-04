"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft, Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import AiOrb from "@/components/fx/AiOrb";

type AuthFormLayoutProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export default function AuthFormLayout({
  title,
  subtitle,
  children,
  footer,
}: AuthFormLayoutProps) {
  const nav = useTranslations("navigation");
  const t = useTranslations("authentication");

  return (
    <div className="grid min-h-screen bg-[#F7F8FA] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Cinematic side panel */}
      <aside className="relative hidden overflow-hidden bg-[#050B12] text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 -top-32 h-[32rem] w-[32rem] rounded-full bg-cyan/20 blur-[120px] motion-safe:animate-aurora-drift" />
          <div className="absolute -bottom-40 right-0 h-[28rem] w-[28rem] rounded-full bg-[#0EA5E9]/10 blur-[110px]" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
            }}
          />
        </div>

        <Link href="/" className="relative z-10 inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t("backHome")}
        </Link>

        <div className="relative z-10">
          <div className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
            <AiOrb state="breathing" size={64} theme="dark" />
          </div>
          <p className="eyebrow text-cyan-glow">{t("sideEyebrow")}</p>
          <h2 className="mt-3 font-display text-4xl font-bold leading-[1.05] tracking-tight text-white xl:text-5xl">
            {t("sideTitle")}
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-white/65">{t("sideBody")}</p>
          <ul className="mt-8 space-y-3">
            {[t("sidePoint1"), t("sidePoint2"), t("sidePoint3")].map((point) => (
              <li key={point} className="flex items-center gap-3 text-sm text-white/80">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cyan-glow/40 bg-cyan/20 text-cyan-glow">
                  <Check className="h-3.5 w-3.5" aria-hidden />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/40">© {new Date().getFullYear()} Suplymate</p>
      </aside>

      {/* Form column */}
      <div className="flex flex-col">
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10 sm:px-8">
          <Link href="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy text-base font-bold text-white">
              S
            </span>
            <span className="font-display text-2xl font-bold text-ink">
              {nav("brandSuply")}
              <span className="gradient-text">{nav("brandMate")}</span>
            </span>
          </Link>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-[1.75rem]">
              {title}
            </h1>
            <p className="mt-2 text-sm text-ink-muted">{subtitle}</p>
            <div className="mt-6">{children}</div>
            {footer && (
              <div className="mt-6 border-t border-slate-200 pt-6 text-center text-sm text-ink-muted">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
