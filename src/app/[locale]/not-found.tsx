import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("errors");

  return (
    <div className="container-page flex min-h-[50vh] flex-col items-center justify-center py-20 text-center">
      <p className="text-display font-bold text-ink">404</p>
      <h1 className="mt-4 font-display text-heading-lg text-ink">
        {t("notFoundTitle")}
      </h1>
      <p className="mt-3 max-w-md text-body text-ink-muted">
        {t("notFoundDescription")}
      </p>
      <Link href="/" className="btn-primary mt-8 px-6 py-3">
        {t("backHome")}
      </Link>
    </div>
  );
}
