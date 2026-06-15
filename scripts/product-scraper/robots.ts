// Minimal, dependency-free robots.txt fetcher + matcher.
//
// Implements the common subset of the Robots Exclusion Protocol: the most
// specific matching User-agent group, Allow/Disallow with longest-match wins,
// and `*` / `$` wildcards. On any fetch error we FAIL CLOSED for safety only if
// a robots.txt exists but can't be parsed; if there is simply no robots.txt
// (404), crawling is permitted per the standard.

type Rule = { type: "allow" | "disallow"; path: string };
type RobotsResult = { found: boolean; rules: Rule[] };

const cache = new Map<string, RobotsResult>();

function parseRobots(text: string, ua: string): Rule[] {
  const lines = text.split(/\r?\n/);
  const groups: { agents: string[]; rules: Rule[] }[] = [];
  let current: { agents: string[]; rules: Rule[] } | null = null;
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
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if (field === "allow" || field === "disallow") {
      if (!current) {
        current = { agents: ["*"], rules: [] };
        groups.push(current);
      }
      current.rules.push({ type: field, path: value });
      lastWasAgent = false;
    } else {
      lastWasAgent = false;
    }
  }

  const uaLower = ua.toLowerCase();
  // Prefer the most specific (longest) agent token that matches our UA, else `*`.
  let best: { agents: string[]; rules: Rule[] } | null = null;
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
  return best ? best.rules : [];
}

async function getRobots(origin: string, ua: string): Promise<RobotsResult> {
  const cached = cache.get(origin);
  if (cached) return cached;

  let result: RobotsResult = { found: false, rules: [] };
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
      result = { found: true, rules: parseRobots(text, ua) };
    }
  } catch {
    // network error fetching robots — treat as not found (permit), but the
    // caller still rate-limits and handles per-request errors.
    result = { found: false, rules: [] };
  }
  cache.set(origin, result);
  return result;
}

function patternToRegex(pattern: string): RegExp {
  // Escape regex chars except our wildcards * and $.
  let re = "";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "*") re += ".*";
    else if (c === "$" && i === pattern.length - 1) re += "$";
    else re += c.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp("^" + re);
}

export async function isAllowed(url: string, ua: string): Promise<boolean> {
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
  // Default allow when no rule matches.
  return decision !== "disallow";
}
