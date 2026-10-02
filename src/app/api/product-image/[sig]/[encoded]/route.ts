import { NextResponse } from "next/server";
import { fetchRemoteImage, RASTER_MIME } from "@/lib/media-fetch";
import { fullSizeCandidates, verifyProxiedImage } from "@/lib/remote-product-image";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sig: string; encoded: string }> },
) {
  const { sig, encoded } = await params;
  const url = verifyProxiedImage(sig, encoded);
  if (!url) return new NextResponse("Not found", { status: 404 });

  for (const candidate of fullSizeCandidates(url)) {
    const result = await fetchRemoteImage(candidate);
    if (!result.ok || !RASTER_MIME.has(result.contentType)) continue;
    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": result.contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  return new NextResponse("Image unavailable", {
    status: 404,
    headers: { "Cache-Control": "public, s-maxage=3600" },
  });
}
