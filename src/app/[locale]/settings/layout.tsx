import { localeRedirect } from "@/i18n/redirect";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import SettingsNav from "@/components/settings/SettingsNav";
import { completeLocalizedMetadata } from "@/lib/page-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "settings" });
  const meta = await getTranslations({ locale, namespace: "metadata" });
  return completeLocalizedMetadata({
    locale,
    pathname: "/settings",
    title: meta("titleTemplate", { title: t("title") }),
    description: t("preferencesSubtitle"),
    siteName: meta("siteName"),
    robots: { index: false, follow: false },
  });
}

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) return await localeRedirect("/login?callbackUrl=/settings");
  const t = await getTranslations("settings");

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-ink">{t("title")}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t("preferencesSubtitle")}</p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <SettingsNav />
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
