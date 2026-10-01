import { prisma } from "@/lib/prisma";
import { escapeHtml, isMailerConfigured, sendMail } from "@/lib/mailer";
import { isSmsConfigured, normalizePhone, sendSms } from "@/lib/sms";
import { getMaterialsWithPricing } from "@/lib/pricing/pricingService";
import { siteUrl } from "@/lib/stripe";

export type AlertChannel = "Email" | "SMS";
export type AlertDirection = "below" | "above";

export type AlertMaterial = { id: string; name: string; currentPrice: number; unit: string };

export type DeliveryResult =
  | { sent: true }
  | { sent: false; reason: "not_configured" | "invalid_contact" | "provider_error" };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isAlertChannel(value: unknown): value is AlertChannel {
  return value === "Email" || value === "SMS";
}

export function isChannelConfigured(channel: AlertChannel): boolean {
  switch (channel) {
    case "Email":
      return isMailerConfigured();
    case "SMS":
      return isSmsConfigured();
    default: {
      const never: never = channel;
      return never;
    }
  }
}

/** Validated, normalised contact for a channel, or null when unusable. */
export function normalizeContact(channel: AlertChannel, raw: string | null | undefined): string | null {
  const value = raw?.trim() ?? "";
  if (!value) return null;
  switch (channel) {
    case "Email":
      return EMAIL_RE.test(value) ? value.toLowerCase() : null;
    case "SMS":
      return normalizePhone(value);
    default: {
      const never: never = channel;
      return never;
    }
  }
}

/** Which way the price must move to reach the target, from where it is now. */
export function directionFor(currentPrice: number, targetPrice: number): AlertDirection {
  return targetPrice > currentPrice ? "above" : "below";
}

export function isTriggered(direction: AlertDirection, currentPrice: number, targetPrice: number): boolean {
  return direction === "above" ? currentPrice >= targetPrice : currentPrice <= targetPrice;
}

function formatPrice(price: number, unit: string): string {
  const amount = price.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return `${amount} ${unit}`;
}

type AlertMessage = { subject: string; text: string };

export function confirmationMessage(material: AlertMaterial, targetPrice: number, direction: AlertDirection): AlertMessage {
  const verb = direction === "above" ? "rises to" : "drops to";
  return {
    subject: `Price alert set: ${material.name}`,
    text:
      `Suplymate: your price alert is on. We'll message you when ${material.name} ${verb} ` +
      `${formatPrice(targetPrice, material.unit)} (now ${formatPrice(material.currentPrice, material.unit)}).`,
  };
}

export function triggeredMessage(material: AlertMaterial, targetPrice: number): AlertMessage {
  return {
    subject: `${material.name} reached your target price`,
    text:
      `Suplymate: ${material.name} is at ${formatPrice(material.currentPrice, material.unit)}, ` +
      `reaching your target of ${formatPrice(targetPrice, material.unit)}. ${siteUrl()}/materials`,
  };
}

export async function deliverAlertMessage(
  channel: AlertChannel,
  contact: string,
  message: AlertMessage,
): Promise<DeliveryResult> {
  switch (channel) {
    case "Email": {
      const res = await sendMail({
        to: contact,
        subject: message.subject,
        text: message.text,
        html: `<p>${escapeHtml(message.text)}</p>`,
      });
      return res.ok ? { sent: true } : { sent: false, reason: res.reason };
    }
    case "SMS": {
      const res = await sendSms(contact, message.text);
      if (res.ok) return { sent: true };
      return { sent: false, reason: res.reason === "invalid_number" ? "invalid_contact" : res.reason };
    }
    default: {
      const never: never = channel;
      return never;
    }
  }
}

export type AlertCheckSummary = { checked: number; triggered: number; sent: number; failed: number };

/**
 * Fire every untriggered alert whose material has reached its target. An alert
 * is marked triggered only after its message is delivered, so a provider outage
 * is retried on the next run.
 */
export async function checkPriceAlerts(): Promise<AlertCheckSummary> {
  const summary: AlertCheckSummary = { checked: 0, triggered: 0, sent: 0, failed: 0 };
  const alerts = await prisma.priceAlert.findMany({
    where: { triggeredAt: null },
    include: { user: { select: { email: true, phone: true } } },
  });
  if (alerts.length === 0) return summary;

  const materials = new Map((await getMaterialsWithPricing()).map((m) => [m.id, m]));

  for (const alert of alerts) {
    summary.checked++;
    const material = materials.get(alert.materialId);
    if (!material || !isAlertChannel(alert.notifyType)) continue;
    const direction: AlertDirection = alert.direction === "above" ? "above" : "below";
    if (!isTriggered(direction, material.currentPrice, alert.targetPrice)) continue;

    summary.triggered++;
    const fallback = alert.notifyType === "Email" ? alert.user.email : alert.user.phone;
    const contact = normalizeContact(alert.notifyType, alert.contact ?? fallback);
    if (!contact) {
      summary.failed++;
      continue;
    }

    const result = await deliverAlertMessage(alert.notifyType, contact, triggeredMessage(material, alert.targetPrice));
    if (result.sent) {
      summary.sent++;
      await prisma.priceAlert.update({ where: { id: alert.id }, data: { triggeredAt: new Date() } });
    } else {
      summary.failed++;
    }
  }
  return summary;
}
