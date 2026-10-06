import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { entitlementsFor } from "@/lib/permissions";
import { getMaterialWithPricing } from "@/lib/pricing/pricingService";
import {
  confirmationMessage,
  deliverAlertMessage,
  directionFor,
  isAlertChannel,
  isChannelConfigured,
  isTriggered,
  normalizeContact,
  triggeredMessage,
} from "@/lib/price-alerts";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const alerts = await prisma.priceAlert.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ alerts });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const materialId = typeof body.materialId === "string" ? body.materialId : "";
    const targetPrice = Number(body.targetPrice);
    const notifyType = body.notifyType;

    if (!materialId || !(targetPrice > 0) || !isAlertChannel(notifyType)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true, email: true, phone: true },
    });
    const ent = entitlementsFor({ plan: user?.plan, email: user?.email ?? session.user.email });
    if (!ent.priceAlerts) {
      return NextResponse.json(
        { error: "Price alerts require a Basic, Pro or Enterprise plan." },
        { status: 403 }
      );
    }

    const fallback = notifyType === "Email" ? user?.email : user?.phone;
    const rawContact = typeof body.contact === "string" && body.contact.trim() ? body.contact : fallback;
    const contact = normalizeContact(notifyType, rawContact);
    if (!contact) {
      return NextResponse.json(
        {
          error:
            notifyType === "SMS"
              ? "Enter a mobile number with country code, e.g. +212 6 12 34 56 78."
              : "Enter a valid email address.",
        },
        { status: 400 }
      );
    }

    const material = await getMaterialWithPricing(materialId);
    if (!material) {
      return NextResponse.json({ error: "Unknown material" }, { status: 400 });
    }

    if (!isChannelConfigured(notifyType)) {
      console.warn(`[price-alerts] ${notifyType} delivery is not configured — alert not created.`);
      return NextResponse.json(
        { error: `${notifyType} alerts are not available yet. Try ${notifyType === "SMS" ? "email" : "SMS"} instead.` },
        { status: 503 }
      );
    }

    const direction = directionFor(material.currentPrice, targetPrice);
    const reached = isTriggered(direction, material.currentPrice, targetPrice);
    const message = reached
      ? triggeredMessage(material, targetPrice)
      : confirmationMessage(material, targetPrice, direction);

    const delivery = await deliverAlertMessage(notifyType, contact, message);
    if (!delivery.sent) {
      return NextResponse.json(
        {
          error:
            delivery.reason === "invalid_contact"
              ? "That phone number could not receive messages. Check the country code."
              : `We could not send the ${notifyType === "SMS" ? "text message" : "email"}. Try again.`,
        },
        { status: delivery.reason === "invalid_contact" ? 400 : 502 }
      );
    }

    const alert = await prisma.priceAlert.create({
      data: {
        userId: session.user.id,
        materialId,
        targetPrice,
        notifyType,
        contact,
        direction,
        triggeredAt: reached ? new Date() : null,
      },
    });

    return NextResponse.json({ ok: true, alert, reached });
  } catch {
    return NextResponse.json({ error: "Failed to create alert" }, { status: 500 });
  }
}
