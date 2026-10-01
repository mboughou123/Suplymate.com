import { NextResponse } from "next/server";
import { checkStrictAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ok, authenticated } = await checkStrictAdmin();
  if (!authenticated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const app = await prisma.careerApplication.findUnique({
    where: { id },
    select: { cvFile: true, cvFileName: true, cvFileType: true },
  });
  if (!app?.cvFile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const filename = (app.cvFileName ?? "cv").replace(/[^\w.\- ]+/g, "_");
  return new NextResponse(Buffer.from(app.cvFile), {
    headers: {
      "Content-Type": app.cvFileType ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
