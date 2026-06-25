import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Bell } from "lucide-react";

export const metadata: Metadata = {
  title: "Notifications | Suplymate",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/notifications");

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
        <Bell className="h-6 w-6 text-cyan" aria-hidden />
        Notifications
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        In-app alerts for RFQs, quotes, messages, and reviews. Email delivery respects your{" "}
        <Link href="/settings/preferences" className="text-cyan hover:underline">
          preferences
        </Link>
        .
      </p>

      {notifications.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-ink-muted">
          No notifications yet.
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
                    View
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
