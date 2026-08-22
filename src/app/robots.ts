import type { MetadataRoute } from "next";
import { defaultLocale } from "@/i18n/routing";
import { PROTECTED_PREFIXES } from "@/lib/protected-routes";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://suplymate.com"
).replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  // Routes are locale-prefixed (localePrefix: "always"), so the crawler-facing
  // paths need the locale segment that PROTECTED_PREFIXES omits.
  const privatePaths = PROTECTED_PREFIXES.map(
    (prefix) => `/${defaultLocale}${prefix}/`
  );

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...privatePaths, "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
