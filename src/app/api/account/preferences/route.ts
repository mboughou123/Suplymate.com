import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  parsePreferences,
  serializePreferences,
  SUPPORTED_LANGUAGES,
  type UserPreferences,
} from "@/lib/preferences";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Partial<UserPreferences>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { preferences: true },
    });
    const current = parsePreferences(existing?.preferences);

    const next: UserPreferences = {
      inAppNotifications:
        typeof body.inAppNotifications === "boolean"
          ? body.inAppNotifications
          : current.inAppNotifications,
      emailNotifications:
        typeof body.emailNotifications === "boolean"
          ? body.emailNotifications
          : current.emailNotifications,
      priceAlerts:
        typeof body.priceAlerts === "boolean" ? body.priceAlerts : current.priceAlerts,
      supplierMessages:
        typeof body.supplierMessages === "boolean"
          ? body.supplierMessages
          : current.supplierMessages,
      productUpdates:
        typeof body.productUpdates === "boolean"
          ? body.productUpdates
          : current.productUpdates,
      language: SUPPORTED_LANGUAGES.some((l) => l.value === body.language)
        ? (body.language as string)
        : current.language,
    };

    await prisma.user.update({
      where: { id: session.user.id },
      data: { preferences: serializePreferences(next) },
    });

    return NextResponse.json({ ok: true, preferences: next });
  } catch {
    return NextResponse.json(
      { error: "Could not save your preferences. Please try again." },
      { status: 500 }
    );
  }
}
