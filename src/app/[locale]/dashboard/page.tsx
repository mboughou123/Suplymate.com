import { localeRedirect } from "@/i18n/redirect";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMaterialsFromDb, getSuppliersFromDb } from "@/lib/data-service";
import DashboardClient from "@/components/dashboard/DashboardClient";
import { completeLocalizedMetadata } from "@/lib/page-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard" });
  const meta = await getTranslations({ locale, namespace: "metadata" });
  return completeLocalizedMetadata({
    locale,
    pathname: "/dashboard",
    title: meta("titleTemplate", { title: t("title") }),
    description: t("welcomeSubtitle"),
    siteName: meta("siteName"),
    robots: { index: false, follow: false },
  });
}

async function safeCount<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return await localeRedirect("/login");

  const userId = session.user.id;

  const [
    alertCount,
    conversationCount,
    rfqCount,
    favoriteCount,
    unreadNotifications,
    suppliers,
    materials,
  ] = await Promise.all([
    safeCount(
      () => prisma.priceAlert.count({ where: { userId } }),
      0
    ),
    safeCount(
      () => prisma.conversation.count({ where: { buyerId: userId } }),
      0
    ),
    safeCount(() => prisma.rfq.count({ where: { buyerId: userId } }), 0),
    safeCount(
      () => prisma.favoriteSupplier.count({ where: { userId } }),
      0
    ),
    safeCount(
      () =>
        prisma.notification.count({
          where: { userId, readAt: null },
        }),
      0
    ),
    getSuppliersFromDb(),
    getMaterialsFromDb(),
  ]);

  // This counted verified suppliers, which is now always zero: the flag it read
  // was auto-granted by the importer and has been cleared. Reachable suppliers
  // is the figure a buyer can act on.
  const contactableSuppliers = suppliers.filter(
    (s) => s.phone || s.email || s.website
  ).length;

  const dbUser = await prisma.user
    .findUnique({
      where: { id: userId },
      select: { company: true, firstName: true, onboardedAt: true },
    })
    .catch(() => null);

  if (!dbUser?.onboardedAt) {
    return await localeRedirect("/onboarding");
  }

  return (
    <DashboardClient
      user={{
        name: session.user.name ?? "User",
        email: session.user.email ?? "",
        company: dbUser?.company ?? null,
        firstName: dbUser?.firstName ?? null,
      }}
      stats={{
        alertCount,
        conversationCount,
        rfqCount,
        favoriteCount,
        unreadNotifications,
        supplierCount: suppliers.length,
        contactableSuppliers,
      }}
      topSuppliers={suppliers.slice(0, 4).map((s) => ({
        id: s.id,
        name: s.name,
        location: s.country ?? s.location ?? "",
        score: s.score ?? s.reliabilityScore ?? null,
        verified: s.verified === true || s.verificationStatus === "verified",
      }))}
      materials={materials.map((m) => ({
        id: m.id,
        name: m.name,
        symbol: m.symbol,
        currentPrice: m.currentPrice,
        unit: m.unit,
        dailyChange: m.dailyChange,
        signal: m.signal,
        history: m.history,
      }))}
    />
  );
}
