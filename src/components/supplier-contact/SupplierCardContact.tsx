"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Lock, Mail, Phone } from "lucide-react";
import { useSupplierContact } from "@/lib/supplier-contact-client";
import { telHref } from "@/lib/scraper/contactExtractor";

const pill =
  "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-semibold transition";

/** Call / email shortcuts on a directory card; an upgrade pill when the viewer's plan hides them. */
export default function SupplierCardContact({ supplierId, supplierName }: { supplierId: string; supplierName: string }) {
  const t = useTranslations("supplierContact");
  const contact = useSupplierContact(supplierId);

  if (!contact) return <div className="h-[30px]" aria-hidden />;
  if (contact.access === "none") return null;

  if (contact.access === "locked") {
    if (!contact.hasPhone && !contact.hasEmail) return null;
    return (
      <Link
        href={contact.reason === "guest" ? "/signup?plan=basic" : "/settings/subscription?plan=basic"}
        className={`${pill} border-dashed border-slate-300 bg-slate-50 text-ink-muted hover:border-cyan/40 hover:text-cyan`}
        data-testid="card-contact-locked"
      >
        <Lock className="h-3.5 w-3.5" aria-hidden />
        {contact.hasPhone && contact.hasEmail
          ? t("cardLockedBoth")
          : contact.hasPhone
            ? t("cardLockedPhone")
            : t("cardLockedEmail")}
      </Link>
    );
  }

  if (!contact.phone && !contact.email) return null;
  return (
    <div className="flex gap-2" data-testid="card-contact-unlocked">
      {contact.phone && (
        <a
          href={telHref(contact.phone)}
          aria-label={t("callAria", { name: supplierName })}
          title={contact.phone}
          className={`${pill} border-cyan/30 bg-cyan/5 text-cyan hover:border-cyan`}
        >
          <Phone className="h-3.5 w-3.5" aria-hidden />
          {t("call")}
        </a>
      )}
      {contact.email && (
        <a
          href={`mailto:${contact.email}`}
          aria-label={t("emailAria", { name: supplierName })}
          title={contact.email}
          className={`${pill} border-cyan/30 bg-cyan/5 text-cyan hover:border-cyan`}
        >
          <Mail className="h-3.5 w-3.5" aria-hidden />
          {t("sendEmail")}
        </a>
      )}
    </div>
  );
}
