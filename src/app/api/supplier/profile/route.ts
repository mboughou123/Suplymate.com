import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { recordAudit } from "@/lib/audit";
import {
  getOwnedSupplier,
  sanitizeOwnedInput,
  upsertOwnedSupplier,
} from "@/lib/supplier-owner";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const profile = await getOwnedSupplier(session.user.id);
  return NextResponse.json({ profile });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const input = sanitizeOwnedInput(body);
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    return NextResponse.json({ error: "Please enter a valid contact email." }, { status: 400 });
  }

  try {
    const profile = await upsertOwnedSupplier(session.user.id, input);
    await recordAudit({
      actorId: session.user.id,
      actor: session.user.email,
      action: "supplier.profile_saved",
      targetType: "SUPPLIER",
      targetId: profile.id,
    });
    return NextResponse.json({ ok: true, profile });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "Company name is required.") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Could not save your company profile. Please try again." },
      { status: 500 },
    );
  }
}
