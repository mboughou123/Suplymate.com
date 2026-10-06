import { prisma } from "@/lib/prisma";
import type { Entitlements } from "@/lib/permissions";

export type AiQuota = { limit: number | null; used: number; remaining: number | null };

export function startOfUtcMonth(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export function quotaFrom(limit: number | null, used: number): AiQuota {
  return { limit, used, remaining: limit === null ? null : Math.max(0, limit - used) };
}

/** Questions the user asked Mate since the start of the current UTC month. */
export async function countAiQuestionsThisMonth(userId: string, now: Date = new Date()): Promise<number> {
  return prisma.aiMessage
    .count({
      where: {
        role: "user",
        createdAt: { gte: startOfUtcMonth(now) },
        conversation: { userId },
      },
    })
    .catch(() => 0);
}

export async function aiQuotaFor(userId: string, entitlements: Entitlements): Promise<AiQuota> {
  const limit = entitlements.aiQuestionsPerMonth;
  if (limit === null) return quotaFrom(null, 0);
  return quotaFrom(limit, await countAiQuestionsThisMonth(userId));
}

export function aiQuotaExceededMessage(limit: number): string {
  return `You've used your ${limit} AI questions for this month. Upgrade your plan to keep asking Mate.`;
}
