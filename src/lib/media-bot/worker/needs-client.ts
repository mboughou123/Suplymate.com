import type { MediaNeedsResult } from "../needs";
import type { MediaTarget } from "../manifest";

const PAGE = 500;

/** Every page of GET /api/admin/import/media-needs for one industry. */
export async function fetchMediaNeeds(opts: {
  baseUrl: string;
  secret: string;
  industry: string;
  target?: MediaTarget | null;
  fetchImpl?: typeof fetch;
}): Promise<MediaNeedsResult & { generatedAt: string }> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const base = `${opts.baseUrl.replace(/\/+$/, "")}/api/admin/import/media-needs`;
  let offset = 0;
  let first: (MediaNeedsResult & { generatedAt: string }) | null = null;
  for (;;) {
    const q = new URLSearchParams({ industry: opts.industry, offset: String(offset), limit: String(PAGE) });
    if (opts.target) q.set("target", opts.target);
    const res = await fetchImpl(`${base}?${q}`, { headers: { authorization: `Bearer ${opts.secret}` } });
    if (!res.ok) throw new Error(`media-needs ${opts.industry}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
    const page = (await res.json()) as MediaNeedsResult & { generatedAt: string };
    if (!first) first = page;
    else first.items.push(...page.items);
    offset += page.items.length;
    if (page.items.length < PAGE || offset >= page.total) break;
  }
  return { ...first, offset: 0, limit: first.items.length };
}
