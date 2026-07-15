import { getLocale } from "next-intl/server";
import { redirect } from "./navigation";

/** Locale-aware redirect for Server Components (next-intl v4 requires `{ href, locale }`). */
export async function localeRedirect(href: string): Promise<never> {
  const locale = await getLocale();
  redirect({ href, locale });
  throw new Error("Unreachable");
}
