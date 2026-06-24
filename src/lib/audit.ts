import { prisma } from "@/lib/prisma";

// Append-only audit trail for critical actions. Best-effort: auditing must never
// break the operation it records, so failures are swallowed.
export async function recordAudit(entry: {
  actor?: string | null;
  actorId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  detail?: unknown;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actor: entry.actor ?? null,
        actorId: entry.actorId ?? null,
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        detail:
          entry.detail === undefined
            ? null
            : typeof entry.detail === "string"
              ? entry.detail
              : JSON.stringify(entry.detail),
      },
    });
  } catch {
    // never throw from auditing
  }
}
