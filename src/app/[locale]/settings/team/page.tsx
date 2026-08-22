import { localeRedirect } from "@/i18n/redirect";
import { getCurrentAccount } from "@/lib/account";
import TeamSettingsClient from "./TeamSettingsClient";
import { buildLocalizedPageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return buildLocalizedPageMetadata({ locale, pathname: "/settings/team", titleKey: "settingsTeamTitle", descriptionKey: "settingsDescription", robots: { index: false, follow: false } });
}

export default async function TeamSettingsPage() {
  const { authenticated } = await getCurrentAccount();
  if (!authenticated) return await localeRedirect("/login?callbackUrl=/settings/team");
  return <TeamSettingsClient />;
}
