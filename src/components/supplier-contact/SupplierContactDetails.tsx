"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Lock, Mail, MessageCircle, Phone } from "lucide-react";
import { useSupplierContact } from "@/lib/supplier-contact-client";
import { telHref } from "@/lib/scraper/contactExtractor";
import type { ContactSource } from "@/lib/supplier-contact";
import ProfileActionButton from "@/components/supplier-profile/ProfileActionButton";

type Props = {
  supplierId: string;
  supplierName: string;
  className?: string;
};

export default function SupplierContactDetails({ supplierId, supplierName, className = "" }: Props) {
  const t = useTranslations("supplierContact");
  const contact = useSupplierContact(supplierId);

  const fallback = (
    <>
      <p className="text-xs text-ink-muted">{t("noneOnFile")}</p>
      <ProfileActionButton
        supplierId={supplierId}
        supplierName={supplierName}
        intent="contact"
        label={t("contactViaSuplymate")}
        icon={MessageCircle}
        className="btn-secondary mt-2 w-full justify-center text-xs"
      />
    </>
  );

  let body: ReactNode;
  if (!contact) {
    body = (
      <div className="space-y-2" aria-busy="true" aria-label={t("loading")}>
        <div className="h-9 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-9 animate-pulse rounded-lg bg-slate-100" />
      </div>
    );
  } else if (contact.access === "none") {
    body = fallback;
  } else if (contact.access === "locked") {
    const any = contact.hasPhone || contact.hasEmail;
    body = any ? (
      <div data-testid="supplier-contact-locked">
        <ul className="space-y-2">
          {contact.hasPhone && <LockedRow icon={Phone} label={t("phone")} hidden={t("hiddenValue")} />}
          {contact.hasEmail && <LockedRow icon={Mail} label={t("email")} hidden={t("hiddenValue")} />}
        </ul>
        <p className="mt-3 text-xs text-ink-muted">{t("lockedBody")}</p>
        <Link
          href={contact.reason === "guest" ? "/signup?plan=basic" : "/settings/subscription?plan=basic"}
          className="btn-primary mt-2 w-full justify-center text-xs"
        >
          <Lock className="h-3.5 w-3.5" aria-hidden />
          {contact.reason === "guest" ? t("startTrial") : t("upgrade")}
        </Link>
        {contact.reason === "guest" && (
          <Link
            href={`/login?callbackUrl=/supplier/${supplierId}`}
            className="mt-2 block text-center text-[11px] font-medium text-cyan hover:underline"
          >
            {t("signIn")}
          </Link>
        )}
      </div>
    ) : (
      fallback
    );
  } else if (!contact.phone && !contact.email) {
    body = fallback;
  } else {
    body = (
      <div data-testid="supplier-contact-unlocked">
        <ul className="space-y-2">
          {contact.phone && (
            <ContactRow
              icon={Phone}
              label={t("phone")}
              value={contact.phone}
              href={telHref(contact.phone)}
              action={t("call")}
              actionLabel={t("callAria", { name: supplierName })}
              source={sourceLabel(t, contact.phoneSource)}
            />
          )}
          {contact.email && (
            <ContactRow
              icon={Mail}
              label={t("email")}
              value={contact.email}
              href={`mailto:${contact.email}`}
              action={t("sendEmail")}
              actionLabel={t("emailAria", { name: supplierName })}
              source={sourceLabel(t, contact.emailSource)}
            />
          )}
        </ul>
      </div>
    );
  }

  return (
    <section className={className} aria-labelledby={`contact-${supplierId}`}>
      <h3 id={`contact-${supplierId}`} className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-dim">
        {t("title")}
      </h3>
      {body}
    </section>
  );
}

function sourceLabel(t: ReturnType<typeof useTranslations>, source: ContactSource | null): string | null {
  switch (source) {
    case "listing":
      return t("sourceListing");
    case "website":
      return t("sourceWebsite");
    case null:
      return null;
    default: {
      const unreachable: never = source;
      return unreachable;
    }
  }
}

function ContactRow({
  icon: Icon,
  label,
  value,
  href,
  action,
  actionLabel,
  source,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
  href: string;
  action: string;
  actionLabel: string;
  source: string | null;
}) {
  return (
    <li className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
      <Icon className="h-4 w-4 shrink-0 text-cyan" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-dim">{label}</p>
        <p className="truncate text-sm font-semibold text-ink">{value}</p>
        {source && <p className="truncate text-[10px] text-ink-dim">{source}</p>}
      </div>
      <a
        href={href}
        aria-label={actionLabel}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-cyan px-2.5 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
      >
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {action}
      </a>
    </li>
  );
}

function LockedRow({ icon: Icon, label, hidden }: { icon: typeof Phone; label: string; hidden: string }) {
  return (
    <li className="flex items-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2">
      <Icon className="h-4 w-4 shrink-0 text-ink-dim" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-dim">{label}</p>
        <p className="select-none text-sm font-semibold text-ink blur-[5px]" aria-label={hidden}>
          <span aria-hidden>•••• ••• ••••</span>
        </p>
      </div>
      <Lock className="h-4 w-4 shrink-0 text-ink-dim" aria-hidden />
    </li>
  );
}
