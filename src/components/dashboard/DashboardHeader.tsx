import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Building2, Factory, FilePlus2, Sparkles } from "lucide-react";

type Props = {
  firstName: string;
  company?: string | null;
  locale: string;
  rfqsAwaitingReview: number;
  supplierCount: number;
};

function formatToday(locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(new Date());
  } catch {
    return new Date().toDateString();
  }
}

export default async function DashboardHeader({
  firstName,
  company,
  locale,
  rfqsAwaitingReview,
  supplierCount,
}: Props) {
  const t = await getTranslations("dashboard");

  return (
    <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="eyebrow text-cyan">{t("title")}</p>
          <span aria-hidden className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />
          <p className="text-xs font-medium text-ink-dim">{formatToday(locale)}</p>
        </div>
        <h1 className="mt-3 font-display text-display text-ink text-balance">
          {t("welcome", { name: firstName })}
        </h1>
        <p className="mt-2 max-w-xl text-body text-ink-muted">
          {rfqsAwaitingReview > 0
            ? t("quotesToReview", { count: rfqsAwaitingReview })
            : t("welcomeSubtitle")}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {company && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-ink-muted shadow-card">
              <Building2 className="h-3.5 w-3.5 text-cyan" aria-hidden />
              {company}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-ink-muted shadow-card">
            <Factory className="h-3.5 w-3.5 text-cyan" aria-hidden />
            {t("totalIndexed", { count: supplierCount })}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap gap-3">
        <Link href="/products" className="btn-secondary px-4 py-2.5">
          <FilePlus2 className="h-4 w-4" aria-hidden />
          {t("newRfq")}
        </Link>
        <Link href="/ai-assistant" className="btn-primary px-4 py-2.5">
          <Sparkles className="h-4 w-4" aria-hidden />
          {t("askMate")}
        </Link>
      </div>
    </header>
  );
}
