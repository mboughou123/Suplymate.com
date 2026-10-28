export const ATTRIBUTION_STORAGE_KEY = "suplymate_attribution";

const UTM_MAX = 80;
const REFERRER_MAX = 500;
const PATH_MAX = 500;

export function cleanUtm(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/[^a-zA-Z0-9._~-]/g, "").slice(0, UTM_MAX);
  return cleaned || null;
}

export function cleanLandingPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (/[\s<>]/.test(trimmed)) return null;
  return trimmed.slice(0, PATH_MAX);
}

export function cleanReferrer(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > REFERRER_MAX) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export type Attribution = {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  referrer: string | null;
  landingPath: string | null;
};

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export function attributionFromSearch(search: string): Pick<
  Attribution,
  "utmSource" | "utmMedium" | "utmCampaign" | "utmContent"
> {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return {
    utmSource: cleanUtm(params.get("utm_source")),
    utmMedium: cleanUtm(params.get("utm_medium")),
    utmCampaign: cleanUtm(params.get("utm_campaign")),
    utmContent: cleanUtm(params.get("utm_content")),
  };
}

function parseStored(raw: string | null): Attribution | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<Attribution>;
    if (!value || typeof value !== "object") return null;
    return {
      utmSource: cleanUtm(value.utmSource),
      utmMedium: cleanUtm(value.utmMedium),
      utmCampaign: cleanUtm(value.utmCampaign),
      utmContent: cleanUtm(value.utmContent),
      referrer: cleanReferrer(value.referrer),
      landingPath: cleanLandingPath(value.landingPath),
    };
  } catch {
    return null;
  }
}

/**
 * First landing wins. A visitor who arrives on a supplier page with UTM params
 * and signs up later still carries that attribution. Later pages do not overwrite it.
 */
export function captureFirstTouch(
  storage: StorageLike,
  location: { pathname: string; search: string },
  referrer: string,
): Attribution {
  const existing = parseStored(storage.getItem(ATTRIBUTION_STORAGE_KEY));
  if (existing) return existing;

  const record: Attribution = {
    ...attributionFromSearch(location.search),
    referrer: cleanReferrer(referrer),
    landingPath: cleanLandingPath(`${location.pathname}${location.search}`),
  };
  storage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(record));
  return record;
}

export function readAttribution(storage: StorageLike | null): Attribution | null {
  if (!storage) return null;
  return parseStored(storage.getItem(ATTRIBUTION_STORAGE_KEY));
}
