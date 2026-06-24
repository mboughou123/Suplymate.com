import { prisma } from "@/lib/prisma";
import { parsePreferences } from "@/lib/preferences";

// Create an in-app notification for a user, honoring their preferences for the
// relevant category. In-app notifications are always stored; email delivery is
// gated separately (and not yet wired — no email provider configured).
export async function notify(opts: {
  userId: string;
  type: "message" | "rfq" | "quote" | "system" | "review" | "claim";
  title: string;
  body?: string | null;
  link?: string | null;
}): Promise<void> {
  try {
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
// (future) email delivery. In-app delivery is unconditional.
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
