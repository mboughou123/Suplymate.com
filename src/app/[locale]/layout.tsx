import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import Script from "next/script";
import NavbarGate from "@/components/NavbarGate";
import FooterGate from "@/components/FooterGate";
import Providers from "@/components/Providers";
import { routing, isRtlLocale, type Locale } from "@/i18n/routing";
import { buildPageAlternates } from "@/lib/locale-metadata";
import "../globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const alternates = buildPageAlternates(locale as Locale);
  return {
    metadataBase: new URL(alternates.canonical),
    title: t("title"),
    description: t("description"),
    alternates,
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      data-scroll-behavior="smooth"
      className={inter.variable}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col font-sans bg-page text-ink">
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem("suplymate-theme");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark");}catch(e){}})();`}
        </Script>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <NavbarGate />
            <main className="flex-1">{children}</main>
            <FooterGate />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
