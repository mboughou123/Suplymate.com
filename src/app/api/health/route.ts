import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Lightweight health check used by the login form to distinguish "wrong
// credentials" from "database unreachable". Returns no server internals.
export async function GET() {
  try {
    await prisma.user.count();
    return NextResponse.json({ ok: true, database: "connected" });
  } catch {
    return NextResponse.json(
      { ok: false, database: "disconnected" },
      { status: 503 }
    );
  }
}
