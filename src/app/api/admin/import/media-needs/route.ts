import { NextResponse } from "next/server";
import { authenticatePush } from "@/lib/import/push-auth";
import { MEDIA_INDUSTRY_IDS, isMediaIndustry } from "@/lib/media-bot/industry";
import { MEDIA_TARGETS, type MediaTarget } from "@/lib/media-bot/manifest";
import { computeMediaNeeds } from "@/lib/media-bot/needs";
import { loadMediaNeedsInput } from "@/lib/media-bot/needs-loader";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/admin/import/media-needs?industry=metals&target=supplier&limit=200&offset=0
// What the media bots should collect next, per industry, with the official
// domains each image must come from. Same auth as the push endpoints.
export async function GET(request: Request) {
  const auth = await authenticatePush(request);
  if ("denied" in auth) return auth.denied;

  const url = new URL(request.url);
  const industryRaw = url.searchParams.get("industry") ?? "all";
  const industry = industryRaw === "all" ? "all" : isMediaIndustry(industryRaw) ? industryRaw : null;
  if (!industry) {
    return NextResponse.json({ error: `Unknown industry "${industryRaw}".`, industries: ["all", ...MEDIA_INDUSTRY_IDS] }, { status: 400 });
  }
  const targetRaw = url.searchParams.get("target");
  if (targetRaw && !(MEDIA_TARGETS as readonly string[]).includes(targetRaw)) {
    return NextResponse.json({ error: `Unknown target "${targetRaw}".`, targets: MEDIA_TARGETS }, { status: 400 });
  }
  const num = (k: string) => {
    const raw = url.searchParams.get(k);
    if (raw === null || raw.trim() === "") return undefined;
    const v = Number(raw);
    return Number.isFinite(v) && v >= 0 ? Math.floor(v) : undefined;
  };

  const result = computeMediaNeeds(await loadMediaNeedsInput(), {
    industry,
    target: (targetRaw as MediaTarget | null) ?? null,
    offset: num("offset"),
    limit: num("limit"),
  });
  return NextResponse.json({ generatedAt: new Date().toISOString(), industries: MEDIA_INDUSTRY_IDS, ...result });
}
