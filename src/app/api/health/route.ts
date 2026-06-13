import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const userCount = await prisma.user.count();
    const demo = await prisma.user.findUnique({
      where: { email: "demo@suplymate.com" },
      select: { email: true },
    });
    return NextResponse.json({
      ok: true,
      database: "connected",
      users: userCount,
      demoUser: !!demo,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json(
      {
        ok: false,
        database: "disconnected",
        error: message,
        hint:
          "On Vercel, set DATABASE_URL to your Neon POOLED connection string (host contains -pooler).",
      },
      { status: 503 }
    );
  }
}
