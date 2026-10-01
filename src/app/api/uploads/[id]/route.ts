import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const image = await prisma.uploadedImage
    .findUnique({ where: { id }, select: { bytes: true, contentType: true } })
    .catch(() => null);
  if (!image) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(Buffer.from(image.bytes), {
    headers: {
      "Content-Type": image.contentType,
      // Each upload gets a new id, so the bytes behind a URL never change.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
