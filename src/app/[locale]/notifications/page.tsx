import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { localeRedirect } from "@/i18n/redirect";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Bell } from "lucide-react";
import { completeLocalizedMetadata } from "@/lib/page-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "notifications" });
  const meta = await getTranslations({ locale, namespace: "metadata" });
  return completeLocalizedMetadata({
    locale,
    pathname: "/notifications",
    title: meta("titleTemplate", { title: t("title") }),
    description: meta("description"),
    siteName: meta("siteName"),
    robots: { index: false, follow: false },
  });
}

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) return await localeRedirect("/login?callbackUrl=/notifications");
  const t = await getTranslations("notifications");
  const settings = await getTranslations("settings");

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
        <Bell className="h-6 w-6 text-cyan" aria-hidden />
        {t("title")}
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        <Link href="/settings/preferences" className="text-cyan hover:underline">
          {settings("preferences")}
        </Link>
      </p>

      {notifications.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-ink-muted">
          {t("noNotifications")}
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`rounded-xl border p-4 ${n.readAt ? "border-slate-200 bg-white" : "border-cyan/30 bg-cyan/5"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-ink">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-xs text-ink-muted">{n.body}</p>}
                  <p className="mt-1 text-[11px] text-ink-dim">
                    {n.type} · {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                {n.link && (
                  <Link href={n.link} className="shrink-0 text-xs font-medium text-cyan hover:underline">
                    {t("title")}
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
