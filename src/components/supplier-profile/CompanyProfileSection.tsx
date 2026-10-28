"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  Building2,
  CalendarDays,
  Factory,
  Users,
  Boxes,
  FlaskConical,
  MapPin,
  Clock,
  PackageCheck,
  Gauge,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SupplierProfile } from "@/lib/supplier-profile";
import { SectionHeading, reveal } from "./primitives";

export default function CompanyProfileSection({ profile }: { profile: SupplierProfile }) {
  const t = useTranslations("supplierProfile");
  const { company } = profile;

  const metrics: { icon: LucideIcon; label: string; value: string }[] = [
    company.registrationDate
      ? { icon: CalendarDays, label: t("registered"), value: company.registrationDate }
      : null,
    company.businessType
      ? { icon: Building2, label: t("businessType"), value: company.businessType }
      : null,
    company.factorySize
      ? { icon: Factory, label: t("factorySize"), value: company.factorySize }
      : null,
    company.employeeCount
      ? { icon: Users, label: t("employees"), value: company.employeeCount }
      : null,
    company.productionLines != null
      ? {
          icon: Boxes,
          label: t("productionLines"),
          value: t("productionLinesValue", { count: company.productionLines }),
        }
      : null,
    company.rdEngineers != null
      ? { icon: FlaskConical, label: t("rdEngineers"), value: `${company.rdEngineers}` }
      : null,
    company.productionCapacity
      ? { icon: Gauge, label: t("productionCapacity"), value: company.productionCapacity }
      : null,
    company.moq
      ? { icon: PackageCheck, label: t("minimumOrder"), value: company.moq }
      : null,
    company.address
      ? { icon: MapPin, label: t("addressLabel"), value: company.address }
      : null,
    company.openingHours
      ? { icon: Clock, label: t("openingHoursLabel"), value: company.openingHours }
      : null,
  ].filter((m): m is { icon: LucideIcon; label: string; value: string } => m !== null);

  if (metrics.length === 0) return null;

  return (
    <motion.section {...reveal} transition={{ duration: 0.6 }} className="py-8 sm:py-10">
      <SectionHeading
        eyebrow={t("companyEyebrow")}
        title={t("companyProfileTitle")}
        description={t("companyProfileSourcedDescription")}
        icon={<Building2 className="h-5 w-5" />}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.04, duration: 0.45 }}
            className="glass-card glass-hover flex items-start gap-3 p-4"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan/10 to-teal/10 text-cyan">
              <m.icon className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-ink-dim">
                {m.label}
              </p>
              <p className="text-sm font-bold text-ink" title={m.value}>
                {m.value}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
