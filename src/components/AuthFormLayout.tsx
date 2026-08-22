"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type AuthFormLayoutProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export default function AuthFormLayout({
  title,
  subtitle,
  children,
  footer,
}: AuthFormLayoutProps) {
  const t = useTranslations("navigation");

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold text-base font-bold text-ink">
            S
          </span>
          <span className="font-display text-2xl font-bold text-ink">
            {t("brandSuply")}
            <span className="text-gold">{t("brandMate")}</span>
          </span>
        </Link>
        <div className="rounded-2xl border border-line bg-surface p-8 shadow-card">
          <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
          <p className="mt-2 text-sm text-ink-muted">{subtitle}</p>
          <div className="mt-6">{children}</div>
          {footer && (
            <div className="mt-6 border-t border-line pt-6 text-center text-sm text-ink-muted">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
