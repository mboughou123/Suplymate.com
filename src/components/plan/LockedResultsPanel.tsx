"use client";

import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { upgradeHref } from "@/lib/plan-gating";

type Props = {
  kind: "suppliers" | "products";
  lockedCount: number;
  limit: number;
  signedIn: boolean;
};

export default function LockedResultsPanel({ kind, lockedCount, limit, signedIn }: Props) {
  const t = useTranslations("planGate");
  if (lockedCount <= 0) return null;
  return (
    <section
      data-testid={`locked-${kind}`}
      aria-label={t(kind === "suppliers" ? "lockedSuppliersTitle" : "lockedProductsTitle", { count: lockedCount })}
      className="relative mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white"
    >
      <div aria-hidden className="grid gap-6 p-6 blur-[6px] md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-100 p-5">
            <div className="h-32 rounded-xl bg-slate-100" />
            <div className="mt-4 h-4 w-2/3 rounded bg-slate-200" />
            <div className="mt-2 h-3 w-1/2 rounded bg-slate-100" />
            <div className="mt-4 flex gap-2">
              <div className="h-6 w-16 rounded-full bg-slate-100" />
              <div className="h-6 w-20 rounded-full bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/60 p-6 backdrop-blur-[2px]">
        <div className="max-w-md text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-white">
            <Lock className="h-5 w-5" aria-hidden />
          </span>
          <p className="mt-3 font-display text-lg font-bold text-ink">
            {t(kind === "suppliers" ? "lockedSuppliersTitle" : "lockedProductsTitle", { count: lockedCount })}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {t(kind === "suppliers" ? "lockedSuppliersBody" : "lockedProductsBody", { limit })}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href={upgradeHref(signedIn)} className="btn-primary text-sm">
              {signedIn ? t("upgradeCta") : t("trialCta")}
            </Link>
            <Link href="/pricing" className="btn-secondary text-sm">
              {t("comparePlans")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
