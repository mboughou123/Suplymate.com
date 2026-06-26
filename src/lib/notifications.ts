import { prisma } from "@/lib/prisma";
import { parsePreferences } from "@/lib/preferences";

// Create an in-app notification for a user, honoring in-app and email preferences.
// Email delivery is gated separately (not yet wired — no email provider configured).
export async function notify(opts: {
  userId: string;
  type: "message" | "rfq" | "quote" | "system" | "review" | "claim";
  title: string;
  body?: string | null;
  link?: string | null;
}): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: opts.userId },
      select: { preferences: true },
    });
    const prefs = parsePreferences(user?.preferences);
    if (!prefs.inAppNotifications) return;

    await prisma.notification.create({
      data: {
        userId: opts.userId,
        type: opts.type,
        title: opts.title,
        body: opts.body ?? null,
        link: opts.link ?? null,
      },
    });
  } catch {
    // notifications are best-effort
  }
}

// Returns whether the user has opted in to a given notification category for
// (future) email delivery.
export async function wantsEmail(
  userId: string,
  category: "priceAlerts" | "supplierMessages" | "productUpdates"
): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });
    const prefs = parsePreferences(user?.preferences);
    if (!prefs.emailNotifications) return false;
    return prefs[category] === true;
  } catch {
    return false;
  }
}
