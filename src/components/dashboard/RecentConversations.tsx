import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ChevronRight, MessageSquare } from "lucide-react";
import DashboardCard from "./DashboardCard";
import StatusPill, { type StatusTone } from "./StatusPill";
import type { ConversationStatus, RecentConversation } from "./types";

type Props = {
  conversations: RecentConversation[];
  locale: string;
};

const STATUS_TONE: Record<ConversationStatus, StatusTone> = {
  inquiry: "neutral",
  negotiation: "info",
  sample_sent: "accent",
  order_in_progress: "warning",
  completed: "success",
};

function formatRelative(iso: string, locale: string): string {
  const then = new Date(iso).getTime();
  const diffMs = then - Date.now();
  const abs = Math.abs(diffMs);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    if (abs < hour) return rtf.format(Math.round(diffMs / minute), "minute");
    if (abs < day) return rtf.format(Math.round(diffMs / hour), "hour");
    if (abs < 30 * day) return rtf.format(Math.round(diffMs / day), "day");
    return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(then);
  } catch {
    return new Date(iso).toLocaleDateString();
  }
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "S"
  );
}

export default async function RecentConversations({ conversations, locale }: Props) {
  const t = await getTranslations("dashboard");

  return (
    <DashboardCard
      title={t("recentConversationsTitle")}
      description={t("recentConversationsDescription")}
      icon={MessageSquare}
      action={
        conversations.length > 0 ? { label: t("openInbox"), href: "/messages" } : undefined
      }
    >
      {conversations.length > 0 ? (
        <ul className="-mx-2 divide-y divide-slate-100">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link
                href={`/messages?c=${c.id}`}
                className="group flex items-center gap-4 rounded-xl px-2 py-3 transition hover:bg-slate-50/80"
              >
                <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy text-xs font-bold text-white">
                  {initials(c.supplierName)}
                  {c.unread && (
                    <span
                      className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-cyan-glow ring-2 ring-white"
                      aria-label={t("unreadBadge")}
                    />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={`truncate text-sm ${
                        c.unread ? "font-semibold text-ink" : "font-medium text-ink"
                      }`}
                    >
                      {c.supplierName}
                    </p>
                    <StatusPill tone={STATUS_TONE[c.status]}>
                      {t(`conversationStatus.${c.status}`)}
                    </StatusPill>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-ink-muted">
                    {c.subject ?? t("noSubject")}
                  </p>
                </div>
                <p className="hidden shrink-0 text-[11px] text-ink-dim sm:block">
                  {formatRelative(c.lastMessageAt, locale)}
                </p>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-ink-dim transition group-hover:translate-x-0.5 group-hover:text-cyan"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink">{t("noConversationsTitle")}</p>
            <p className="mt-1 text-xs text-ink-muted">{t("noConversationsBody")}</p>
          </div>
          <Link href="/suppliers" className="btn-secondary px-4 py-2 text-xs">
            {t("findSuppliers")}
          </Link>
        </div>
      )}
    </DashboardCard>
  );
}
