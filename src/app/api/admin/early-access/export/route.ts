import { NextResponse } from "next/server";
import { checkStrictAdmin } from "@/lib/admin";
import { signupsToCsv } from "@/lib/early-access-csv";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { ok, authenticated } = await checkStrictAdmin();
  if (!authenticated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await prisma.earlyAccessSignup.findMany({
    orderBy: { createdAt: "desc" },
    take: 10000,
    select: {
      email: true,
      name: true,
      company: true,
      role: true,
      categories: true,
      note: true,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
      utmContent: true,
      referrer: true,
      landingPath: true,
      locale: true,
      createdAt: true,
    },
  });

  const csv = signupsToCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="early-access-signups.csv"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
