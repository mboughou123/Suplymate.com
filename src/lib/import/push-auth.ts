import { NextResponse } from "next/server";
import { adminGuard, checkAdmin } from "@/lib/admin";
import { isAuthorizedCron } from "./cron-auth";
import { GROK_BOT_ACTOR } from "./media-ingest";

export type PushAuth = { actor: string; viaSecret: boolean } | { denied: NextResponse };

/**
 * Admin session, or `Authorization: Bearer ${CRON_SECRET}` (timing-safe) —
 * the latter is how the Grok machine pushes, attributed as "grok-bot".
 */
export async function authenticatePush(request: Request): Promise<PushAuth> {
  if (isAuthorizedCron(request)) return { actor: GROK_BOT_ACTOR, viaSecret: true };
  const denied = await adminGuard();
  if (denied) return { denied };
  return { actor: (await checkAdmin()).email ?? "admin", viaSecret: false };
}
