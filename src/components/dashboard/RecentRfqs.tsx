import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ChevronRight, FileText, Package } from "lucide-react";
import DashboardCard from "./DashboardCard";
import StatusPill, { type StatusTone } from "./StatusPill";
import type { Count, RecentRfq, RfqStatus } from "./types";

type Props = {
  rfqs: RecentRfq[];
  totalCount: Count;
  locale: string;
};

const STATUS_TONE: Record<RfqStatus, StatusTone> = {
  open: "neutral",
  submitted: "info",
  quoted: "accent",
  closed: "success",
  expired: "muted",
  cancelled: "muted",
};

function formatDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(
      new Date(iso),
    );
  } catch {
    return new Date(iso).toLocaleDateString();
  }
}

export default async function RecentRfqs({ rfqs, totalCount, locale }: Props) {
  const t = await getTranslations("dashboard");

  return (
    <DashboardCard
      title={t("recentRfqsTitle")}
      description={
        totalCount === null
          ? t("unavailable")
          : t("recentRfqsDescription", { count: totalCount })
      }
      icon={FileText}
      action={rfqs.length > 0 ? { label: t("viewAllRfqs"), href: "/rfqs" } : undefined}
    >
      {rfqs.length > 0 ? (
        <ul className="-mx-2 divide-y divide-slate-100">
          {rfqs.map((rfq) => (
            <li key={rfq.id}>
              <Link
                href={`/rfqs/${rfq.id}`}
                className="group flex items-center gap-4 rounded-xl px-2 py-3 transition hover:bg-slate-50/80"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-ink-dim transition group-hover:border-cyan/30 group-hover:text-cyan">
                  <Package className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-ink">{rfq.productName}</p>
                    <StatusPill tone={STATUS_TONE[rfq.status]}>
                      {t(`rfqStatus.${rfq.status}`)}
                    </StatusPill>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-ink-muted">
                    {rfq.supplierName ?? t("anySupplier")}
                    <span className="text-ink-dim"> · {rfq.quantity}</span>
                    {rfq.quoteCount > 0 && (
                      <span className="text-cyan">
                        {" "}
                        · {t("quotesReceived", { count: rfq.quoteCount })}
                      </span>
                    )}
                  </p>
                </div>
                <div className="hidden shrink-0 text-right sm:block">
                  <p className="font-mono text-[11px] text-ink-dim">
                    {rfq.publicRef ?? rfq.id.slice(0, 8)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-dim">
                    {formatDate(rfq.createdAt, locale)}
                  </p>
                </div>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-ink-dim transition group-hover:translate-x-0.5 group-hover:text-cyan"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan/15 bg-white text-cyan shadow-card">
            <FileText className="h-5 w-5" aria-hidden />
          </span>
          <p className="mt-4 font-display text-heading-sm text-ink">{t("noRfqsTitle")}</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-muted">{t("noRfqsBody")}</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link href="/products" className="btn-accent px-4 py-2.5">
              {t("browseProducts")}
            </Link>
            <Link href="/suppliers" className="btn-secondary px-4 py-2.5">
              {t("findSuppliers")}
            </Link>
          </div>
        </div>
      )}
    </DashboardCard>
  );
}
