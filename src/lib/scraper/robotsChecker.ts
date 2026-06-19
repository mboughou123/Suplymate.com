// robots.txt compliance for the supplier-website scraper.
//
// This mirrors the dependency-free matcher in
// `scripts/product-scraper/robots.ts` but lives under `src/lib` so it is
// importable from Next.js route handlers as well as scripts. It implements the
// common subset of the Robots Exclusion Protocol: most-specific matching
// User-agent group, Allow/Disallow with longest-match-wins, `*`/`$` wildcards,
// and Crawl-delay. If there is no robots.txt (404), crawling is permitted per
// the standard; the orchestrator still rate-limits every request.

import { SCRAPER_USER_AGENT } from "./types";

type Rule = { type: "allow" | "disallow"; path: string };
type RobotsResult = { found: boolean; rules: Rule[]; crawlDelay: number | null };

const cache = new Map<string, RobotsResult>();

function parseRobots(text: string, ua: string): { rules: Rule[]; crawlDelay: number | null } {
  const lines = text.split(/\r?\n/);
  const groups: { agents: string[]; rules: Rule[]; crawlDelay: number | null }[] = [];
  let current: { agents: string[]; rules: Rule[]; crawlDelay: number | null } | null = null;
  let lastWasAgent = false;

  for (const raw of lines) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (field === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [], crawlDelay: null };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if (field === "allow" || field === "disallow") {
      if (!current) {
        current = { agents: ["*"], rules: [], crawlDelay: null };
        groups.push(current);
      }
      current.rules.push({ type: field, path: value });
      lastWasAgent = false;
    } else if (field === "crawl-delay") {
      if (current) {
        const n = Number(value);
        if (Number.isFinite(n)) current.crawlDelay = n;
      }
      lastWasAgent = false;
    } else {
      lastWasAgent = false;
    }
  }

  const uaLower = ua.toLowerCase();
  let best: typeof groups[number] | null = null;
  let bestScore = -1;
  for (const g of groups) {
    for (const a of g.agents) {
      let score = -1;
      if (a === "*") score = 0;
      else if (uaLower.includes(a)) score = a.length;
      if (score > bestScore) {
        bestScore = score;
        best = g;
      }
    }
  }
  return best ? { rules: best.rules, crawlDelay: best.crawlDelay } : { rules: [], crawlDelay: null };
}

async function getRobots(origin: string, ua: string): Promise<RobotsResult> {
  const cached = cache.get(origin);
  if (cached) return cached;

  let result: RobotsResult = { found: false, rules: [], crawlDelay: null };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { "User-Agent": ua },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const text = await res.text();
      const parsed = parseRobots(text, ua);
      result = { found: true, rules: parsed.rules, crawlDelay: parsed.crawlDelay };
    }
  } catch {
    // Network error fetching robots — treat as not found (permit); the caller
    // still rate-limits and handles per-request errors.
    result = { found: false, rules: [], crawlDelay: null };
  }
  cache.set(origin, result);
  return result;
}

function patternToRegex(pattern: string): RegExp {
  let re = "";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "*") re += ".*";
    else if (c === "$" && i === pattern.length - 1) re += "$";
    else re += c.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp("^" + re);
}

/** Whether `url` is allowed for our crawler by the site's robots.txt. */
export async function isAllowed(url: string, ua: string = SCRAPER_USER_AGENT): Promise<boolean> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  const { rules } = await getRobots(u.origin, ua);
  if (!rules.length) return true;

  const path = u.pathname + u.search;
  let decision: "allow" | "disallow" | null = null;
  let bestLen = -1;
  for (const rule of rules) {
    if (rule.path === "") continue;
    if (patternToRegex(rule.path).test(path)) {
      const len = rule.path.length;
      if (len > bestLen) {
        bestLen = len;
        decision = rule.type;
      }
    }
  }
  return decision !== "disallow";
}

/** Site-declared Crawl-delay (seconds) for our UA, or null when unspecified. */
export async function crawlDelaySeconds(
  url: string,
  ua: string = SCRAPER_USER_AGENT
): Promise<number | null> {
  try {
    const origin = new URL(url).origin;
    const { crawlDelay } = await getRobots(origin, ua);
    return crawlDelay;
  } catch {
    return null;
  }
}
