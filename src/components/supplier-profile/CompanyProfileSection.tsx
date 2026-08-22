"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  Building2,
  Globe,
  MapPin,
  Phone,
  Mail,
  PackageCheck,
  Tag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SupplierProfile } from "@/lib/supplier-profile";
import { SectionHeading, reveal } from "./primitives";

/**
 * Company details as collected.
 *
 * This section used to show registration date, business type, factory size,
 * employee count, production lines, R&D engineers, production capacity, export
 * markets and languages spoken — all generated from a hash of the supplier id.
 * Only fields with a real source remain, and any that is missing is omitted
 * rather than filled in.
 */
export default function CompanyProfileSection({
  profile,
}: {
  profile: SupplierProfile;
}) {
  const t = useTranslations("supplierProfile");
  const { company } = profile;

  const details: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: Tag, label: t("category"), value: company.categoryLabel },
    { icon: MapPin, label: t("locationLabel"), value: company.location },
    ...(company.address
      ? [{ icon: Building2, label: t("addressLabel"), value: company.address }]
      : []),
    ...(company.phone
      ? [{ icon: Phone, label: t("phoneLabel"), value: company.phone }]
      : []),
    ...(company.email
      ? [{ icon: Mail, label: t("emailLabel"), value: company.email }]
      : []),
    ...(company.website
      ? [{ icon: Globe, label: t("websiteLabel"), value: company.website }]
      : []),
    ...(company.moq
      ? [{ icon: PackageCheck, label: t("minimumOrder"), value: company.moq }]
      : []),
  ];

  return (
    <motion.section
      {...reveal}
      transition={{ duration: 0.6 }}
      className="py-8 sm:py-10"
    >
      <SectionHeading
        eyebrow={t("companyEyebrow")}
        title={t("companyProfileTitle")}
        description={t("companyDetailsDescription")}
        icon={<Building2 className="h-5 w-5" />}
      />

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {details.map((detail, i) => (
          <motion.div
            key={detail.label}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.04, duration: 0.45 }}
            className="glass-card glass-hover flex items-start gap-3 p-4"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan/10 to-teal/10 text-cyan">
              <detail.icon className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <dt className="text-[11px] font-medium uppercase tracking-wider text-ink-dim">
                {detail.label}
              </dt>
              <dd
                className="truncate text-sm font-bold text-ink"
                title={detail.value}
              >
                {detail.value}
              </dd>
            </div>
          </motion.div>
        ))}
      </dl>

      <p className="mt-4 text-xs text-ink-dim">{t("detailsFromPublicSources")}</p>
    </motion.section>
  );
}
