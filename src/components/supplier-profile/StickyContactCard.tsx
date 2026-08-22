"use client";

import { useTranslations } from "next-intl";
import {
  MessageCircle,
  FileText,
  PackageOpen,
  Receipt,
  Sparkles,
  Handshake,
} from "lucide-react";
import type { SupplierProfile } from "@/lib/supplier-profile";
import ProfileActionButton from "./ProfileActionButton";

/**
 * Contact card.
 *
 * This previously showed an online/offline presence dot, "Active now", an
 * average reply time and a response rate, all generated from a hash of the
 * supplier id. These companies do not have Suplymate accounts, so there is no
 * presence or responsiveness to report, and promising a reply time we had not
 * measured set a false expectation for the buyer. The card now leads with the
 * contact actions and says plainly that a reply is not guaranteed.
 */
export default function StickyContactCard({
  profile,
  variant = "sidebar",
}: {
  profile: SupplierProfile;
  variant?: "sidebar" | "mobile";
}) {
  const t = useTranslations("supplierProfile");
  const { base } = profile;
  const firstProduct = base.products[0]?.name;

  if (variant === "mobile") {
    return (
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-line bg-white/95 px-3 py-2.5 shadow-[0_-4px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white" style={{ backgroundImage: base.logoGradient }}>
            {base.logoText}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-ink">{base.name}</p>
            <p className="truncate text-[10px] text-ink-dim">
              {base.categoryLabel}
            </p>
          </div>
        </div>
        <ProfileActionButton
          supplierId={base.id}
          supplierName={base.name}
          intent="rfq"
          label={t("rfqShort")}
          icon={FileText}
          productName={firstProduct}
          className="btn-secondary !px-3 !py-2 text-xs"
        />
        <ProfileActionButton
          supplierId={base.id}
          supplierName={base.name}
          intent="contact"
          label={t("contactShort")}
          icon={MessageCircle}
          className="btn-primary !px-4 !py-2 text-xs"
        />
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden p-0">
      {/* Header */}
      <div className="border-b border-line p-5">
        <div className="flex items-center gap-3">
          <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white" style={{ backgroundImage: base.logoGradient }}>
            {base.logoText}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-ink">{base.name}</p>
            <p className="truncate text-xs text-ink-muted">{base.location}</p>
          </div>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-ink-dim">
          {t("contactExpectation")}
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-2 p-5">
        <ProfileActionButton
          supplierId={base.id}
          supplierName={base.name}
          intent="contact"
          label={t("contactSupplier")}
          icon={MessageCircle}
          className="btn-primary w-full justify-center"
        />
        <div className="grid grid-cols-2 gap-2">
          <ProfileActionButton
            supplierId={base.id}
            supplierName={base.name}
            intent="negotiate"
            label={t("askAboutPricing")}
            icon={Handshake}
            className="btn-secondary justify-center !px-3 text-xs"
          />
          <ProfileActionButton
            supplierId={base.id}
            supplierName={base.name}
            intent="rfq"
            label={t("sendRfq")}
            icon={FileText}
            productName={firstProduct}
            className="btn-secondary justify-center !px-3 text-xs"
          />
          <ProfileActionButton
            supplierId={base.id}
            supplierName={base.name}
            intent="samples"
            label={t("samples")}
            icon={PackageOpen}
            productName={firstProduct}
            className="btn-secondary justify-center !px-3 text-xs"
          />
          <ProfileActionButton
            supplierId={base.id}
            supplierName={base.name}
            intent="quote"
            label={t("quotation")}
            icon={Receipt}
            productName={firstProduct}
            className="btn-secondary justify-center !px-3 text-xs"
          />
        </div>
        <ProfileActionButton
          supplierId={base.id}
          supplierName={base.name}
          intent="ai-sourcing"
          label={t("aiSourcingAssistant")}
          icon={Sparkles}
          productName={firstProduct}
          className="w-full justify-center rounded-xl border border-gold/30 bg-gradient-to-r from-gold/10 to-ai-mist px-4 py-2.5 text-sm font-semibold text-cyan transition hover:border-gold/50"
        />
      </div>
    </div>
  );
}
