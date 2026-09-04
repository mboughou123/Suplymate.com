import { getRequestConfig } from "next-intl/server";
import { hasLocale, IntlErrorCode } from "next-intl";
import { routing } from "./routing";

type Messages = Record<string, unknown>;

/** Fill any key missing from a locale with the English copy so new UI never
 * renders raw key paths while translations catch up. */
function withEnglishFallback(base: Messages, locale: Messages): Messages {
  const out: Messages = { ...base };
  for (const [key, value] of Object.entries(locale)) {
    const baseValue = base[key];
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      baseValue &&
      typeof baseValue === "object" &&
      !Array.isArray(baseValue)
    ) {
      out[key] = withEnglishFallback(baseValue as Messages, value as Messages);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const en = (await import("../../messages/en.json")).default as Messages;
  const localeMessages =
    locale === routing.defaultLocale
      ? en
      : withEnglishFallback(
          en,
          (await import(`../../messages/${locale}.json`)).default as Messages,
        );

  return {
    locale,
    messages: localeMessages as never,
    onError(error) {
      if (error.code === IntlErrorCode.MISSING_MESSAGE) return;
      console.error(error);
    },
    getMessageFallback({ namespace, key }) {
      const path = [namespace, key].filter(Boolean).join(".");
      return path || key;
    },
  };
});
