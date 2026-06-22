// User preferences: stored as a JSON string on User.preferences (additive).
// Parsing is defensive — unknown/old shapes fall back to sane defaults.

export type UserPreferences = {
  emailNotifications: boolean;
  priceAlerts: boolean;
  supplierMessages: boolean;
  productUpdates: boolean;
  language: string;
};

export const SUPPORTED_LANGUAGES = [{ value: "en", label: "English" }] as const;

export const DEFAULT_PREFERENCES: UserPreferences = {
  emailNotifications: true,
  priceAlerts: true,
  supplierMessages: true,
  productUpdates: false,
  language: "en",
};

export function parsePreferences(raw: string | null | undefined): UserPreferences {
  if (!raw) return { ...DEFAULT_PREFERENCES };
  try {
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return {
      emailNotifications:
        typeof parsed.emailNotifications === "boolean"
          ? parsed.emailNotifications
          : DEFAULT_PREFERENCES.emailNotifications,
      priceAlerts:
        typeof parsed.priceAlerts === "boolean"
          ? parsed.priceAlerts
          : DEFAULT_PREFERENCES.priceAlerts,
      supplierMessages:
        typeof parsed.supplierMessages === "boolean"
          ? parsed.supplierMessages
          : DEFAULT_PREFERENCES.supplierMessages,
      productUpdates:
        typeof parsed.productUpdates === "boolean"
          ? parsed.productUpdates
          : DEFAULT_PREFERENCES.productUpdates,
      language:
        typeof parsed.language === "string" && parsed.language.trim()
          ? parsed.language
          : DEFAULT_PREFERENCES.language,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function serializePreferences(prefs: UserPreferences): string {
  return JSON.stringify(prefs);
}
