import { localeRedirect } from "@/i18n/redirect";
import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMaterialsFromDb, getSuppliersFromDb } from "@/lib/data-service";
import { isSupplierRole } from "@/lib/roles";
import DashboardShell from "@/components/dashboard/DashboardShell";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import KpiRow from "@/components/dashboard/KpiRow";
import RecentRfqs from "@/components/dashboard/RecentRfqs";
import RecentConversations from "@/components/dashboard/RecentConversations";
import MarketTrendsSection from "@/components/dashboard/MarketTrendsSection";
import MateQuickAsk from "@/components/dashboard/MateQuickAsk";
import PriceMovers from "@/components/dashboard/PriceMovers";
import QuickLinks from "@/components/dashboard/QuickLinks";
import TopSuppliersCard from "@/components/dashboard/TopSuppliersCard";
import type {
  ConversationStatus,
  RecentConversation,
  RecentRfq,
  RfqStatus,
} from "@/components/dashboard/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard" });
  const meta = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: meta("titleTemplate", { title: t("title") }),
    description: t("welcomeSubtitle"),
  };
}

/** Run a query; `null` (not 0) when it fails so the UI can show "—". */
async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

const RFQ_STATUSES: RfqStatus[] = ["open", "submitted", "quoted", "closed", "expired", "cancelled"];
const OPEN_RFQ_STATUSES: RfqStatus[] = ["open", "submitted", "quoted"];
const CONVERSATION_STATUSES: ConversationStatus[] = [
  "inquiry",
  "negotiation",
  "sample_sent",
  "order_in_progress",
  "completed",
];

function asRfqStatus(value: string): RfqStatus {
  return (RFQ_STATUSES as string[]).includes(value) ? (value as RfqStatus) : "open";
}

function asConversationStatus(value: string): ConversationStatus {
  return (CONVERSATION_STATUSES as string[]).includes(value)
    ? (value as ConversationStatus)
    : "inquiry";
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return await localeRedirect("/login");

  const userId = session.user.id;
  const locale = await getLocale();

  const [
    alertCount,
    conversationCount,
    rfqCount,
    openRfqCount,
    favoriteCount,
    unreadNotifications,
    recentRfqRows,
    recentConversationRows,
    suppliers,
    materials,
    dbUser,
  ] = await Promise.all([
    safe(() => prisma.priceAlert.count({ where: { userId } })),
    safe(() => prisma.conversation.count({ where: { buyerId: userId } })),
    safe(() => prisma.rfq.count({ where: { buyerId: userId } })),
    safe(() =>
      prisma.rfq.count({ where: { buyerId: userId, status: { in: OPEN_RFQ_STATUSES } } }),
    ),
    safe(() => prisma.favoriteSupplier.count({ where: { userId } })),
    safe(() => prisma.notification.count({ where: { userId, readAt: null } })),
    safe(() =>
      prisma.rfq.findMany({
        where: { buyerId: userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          publicRef: true,
          productName: true,
          quantity: true,
          supplierName: true,
          status: true,
          createdAt: true,
          _count: { select: { quotes: true } },
        },
      }),
    ),
    safe(() =>
      prisma.conversation.findMany({
        where: { buyerId: userId },
        orderBy: { lastMessageAt: "desc" },
        take: 4,
        select: {
          id: true,
          supplierName: true,
          subject: true,
          status: true,
          lastMessageAt: true,
          buyerLastReadAt: true,
        },
      }),
    ),
    getSuppliersFromDb(),
    getMaterialsFromDb(),
    safe(() =>
      prisma.user.findUnique({
        where: { id: userId },
        select: { company: true, firstName: true, role: true },
      }),
    ),
  ]);

  // Suppliers have their own workspace.
  if (isSupplierRole(dbUser?.role ?? session.user.role)) {
    return await localeRedirect("/supplier-dashboard");
  }

  const verifiedSuppliers = suppliers.filter(
    (s) => s.verified === true || s.verificationStatus === "verified",
  ).length;

  const recentRfqs: RecentRfq[] = (recentRfqRows ?? []).map((r) => ({
    id: r.id,
    publicRef: r.publicRef,
    productName: r.productName,
    quantity: r.quantity,
    supplierName: r.supplierName,
    status: asRfqStatus(r.status),
    quoteCount: r._count.quotes,
    createdAt: r.createdAt.toISOString(),
  }));

  const recentConversations: RecentConversation[] = (recentConversationRows ?? []).map((c) => ({
    id: c.id,
    supplierName: c.supplierName,
    subject: c.subject,
    status: asConversationStatus(c.status),
    lastMessageAt: c.lastMessageAt.toISOString(),
    unread: !c.buyerLastReadAt || c.lastMessageAt > c.buyerLastReadAt,
  }));

  const user = {
    name: session.user.name ?? "User",
    email: session.user.email ?? "",
    company: dbUser?.company ?? null,
    firstName: dbUser?.firstName ?? null,
  };
  const firstName = user.firstName || user.name.split(" ")[0] || user.name;

  const stats = {
    alertCount,
    conversationCount,
    rfqCount,
    openRfqCount,
    favoriteCount,
    unreadNotifications,
    supplierCount: suppliers.length,
    verifiedSuppliers,
  };

  const materialSummaries = materials.map((m) => ({
    id: m.id,
    name: m.name,
    symbol: m.symbol,
    currentPrice: m.currentPrice,
    unit: m.unit,
    dailyChange: m.dailyChange,
    signal: m.signal,
    history: m.history,
  }));

  const topSuppliers = suppliers.slice(0, 4).map((s) => ({
    id: s.id,
    name: s.name,
    location: s.country ?? s.location ?? "",
    score: s.score ?? s.reliabilityScore ?? null,
    verified: s.verified === true || s.verificationStatus === "verified",
  }));

  return (
    <DashboardShell user={user} unreadNotifications={unreadNotifications ?? 0}>
      <div className="mx-auto min-w-0 max-w-[1440px] space-y-8">
        <DashboardHeader
          firstName={firstName}
          company={user.company}
          locale={locale}
          rfqsAwaitingReview={recentRfqs.filter((r) => r.status === "quoted").length}
          supplierCount={stats.supplierCount}
        />

        <KpiRow stats={stats} />

        <div className="grid min-w-0 gap-6 xl:grid-cols-12">
          <div className="min-w-0 space-y-6 xl:col-span-8">
            <RecentRfqs rfqs={recentRfqs} totalCount={rfqCount} locale={locale} />
            <RecentConversations conversations={recentConversations} locale={locale} />
            <MarketTrendsSection materials={materialSummaries} />
          </div>
          <div className="min-w-0 space-y-6 xl:col-span-4">
            <MateQuickAsk />
            <PriceMovers materials={materialSummaries} />
            <QuickLinks />
            <TopSuppliersCard suppliers={topSuppliers} />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
